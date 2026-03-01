/**
 * FileReceiver - Receiver-side file transfer logic with direct-to-disk writing
 * 
 * Responsibilities:
 * - Receive binary chunks from WebSocket
 * - Write chunks directly to disk (NO buffering in memory)
 * - Track chunks within current checkpoint
 * - Send checkpoint ACK when all chunks in checkpoint are written
 * - Support resume by loading last checkpoint from IndexedDB
 * - Use File System Access API or OPFS for writing
 */

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

        // File metadata
        this.fileId = null;
        this.fileName = null;
        this.fileSize = 0;
        this.totalChunks = 0;
        this.totalCheckpoints = 0;

        // Checkpoint state
        this.currentCheckpoint = 0;
        this.receivedChunks = new Set();  // Only track chunks in current checkpoint
        this.lastCommittedCheckpoint = -1;

        // File writing
        this.fileHandle = null;
        this.writableStream = null;
        this.writer = null;

        // Transfer state
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
        console.log('[FileReceiver] Received file-meta:', meta);

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

        // Check for existing progress
        let savedProgress = null;
        try {
            savedProgress = await loadCheckpoint(this.fileId);
        } catch (error) {
            console.warn('[FileReceiver] Error loading checkpoint from IndexedDB:', error);
            // Continue with fresh transfer if checkpoint loading fails
        }

        if (savedProgress && savedProgress.lastCheckpoint >= 0) {
            // Resume from saved checkpoint
            console.log('[FileReceiver] Found saved progress, resuming from checkpoint:', savedProgress.lastCheckpoint);
            this.lastCommittedCheckpoint = savedProgress.lastCheckpoint;
            this.currentCheckpoint = savedProgress.lastCheckpoint + 1;

            // Send resume-info to sender
            this.sendResumeInfo();

            // Open file for resume (append mode)
            await this.openFileForResume();
        } else {
            // Fresh transfer - use OPFS (doesn't require user gesture)
            // File System Access API can't be used here because we're not in a user gesture context
            await this.initializeFileWrite();
        }

        this.startTime = Date.now();
        this.setState(TransferState.TRANSFERRING);

        // Notify sender that we are ready to receive
        this.sendTransferAccepted();

        // Process any chunks that arrived while initializing
        await this.flushBuffer();
    }

    /**
     * Send transfer accepted message to sender
     */
    sendTransferAccepted() {
        const msg = {
            type: MessageType.TRANSFER_ACCEPTED,
            payload: {
                fileId: this.fileId
            }
        };
        this.ws.send(JSON.stringify(msg));
        console.log('[FileReceiver] Sent transfer-accepted:', msg);
    }

    /**
     * Initialize file writing using OPFS
     * Note: File System Access API requires user gesture, which we don't have in WebSocket callbacks
     */
    async initializeFileWrite() {
        try {
            // Use OPFS (Origin Private File System)
            // This works without user gesture
            const root = await navigator.storage.getDirectory();
            this.fileHandle = await root.getFileHandle(this.fileName, { create: true });
            this.writableStream = await this.fileHandle.createWritable();
            this.writer = this.writableStream;

            console.log('[FileReceiver] Using OPFS for file writing');
            console.log('[FileReceiver] File will be saved to browser storage. You can download it when transfer completes.');
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

    /**
     * Use OPFS (Origin Private File System) as fallback
     */
    async useOPFS() {
        const root = await navigator.storage.getDirectory();
        this.fileHandle = await root.getFileHandle(this.fileName, { create: true });
        this.writableStream = await this.fileHandle.createWritable();
        this.writer = this.writableStream;

        console.log('[FileReceiver] Using OPFS');
    }

    /**
     * Open file for resume (re-open existing file handle)
     */
    async openFileForResume() {
        try {
            // For resume, use OPFS (same as fresh transfers)
            // File System Access API would require user gesture
            const root = await navigator.storage.getDirectory();
            this.fileHandle = await root.getFileHandle(this.fileName, { create: false });

            // Open in append mode - seek to end of last checkpoint
            this.writableStream = await this.fileHandle.createWritable({ keepExistingData: true });

            // Seek to end of last committed checkpoint
            const resumeOffset = (this.lastCommittedCheckpoint + 1) * CHECKPOINT_CHUNKS * CHUNK_SIZE;
            await this.writableStream.seek(resumeOffset);

            this.writer = this.writableStream;

            console.log('[FileReceiver] Resumed file from OPFS, offset:', resumeOffset);
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

    /**
     * Handle incoming binary chunk
     */
    async handleBinaryChunk(arrayBuffer) {
        // Race condition protection: If writer isn't ready, buffer the chunk
        if (!this.writer) {
            console.log('[FileReceiver] Writer not ready, buffering chunk');
            this.chunkBuffer.push(arrayBuffer);
            return;
        }

        try {
            // Decode chunk
            const { checkpointIndex, chunkIndex, data } = decodeBinaryChunk(arrayBuffer);

            console.log(`[FileReceiver] Received chunk ${chunkIndex} (checkpoint ${checkpointIndex})`);

            // Skip chunks from already-committed checkpoints
            if (checkpointIndex < this.currentCheckpoint) {
                console.log('[FileReceiver] Skipping chunk from old checkpoint');
                return;
            }

            // If new checkpoint started, reset tracking
            if (checkpointIndex > this.currentCheckpoint) {
                console.log('[FileReceiver] New checkpoint started:', checkpointIndex);
                this.currentCheckpoint = checkpointIndex;
                this.receivedChunks.clear();
            }

            // Check for duplicate chunk
            const localChunkInCheckpoint = chunkIndex % CHECKPOINT_CHUNKS;
            if (this.receivedChunks.has(localChunkInCheckpoint)) {
                console.log('[FileReceiver] Ignoring duplicate chunk:', chunkIndex);
                return;
            }

            // Write chunk to disk
            await this.writeChunkToDisk(chunkIndex, data);

            // Mark chunk as received
            this.receivedChunks.add(localChunkInCheckpoint);

            // Update progress
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

            // Check if checkpoint is complete
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
    }

    /**
     * Flush buffered chunks once writer is ready
     */
    async flushBuffer() {
        if (this.chunkBuffer.length > 0) {
            console.log(`[FileReceiver] Flushing ${this.chunkBuffer.length} buffered chunks`);
            const buffer = [...this.chunkBuffer];
            this.chunkBuffer = []; // Clear first to prevent loops if we recursively call (though we shouldn't)

            for (const chunk of buffer) {
                await this.handleBinaryChunk(chunk);
            }
        }
    }

    /**
     * Write chunk directly to disk
     */
    async writeChunkToDisk(chunkIndex, data) {
        if (!this.writer) {
            throw new Error('No writable stream available');
        }

        // Write data
        await this.writer.write(data);

        // Note: We don't flush after every chunk - only at checkpoint boundaries
    }

    /**
     * Check if current checkpoint is complete
     */
    async checkCheckpointComplete(checkpointIndex) {
        // Calculate expected chunks in this checkpoint
        const checkpointStartChunk = getCheckpointStartChunk(checkpointIndex, CHECKPOINT_CHUNKS);
        const checkpointEndChunk = Math.min(checkpointStartChunk + CHECKPOINT_CHUNKS, this.totalChunks);
        const expectedChunks = checkpointEndChunk - checkpointStartChunk;

        // Check if all chunks received
        if (this.receivedChunks.size === expectedChunks) {
            console.log('[FileReceiver] Checkpoint complete:', checkpointIndex);
            await this.commitCheckpoint(checkpointIndex);
        }
    }

    /**
     * Commit checkpoint - flush to disk and send ACK
     */
    async commitCheckpoint(checkpointIndex) {
        try {
            // Flush to disk (ensure durability)
            if (this.writer.flush) {
                await this.writer.flush();
            }

            // Save checkpoint to IndexedDB
            await saveCheckpoint(this.fileId, checkpointIndex, {
                fileName: this.fileName,
                fileSize: this.fileSize,
                bytesReceived: this.bytesReceived
            });

            this.lastCommittedCheckpoint = checkpointIndex;

            // Send checkpoint ACK to sender
            this.sendCheckpointAck(checkpointIndex);

            // Clear received chunks set (prepare for next checkpoint)
            this.receivedChunks.clear();

            // Emit callback
            if (this.onCheckpointCommit) {
                this.onCheckpointCommit(checkpointIndex);
            }

            // Check if transfer is complete
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

    /**
     * Send checkpoint ACK to sender
     */
    sendCheckpointAck(checkpointIndex) {
        const ack = {
            type: MessageType.CHECKPOINT_ACK,
            payload: {
                fileId: this.fileId,
                checkpointIndex
            }
        };

        this.ws.send(JSON.stringify(ack));
        console.log('[FileReceiver] Sent checkpoint-ack:', checkpointIndex);
    }

    /**
     * Send resume-info to sender
     */
    sendResumeInfo() {
        const info = {
            type: MessageType.RESUME_INFO,
            payload: {
                fileId: this.fileId,
                lastCheckpoint: this.lastCommittedCheckpoint
            }
        };

        this.ws.send(JSON.stringify(info));
        console.log('[FileReceiver] Sent resume-info:', info);
    }

    /**
     * Finalize transfer - close stream and cleanup
     */
    async finalize() {
        try {
            // Close writable stream
            if (this.writer) {
                await this.writer.close();
                this.writer = null;
            }

            // Clear checkpoint from IndexedDB
            await clearCheckpoint(this.fileId);

            this.setState(TransferState.COMPLETED);

            console.log('[FileReceiver] Transfer complete!');
            console.log('[FileReceiver] File saved to OPFS. Use downloadFile() to save to disk.');

            if (this.onComplete) {
                this.onComplete({
                    fileId: this.fileId,
                    fileName: this.fileName,
                    fileSize: this.fileSize,
                    bytesReceived: this.bytesReceived,
                    duration: Date.now() - this.startTime,
                    inOPFS: true  // Indicate file is in OPFS
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

    /**
     * Download file from OPFS to user's disk
     * Must be called from user gesture (e.g., button click)
     */
    async downloadFile() {
        try {
            if (!this.fileHandle) {
                throw new Error('No file handle available');
            }

            // Read file from OPFS
            const file = await this.fileHandle.getFile();
            const blob = new Blob([file], { type: file.type || 'application/octet-stream' });

            // Try File System Access API first (if user gesture available)
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

                    console.log('[FileReceiver] File downloaded successfully');
                    return true;
                } catch (err) {
                    // User cancelled or error - fall through to download link
                    console.warn('[FileReceiver] Save picker error:', err);
                }
            }

            // Fallback: Create download link
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = this.fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            console.log('[FileReceiver] File download initiated');
            return true;

        } catch (error) {
            console.error('[FileReceiver] Error downloading file:', error);
            throw error;
        }
    }

    /**
     * Set transfer state
     */
    setState(newState) {
        const oldState = this.state;
        this.state = newState;

        if (this.onStateChange) {
            this.onStateChange(newState, oldState);
        }
    }

    /**
     * Calculate transfer speed (bytes/sec)
     */
    calculateSpeed() {
        if (!this.startTime) return 0;

        const elapsed = (Date.now() - this.startTime) / 1000;  // seconds
        return elapsed > 0 ? this.bytesReceived / elapsed : 0;
    }

    /**
     * Cancel transfer
     */
    async cancel() {
        try {
            if (this.writer) {
                await this.writer.abort();
                this.writer = null;
            }

            // Optionally delete file handle
            if (this.fileHandle && this.fileHandle.remove) {
                await this.fileHandle.remove();
            }

            await clearCheckpoint(this.fileId);

            this.setState(TransferState.CANCELLED);

            console.log('[FileReceiver] Transfer cancelled');

        } catch (error) {
            console.error('[FileReceiver] Error cancelling transfer:', error);
        }
    }
}
