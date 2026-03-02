import { encodeBinaryChunk, getCheckpointIndex } from './binaryCodec.js';
import {
    CHUNK_SIZE,
    CHECKPOINT_CHUNKS,
    MessageType,
    TransferState,
    BACKPRESSURE_HIGH_WATERMARK,
    BACKPRESSURE_LOW_WATERMARK
} from './constants.js';

export class FileSender {
    constructor(file, fileId, ws, username) {
        this.file = file;
        this.fileId = fileId;
        this.ws = ws;
        this.username = username || 'Unknown User';
        this.totalChunks = Math.ceil(file.size / CHUNK_SIZE);
        this.totalCheckpoints = Math.ceil(this.totalChunks / CHECKPOINT_CHUNKS);
        this.state = TransferState.IDLE;
        this.currentChunk = 0;
        this.lastAckedCheckpoint = -1;
        this.isPaused = false;
        this.isBackpressured = false;
        this.bytesTransferred = 0;
        this.startTime = null;
        this.pauseTime = null;
        this.onProgress = null;
        this.onCheckpointAck = null;
        this.onComplete = null;
        this.onError = null;
        this.onStateChange = null;
        this.chunkGenerator = null;
    }

    sendFileMeta() {
        const meta = {
            type: MessageType.FILE_META,
            payload: {
                fileId: this.fileId,
                fileName: this.file.name,
                fileSize: this.file.size,
                chunkSize: CHUNK_SIZE,
                checkpointChunks: CHECKPOINT_CHUNKS,
                totalChunks: this.totalChunks,
                username: this.username
            }
        };

        this.ws.send(JSON.stringify(meta));
        //console.log('[FileSender] Sent file-meta:', meta);
    }

    async *chunkFile(startChunk = 0) {
        let offset = startChunk * CHUNK_SIZE;
        let chunkIndex = startChunk;

        while (offset < this.file.size) {
            const endOffset = Math.min(offset + CHUNK_SIZE, this.file.size);
            const blob = this.file.slice(offset, endOffset);
            const arrayBuffer = await blob.arrayBuffer();

            yield {
                chunkIndex,
                data: arrayBuffer
            };

            offset = endOffset;
            chunkIndex++;
        }
    }

    async startTransfer(resumeFromCheckpoint = -1) {
        this.setState(TransferState.INITIALIZING);
        this.startTime = Date.now();

        const startChunk = resumeFromCheckpoint >= 0
            ? (resumeFromCheckpoint + 1) * CHECKPOINT_CHUNKS
            : 0;

        this.currentChunk = startChunk;
        this.lastAckedCheckpoint = resumeFromCheckpoint;

        //console.log('[FileSender] Starting transfer from chunk:', startChunk);
        this.sendFileMeta();
        this.setState(TransferState.WAITING_FOR_ACCEPTANCE);
        //console.log('[FileSender] Waiting for receiver acceptance...');
    }

    async handleTransferAccepted() {
        if (this.state !== TransferState.WAITING_FOR_ACCEPTANCE) {
            console.warn('[FileSender] Received acceptance but not in waiting state:', this.state);
            return;
        }

        //console.log('[FileSender] Transfer accepted by receiver. Starting transmission...');
        this.setState(TransferState.TRANSFERRING);
        await this.sendChunks(this.currentChunk);
    }

    async sendChunks(startChunk) {
        this.chunkGenerator = this.chunkFile(startChunk);

        for await (const { chunkIndex, data } of this.chunkGenerator) {
            if (this.isPaused) {
                //console.log('[FileSender] Transfer paused at chunk:', chunkIndex);
                return;
            }

            if (this.ws.readyState !== WebSocket.OPEN) {
                console.warn('[FileSender] WebSocket closed, stopping transfer');
                this.setState(TransferState.PAUSED);
                return;
            }

            await this.handleBackpressure();
            const checkpointIndex = getCheckpointIndex(chunkIndex, CHECKPOINT_CHUNKS);
            if (checkpointIndex <= this.lastAckedCheckpoint) {
                //console.log('[FileSender] Skipping already-acked chunk:', chunkIndex);
                continue;
            }
            const binaryFrame = encodeBinaryChunk(checkpointIndex, chunkIndex, data);
            this.ws.send(binaryFrame);
            this.currentChunk = chunkIndex + 1;
            this.bytesTransferred += data.byteLength;
            if (this.onProgress) {
                this.onProgress({
                    chunkIndex,
                    totalChunks: this.totalChunks,
                    bytesTransferred: this.bytesTransferred,
                    totalBytes: this.file.size,
                    checkpointIndex,
                    totalCheckpoints: this.totalCheckpoints,
                    speed: this.calculateSpeed()
                });
            }
        }

        // All chunks sent
        //console.log('[FileSender] All chunks sent, waiting for final checkpoint ACK');
    }


    async resume() {
        if (this.state === TransferState.PAUSED) {
            this.isPaused = false;
            this.ws.send(JSON.stringify({
                type: MessageType.FILE_META,
                payload: {
                    fileId: this.fileId,
                    fileName: this.file.name,
                    fileSize: this.file.size,
                    chunkSize: CHUNK_SIZE,
                    checkpointChunks: CHECKPOINT_CHUNKS,
                    totalChunks: this.totalChunks,
                    resumed: true
                }
            }));

            this.setState(TransferState.WAITING_FOR_ACCEPTANCE);
            //console.log('[FileSender] Resuming - waiting for acceptance/confirmation...');
        }
    }

    async handleBackpressure() {
        if (this.ws.bufferedAmount > BACKPRESSURE_HIGH_WATERMARK && !this.isBackpressured) {
            //console.log('[FileSender] Backpressure detected, pausing send...');
            this.isBackpressured = true;
        }
        while (this.isBackpressured) {
            await new Promise(resolve => setTimeout(resolve, 100));

            if (this.ws.bufferedAmount < BACKPRESSURE_LOW_WATERMARK) {
                //console.log('[FileSender] Backpressure released, resuming send');
                this.isBackpressured = false;
            }
        }
    }

    /**
     * Handle checkpoint acknowledgment from receiver (need improvement)
     */
    handleCheckpointAck(checkpointIndex) {
        //console.log('[FileSender] Received checkpoint ACK:', checkpointIndex);

        this.lastAckedCheckpoint = checkpointIndex;
        this.saveProgress();
        if (this.onCheckpointAck) {
            this.onCheckpointAck(checkpointIndex);
        }
        if (checkpointIndex >= this.totalCheckpoints - 1) {
            this.handleTransferComplete();
        }
    }

    handleTransferComplete() {
        this.setState(TransferState.COMPLETED);
        this.ws.send(JSON.stringify({
            type: MessageType.TRANSFER_COMPLETE,
            payload: {
                fileId: this.fileId
            }
        }));
        this.clearProgress();

        //console.log('[FileSender] Transfer complete!');

        if (this.onComplete) {
            this.onComplete({
                fileId: this.fileId,
                fileName: this.file.name,
                fileSize: this.file.size,
                duration: Date.now() - this.startTime
            });
        }
    }

    pause() {
        if (this.state === TransferState.TRANSFERRING) {
            this.isPaused = true;
            this.pauseTime = Date.now();
            this.setState(TransferState.PAUSED);
            this.ws.send(JSON.stringify({
                type: MessageType.TRANSFER_PAUSE,
                payload: {
                    fileId: this.fileId
                }
            }));

            //console.log('[FileSender] Transfer paused');
        }
    }

    async resume() {
        if (this.state === TransferState.PAUSED) {
            this.isPaused = false;
            this.setState(TransferState.TRANSFERRING);

            this.ws.send(JSON.stringify({
                type: MessageType.FILE_META,
                payload: {
                    fileId: this.fileId,
                    fileName: this.file.name,
                    fileSize: this.file.size,
                    chunkSize: CHUNK_SIZE,
                    checkpointChunks: CHECKPOINT_CHUNKS,
                    totalChunks: this.totalChunks,
                    resumed: true
                }
            }));

            //console.log('[FileSender] Transfer resumed from chunk:', this.currentChunk);
            await this.sendChunks(this.currentChunk);
        }
    }

    cancel() {
        this.isPaused = true;
        this.setState(TransferState.CANCELLED);

        this.ws.send(JSON.stringify({
            type: MessageType.TRANSFER_CANCEL,
            payload: {
                fileId: this.fileId
            }
        }));

        this.clearProgress();
        //console.log('[FileSender] Transfer cancelled');
    }

    calculateSpeed() {
        if (!this.startTime) return 0;

        const elapsed = (Date.now() - this.startTime) / 1000;
        return elapsed > 0 ? this.bytesTransferred / elapsed : 0;
    }

    saveProgress() {
        const key = `file_sender_${this.fileId}`;
        const progress = {
            fileId: this.fileId,
            fileName: this.file.name,
            lastCheckpoint: this.lastAckedCheckpoint,
            timestamp: Date.now()
        };

        localStorage.setItem(key, JSON.stringify(progress));
    }

    static loadProgress(fileId) {
        const key = `file_sender_${fileId}`;
        const data = localStorage.getItem(key);

        if (data) {
            return JSON.parse(data);
        }

        return null;
    }

    clearProgress() {
        const key = `file_sender_${this.fileId}`;
        localStorage.removeItem(key);
    }

    setState(newState) {
        const oldState = this.state;
        this.state = newState;

        if (this.onStateChange) {
            this.onStateChange(newState, oldState);
        }
    }
}
