import { decodeBinaryChunk, getCheckpointIndex, getCheckpointStartChunk } from './binaryCodec.js';
import { saveCheckpoint, loadCheckpoint, clearCheckpoint } from './checkpointDB.js';
import {
    CHUNK_SIZE,
    CHECKPOINT_CHUNKS,
    MessageType,
    TransferState
} from './constants.js';

export class FileReceiver {
    constructor(ws) {
        this.ws = ws;
        this.fileId = null;
        this.fileName = null;
        this.fileSize = 0;
        this.totalChunks = 0;
        this.totalCheckpoints = 0;
        this.currentCheckpoint = 0;
        this.receivedChunks = new Set();
        this.lastCommittedCheckpoint = -1;
        this.fileHandle = null;
        this.writableStream = null;
        this.writer = null;
        this.isPaused = false;

        // Strict async processing queue to prevent chunk race conditions
        this.writeQueue = Promise.resolve();
        this.state = TransferState.IDLE;
        this.bytesReceived = 0;
        this.startTime = null;

        // Event callbacks
        this.onProgress = null;
        this.onCheckpointCommit = null;
        this.onComplete = null;
        this.onError = null;
        this.onStateChange = null;

        // Buffering for race conditions (small files)
        this.chunkBuffer = [];
    }

    /**
     * Handle file-meta message from sender
     */
    async handleFileMeta(meta) {
        //console.log('[FileReceiver] Received file-meta:', meta);

        this.fileId = meta.fileId;
        this.fileName = meta.fileName;
        this.fileSize = meta.fileSize;
        this.totalChunks = meta.totalChunks;
        this.totalCheckpoints = Math.ceil(this.totalChunks / CHECKPOINT_CHUNKS);

        // Validate fileId
        if (!this.fileId) {
            console.error('[FileReceiver] No fileId provided in file-meta');
            if (this.onError) {
                this.onError({
                    type: 'invalid_meta',
                    message: 'File metadata missing fileId'
                });
            }
            return;
        }

        this.setState(TransferState.INITIALIZING);
        let savedProgress = null;
        try {
            savedProgress = await loadCheckpoint(this.fileId);
        } catch (error) {
            console.warn('[FileReceiver] Error loading checkpoint from IndexedDB:', error);
        }

        if (savedProgress && savedProgress.lastCheckpoint >= 0) {
            //console.log('[FileReceiver] Found saved progress, resuming from checkpoint:', savedProgress.lastCheckpoint);
            this.lastCommittedCheckpoint = savedProgress.lastCheckpoint;
            this.currentCheckpoint = savedProgress.lastCheckpoint + 1;
            this.sendResumeInfo();
            await this.openFileForResume();
        } else {
            await this.initializeFileWrite();
        }

        if (!this.transferWs) {
            const wsBase = this.ws.url.split('/ws/')[0] + '/ws';
            const receiverUrl = `${wsBase}/receiver/${this.fileId}`;
            this.transferWs = new WebSocket(receiverUrl);
            this.transferWs.binaryType = 'arraybuffer';

            this.transferWs.onmessage = async (event) => {
                if (event.data instanceof ArrayBuffer) {
                    await this.handleBinaryChunk(event.data);
                } else if (event.data instanceof Blob) {
                    const buf = await event.data.arrayBuffer();
                    await this.handleBinaryChunk(buf);
                }
            };

            this.transferWs.onerror = (error) => {
                console.error('[FileReceiver] transferWs error', error);
            };

            await new Promise((resolve, reject) => {
                this.transferWs.onopen = resolve;
                this.transferWs.onerror = reject;
            });
        }

        this.startTime = Date.now();
        this.setState(TransferState.TRANSFERRING);

        this.sendTransferAccepted();
        await this.flushBuffer();
    }

    sendTransferAccepted() {
        const msg = {
            type: MessageType.TRANSFER_ACCEPTED,
            payload: {
                fileId: this.fileId
            }
        };
        this.ws.send(JSON.stringify(msg));
        //console.log('[FileReceiver] Sent transfer-accepted:', msg);
    }

    get hasOPFS() {
        return typeof navigator.storage?.getDirectory === 'function';
    }

    async initializeFileWrite() {
        try {
            if (this.hasOPFS) {
                const root = await navigator.storage.getDirectory();
                this.fileHandle = await root.getFileHandle(this.fileName, { create: true });
                this.writableStream = await this.fileHandle.createWritable();
                this.writer = this.writableStream;
            } else {
                // Memory fallback for non-secure contexts (HTTP)
                this.memoryChunks = [];
                this.writer = {
                    write: (data) => { this.memoryChunks.push(data); },
                    flush: () => {},
                    close: () => {},
                    abort: () => { this.memoryChunks = []; }
                };
            }
        } catch (error) {
            console.error('[FileReceiver] Error initializing file write:', error);

            if (this.onError) {
                this.onError({
                    type: 'file_init_error',
                    message: 'Failed to initialize file writing',
                    error
                });
            }

            this.setState(TransferState.FAILED);
            throw error;
        }
    }

    async openFileForResume() {
        try {
            if (this.hasOPFS) {
                const root = await navigator.storage.getDirectory();
                this.fileHandle = await root.getFileHandle(this.fileName, { create: false });
                this.writableStream = await this.fileHandle.createWritable({ keepExistingData: true });
                const resumeOffset = (this.lastCommittedCheckpoint + 1) * CHECKPOINT_CHUNKS * CHUNK_SIZE;
                await this.writableStream.seek(resumeOffset);
                this.writer = this.writableStream;
            } else {
                // Memory fallback can't resume — start fresh
                await this.initializeFileWrite();
            }
        } catch (error) {
            console.error('[FileReceiver] Error reopening file for resume:', error);

            if (this.onError) {
                this.onError({
                    type: 'file_resume_error',
                    message: 'Failed to reopen file for resume',
                    error
                });
            }

            throw error;
        }
    }

    async handleBinaryChunk(arrayBuffer) {
        if (!this.writer) {
            //console.log('[FileReceiver] Writer not ready, buffering chunk');
            this.chunkBuffer.push(arrayBuffer);
            return;
        }

        // Enforce strictly sequential processing
        this.writeQueue = this.writeQueue.then(async () => {
            try {
                const { checkpointIndex, chunkIndex, data } = decodeBinaryChunk(arrayBuffer);
                //console.log(`[FileReceiver] Received chunk ${chunkIndex} (checkpoint ${checkpointIndex})`);
                if (checkpointIndex < this.currentCheckpoint) {
                    //console.log('[FileReceiver] Skipping chunk from old checkpoint');
                    return;
                }
                if (checkpointIndex > this.currentCheckpoint) {
                    //console.log('[FileReceiver] New checkpoint started:', checkpointIndex);
                    this.currentCheckpoint = checkpointIndex;
                    this.receivedChunks.clear();
                }
                const localChunkInCheckpoint = chunkIndex % CHECKPOINT_CHUNKS;
                if (this.receivedChunks.has(localChunkInCheckpoint)) {
                    //console.log('[FileReceiver] Ignoring duplicate chunk:', chunkIndex);
                    return;
                }

                await this.writeChunkToDisk(chunkIndex, data);
                this.receivedChunks.add(localChunkInCheckpoint);
                this.bytesReceived += data.byteLength;

                if (this.onProgress) {
                    this.onProgress({
                        chunkIndex,
                        totalChunks: this.totalChunks,
                        bytesReceived: this.bytesReceived,
                        totalBytes: this.fileSize,
                        checkpointIndex,
                        totalCheckpoints: this.totalCheckpoints,
                        percentage: (this.bytesReceived / this.fileSize) * 100,
                        speed: this.calculateSpeed()
                    });
                }
                await this.checkCheckpointComplete(checkpointIndex);

            } catch (error) {
                console.error('[FileReceiver] Error handling binary chunk:', error);

                if (this.onError) {
                    this.onError({
                        type: 'chunk_write_error',
                        message: 'Failed to write chunk',
                        error
                    });
                }
            }
        });

        await this.writeQueue;
    }

    async flushBuffer() {
        if (this.chunkBuffer.length > 0) {
            //console.log(`[FileReceiver] Flushing ${this.chunkBuffer.length} buffered chunks`);
            const buffer = [...this.chunkBuffer];
            this.chunkBuffer = [];

            for (const chunk of buffer) {
                await this.handleBinaryChunk(chunk);
            }
        }
    }

    async writeChunkToDisk(chunkIndex, data) {
        if (!this.writer) {
            throw new Error('No writable stream available');
        }
        await this.writer.write(data);
    }

    async checkCheckpointComplete(checkpointIndex) {
        const checkpointStartChunk = getCheckpointStartChunk(checkpointIndex, CHECKPOINT_CHUNKS);
        const checkpointEndChunk = Math.min(checkpointStartChunk + CHECKPOINT_CHUNKS, this.totalChunks);
        const expectedChunks = checkpointEndChunk - checkpointStartChunk;
        if (this.receivedChunks.size === expectedChunks) {
            //console.log('[FileReceiver] Checkpoint complete:', checkpointIndex);
            await this.commitCheckpoint(checkpointIndex);
        }
    }

    async commitCheckpoint(checkpointIndex) {
        try {
            if (this.writer.flush) {
                await this.writer.flush();
            }

            await saveCheckpoint(this.fileId, checkpointIndex, {
                fileName: this.fileName,
                fileSize: this.fileSize,
                bytesReceived: this.bytesReceived
            });

            this.lastCommittedCheckpoint = checkpointIndex;
            this.sendCheckpointAck(checkpointIndex);
            this.receivedChunks.clear();

            if (this.onCheckpointCommit) {
                this.onCheckpointCommit(checkpointIndex);
            }
            if (checkpointIndex >= this.totalCheckpoints - 1) {
                await this.finalize();
            }

        } catch (error) {
            console.error('[FileReceiver] Error committing checkpoint:', error);

            if (this.onError) {
                this.onError({
                    type: 'checkpoint_commit_error',
                    message: 'Failed to commit checkpoint',
                    error
                });
            }
        }
    }

    sendCheckpointAck(checkpointIndex) {
        const ack = {
            type: MessageType.CHECKPOINT_ACK,
            payload: {
                fileId: this.fileId,
                checkpointIndex
            }
        };

        this.ws.send(JSON.stringify(ack));
        //console.log('[FileReceiver] Sent checkpoint-ack:', checkpointIndex);
    }

    sendResumeInfo() {
        const info = {
            type: MessageType.RESUME_INFO,
            payload: {
                fileId: this.fileId,
                lastCheckpoint: this.lastCommittedCheckpoint
            }
        };

        this.ws.send(JSON.stringify(info));
        //console.log('[FileReceiver] Sent resume-info:', info);
    }

    async finalize() {
        try {
            if (this.writer) {
                await this.writer.close();
                this.writer = null;
            }
            await clearCheckpoint(this.fileId);

            this.setState(TransferState.COMPLETED);

            //console.log('[FileReceiver] Transfer complete!');
            //console.log('[FileReceiver] File saved to OPFS. Use downloadFile() to save to disk.');

            if (this.onComplete) {
                this.onComplete({
                    fileId: this.fileId,
                    fileName: this.fileName,
                    fileSize: this.fileSize,
                    bytesReceived: this.bytesReceived,
                    duration: Date.now() - this.startTime,
                    inOPFS: true
                });
            }

        } catch (error) {
            console.error('[FileReceiver] Error finalizing transfer:', error);

            if (this.onError) {
                this.onError({
                    type: 'finalize_error',
                    message: 'Failed to finalize transfer',
                    error
                });
            }
        }
    }

    async downloadFile() {
        try {
            let blob;
            if (this.fileHandle) {
                const file = await this.fileHandle.getFile();
                blob = new Blob([file], { type: file.type || 'application/octet-stream' });
            } else if (this.memoryChunks) {
                blob = new Blob(this.memoryChunks, { type: 'application/octet-stream' });
            } else {
                throw new Error('No file data available');
            }
            if ('showSaveFilePicker' in window) {
                try {
                    const saveHandle = await window.showSaveFilePicker({
                        suggestedName: this.fileName,
                        types: [{
                            description: 'All Files',
                            accept: { '*/*': [] }
                        }]
                    });

                    const writable = await saveHandle.createWritable();
                    await writable.write(blob);
                    await writable.close();

                    //console.log('[FileReceiver] File downloaded successfully');
                    return true;
                } catch (err) {
                    console.warn('[FileReceiver] Save picker error:', err);
                }
            }
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = this.fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            //console.log('[FileReceiver] File download initiated');
            return true;

        } catch (error) {
            console.error('[FileReceiver] Error downloading file:', error);
            throw error;
        }
    }

    setState(newState) {
        const oldState = this.state;
        this.state = newState;

        if (this.onStateChange) {
            this.onStateChange(newState, oldState);
        }
    }
    calculateSpeed() {
        if (!this.startTime) return 0;

        const elapsed = (Date.now() - this.startTime) / 1000;
        return elapsed > 0 ? this.bytesReceived / elapsed : 0;
    }

    async cancel() {
        try {
            if (this.writer) {
                await this.writer.abort();
                this.writer = null;
            }
            if (this.fileHandle && this.fileHandle.remove) {
                await this.fileHandle.remove();
            }
            this.memoryChunks = null;

            await clearCheckpoint(this.fileId);

            this.setState(TransferState.CANCELLED);

            //console.log('[FileReceiver] Transfer cancelled');

        } catch (error) {
            console.error('[FileReceiver] Error cancelling transfer:', error);
        }
    }
}
