/**
 * FileSender - Sender-side file transfer logic with resume support
 * 
 * Responsibilities:
 * - Read file in chunks using generator (no full file in memory)
 * - Encode chunks with headers (checkpointIndex, chunkIndex)
 * - Send binary frames via WebSocket
 * - Track checkpoint acknowledgments
 * - Support resume from last acknowledged checkpoint
 * - Handle backpressure to prevent buffer overflow
 */

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
    constructor(file, fileId, ws) {
        this.file = file;
        this.fileId = fileId;
        this.ws = ws;

        // Calculate transfer metrics
        this.totalChunks = Math.ceil(file.size / CHUNK_SIZE);
        this.totalCheckpoints = Math.ceil(this.totalChunks / CHECKPOINT_CHUNKS);

        // Transfer state
        this.state = TransferState.IDLE;
        this.currentChunk = 0;
        this.lastAckedCheckpoint = -1;  // -1 means no checkpoints acked yet
        this.isPaused = false;
        this.isBackpressured = false;

        // Statistics
        this.bytesTransferred = 0;
        this.startTime = null;
        this.pauseTime = null;

        // Event callbacks
        this.onProgress = null;
        this.onCheckpointAck = null;
        this.onComplete = null;
        this.onError = null;
        this.onStateChange = null;

        // Chunk generator
        this.chunkGenerator = null;
    }

    /**
     * Send file metadata message
     */
    sendFileMeta() {
        const meta = {
            type: MessageType.FILE_META,
            payload: {
                fileId: this.fileId,
                fileName: this.file.name,
                fileSize: this.file.size,
                chunkSize: CHUNK_SIZE,
                checkpointChunks: CHECKPOINT_CHUNKS,
                totalChunks: this.totalChunks
            }
        };

        this.ws.send(JSON.stringify(meta));
        console.log('[FileSender] Sent file-meta:', meta);
    }

    /**
     * Generator function to read file in chunks
     * @param {number} startChunk - Chunk index to start from (for resume)
     */
    async *chunkFile(startChunk = 0) {
        let offset = startChunk * CHUNK_SIZE;
        let chunkIndex = startChunk;

        while (offset < this.file.size) {
            const endOffset = Math.min(offset + CHUNK_SIZE, this.file.size);
            const blob = this.file.slice(offset, endOffset);

            // Read blob as ArrayBuffer
            const arrayBuffer = await blob.arrayBuffer();

            yield {
                chunkIndex,
                data: arrayBuffer
            };

            offset = endOffset;
            chunkIndex++;
        }
    }

    /**
     * Start file transfer
     * @param {number} resumeFromCheckpoint - Optional checkpoint to resume from
     */
    async startTransfer(resumeFromCheckpoint = -1) {
        this.setState(TransferState.INITIALIZING);
        this.startTime = Date.now();

        // Calculate starting chunk
        const startChunk = resumeFromCheckpoint >= 0
            ? (resumeFromCheckpoint + 1) * CHECKPOINT_CHUNKS
            : 0;

        this.currentChunk = startChunk;
        this.lastAckedCheckpoint = resumeFromCheckpoint;

        console.log('[FileSender] Starting transfer from chunk:', startChunk);

        // Send file-meta first
        this.sendFileMeta();

        // Start sending chunks
        this.setState(TransferState.TRANSFERRING);
        await this.sendChunks(startChunk);
    }

    /**
     * Send chunks using generator
     */
    async sendChunks(startChunk) {
        this.chunkGenerator = this.chunkFile(startChunk);

        for await (const { chunkIndex, data } of this.chunkGenerator) {
            // Check if paused
            if (this.isPaused) {
                console.log('[FileSender] Transfer paused at chunk:', chunkIndex);
                return;
            }

            // Check WebSocket state
            if (this.ws.readyState !== WebSocket.OPEN) {
                console.warn('[FileSender] WebSocket closed, stopping transfer');
                this.setState(TransferState.PAUSED);
                return;
            }

            // Backpressure check
            await this.handleBackpressure();

            // Calculate checkpoint index
            const checkpointIndex = getCheckpointIndex(chunkIndex, CHECKPOINT_CHUNKS);

            // Skip chunks whose checkpoint has already been acked
            if (checkpointIndex <= this.lastAckedCheckpoint) {
                console.log('[FileSender] Skipping already-acked chunk:', chunkIndex);
                continue;
            }

            // Encode and send binary chunk
            const binaryFrame = encodeBinaryChunk(checkpointIndex, chunkIndex, data);
            this.ws.send(binaryFrame);

            // Update progress
            this.currentChunk = chunkIndex + 1;
            this.bytesTransferred += data.byteLength;

            // Emit progress event
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
        console.log('[FileSender] All chunks sent, waiting for final checkpoint ACK');
    }

    /**
     * Handle backpressure to prevent WebSocket buffer overflow
     */
    async handleBackpressure() {
        // Check buffered amount
        if (this.ws.bufferedAmount > BACKPRESSURE_HIGH_WATERMARK && !this.isBackpressured) {
            console.log('[FileSender] Backpressure detected, pausing send...');
            this.isBackpressured = true;
        }

        // Wait for buffer to drain
        while (this.isBackpressured) {
            await new Promise(resolve => setTimeout(resolve, 100));

            if (this.ws.bufferedAmount < BACKPRESSURE_LOW_WATERMARK) {
                console.log('[FileSender] Backpressure released, resuming send');
                this.isBackpressured = false;
            }
        }
    }

    /**
     * Handle checkpoint acknowledgment from receiver
     */
    handleCheckpointAck(checkpointIndex) {
        console.log('[FileSender] Received checkpoint ACK:', checkpointIndex);

        this.lastAckedCheckpoint = checkpointIndex;

        // Persist in localStorage for resume
        this.saveProgress();

        // Emit callback
        if (this.onCheckpointAck) {
            this.onCheckpointAck(checkpointIndex);
        }

        // Check if transfer is complete
        if (checkpointIndex >= this.totalCheckpoints - 1) {
            this.handleTransferComplete();
        }
    }

    /**
     * Handle transfer completion
     */
    /**
     * Handle transfer completion
     */
    handleTransferComplete() {
        this.setState(TransferState.COMPLETED);

        // Send completion message
        this.ws.send(JSON.stringify({
            type: MessageType.TRANSFER_COMPLETE,
            payload: {
                fileId: this.fileId
            }
        }));

        // Clear progress from localStorage
        this.clearProgress();

        console.log('[FileSender] Transfer complete!');

        if (this.onComplete) {
            this.onComplete({
                fileId: this.fileId,
                fileName: this.file.name,
                fileSize: this.file.size,
                duration: Date.now() - this.startTime
            });
        }
    }

    /**
     * Pause transfer
     */
    pause() {
        if (this.state === TransferState.TRANSFERRING) {
            this.isPaused = true;
            this.pauseTime = Date.now();
            this.setState(TransferState.PAUSED);

            // Notify receiver
            this.ws.send(JSON.stringify({
                type: MessageType.TRANSFER_PAUSE,
                payload: {
                    fileId: this.fileId
                }
            }));

            console.log('[FileSender] Transfer paused');
        }
    }

    /**
     * Resume transfer
     */
    async resume() {
        if (this.state === TransferState.PAUSED) {
            this.isPaused = false;
            this.setState(TransferState.TRANSFERRING);

            // Notify receiver that transfer resumed
            this.ws.send(JSON.stringify({
                type: MessageType.FILE_META,  // Re-notify with metadata to indicate resume
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

            console.log('[FileSender] Transfer resumed from chunk:', this.currentChunk);

            // Continue sending from current chunk
            await this.sendChunks(this.currentChunk);
        }
    }

    /**
     * Cancel transfer
     */
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
        console.log('[FileSender] Transfer cancelled');
    }

    /**
     * Calculate transfer speed (bytes/sec)
     */
    calculateSpeed() {
        if (!this.startTime) return 0;

        const elapsed = (Date.now() - this.startTime) / 1000;  // seconds
        return elapsed > 0 ? this.bytesTransferred / elapsed : 0;
    }

    /**
     * Save progress to localStorage
     */
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

    /**
     * Load progress from localStorage
     */
    static loadProgress(fileId) {
        const key = `file_sender_${fileId}`;
        const data = localStorage.getItem(key);

        if (data) {
            return JSON.parse(data);
        }

        return null;
    }

    /**
     * Clear progress from localStorage
     */
    clearProgress() {
        const key = `file_sender_${this.fileId}`;
        localStorage.removeItem(key);
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
}
