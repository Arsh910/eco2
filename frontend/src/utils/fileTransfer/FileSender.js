import { encodeBinaryChunk, getCheckpointIndex } from './binaryCodec.js';
import {
    CHUNK_SIZE,
    CHECKPOINT_CHUNKS,
    MessageType,
    TransferState,
    BACKPRESSURE_HIGH_WATERMARK,
    BACKPRESSURE_LOW_WATERMARK
} from './constants.js';

import { SpeedCalculator } from './helpers.js';

const WS_BASE = `${import.meta.env.VITE_API_SOCKET}/ws`;

export class FileSender {
    constructor(file, fileId, ws, username, targetUser = null) {
        this.file = file;
        this.fileId = fileId;
        this.ws = ws;                  // ServerConsumer — control messages only
        this.transferWs = null;        // SenderConsumer — binary chunks only
        this.username = username || 'Unknown User';
        this.targetUser = targetUser;
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
        this.onWaitingChange = null;
        this.chunkGenerator = null;
        this.speedCalc = new SpeedCalculator(5000);
    }

    sendFileMeta(resumed = false) {
        const meta = {
            type: MessageType.FILE_META,
            payload: {
                fileId: this.fileId,
                fileName: this.file.name,
                fileSize: this.file.size,
                chunkSize: CHUNK_SIZE,
                checkpointChunks: CHECKPOINT_CHUNKS,
                totalChunks: this.totalChunks,
                username: this.username,
                ...(this.targetUser ? { targetUser: this.targetUser } : {}),
                ...(resumed ? { resumed: true } : {})
            }
        };
        this.ws.send(JSON.stringify(meta));
    }

    async *chunkFile(startChunk = 0) {
        let offset = startChunk * CHUNK_SIZE;
        let chunkIndex = startChunk;

        while (offset < this.file.size) {
            const endOffset = Math.min(offset + CHUNK_SIZE, this.file.size);
            const blob = this.file.slice(offset, endOffset);
            const arrayBuffer = await blob.arrayBuffer();
            yield { chunkIndex, data: arrayBuffer };
            offset = endOffset;
            chunkIndex++;
        }
    }

    async _openTransferSocket() {
        if (this.transferWs && this.transferWs.readyState === WebSocket.OPEN) return;

        return new Promise((resolve, reject) => {
            this.transferWs = new WebSocket(`${WS_BASE}/sender/${this.fileId}`);

            this.transferWs.onopen = () => resolve();

            this.transferWs.onerror = (e) => {
                console.error('[FileSender] transferWs error', e);
                if (this.onError) this.onError({ type: 'transfer_ws_error', message: 'Sender connection failed' });
                reject(e);
            };

            this.transferWs.onclose = (e) => {
                if (this.state === TransferState.TRANSFERRING) {
                    console.warn('[FileSender] transferWs closed unexpectedly', e.code);
                    this.setState(TransferState.PAUSED);
                    if (this.onError) this.onError({ type: 'transfer_ws_closed', message: 'Sender connection closed unexpectedly' });
                }
            };

            this.transferWs.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    if (msg.type === 'pause') {
                        this.isPaused = true;
                        this.setState(TransferState.PAUSED);
                    } else if (msg.type === 'resume') {
                        this.isPaused = false;
                        this.setState(TransferState.TRANSFERRING);
                    }
                } catch (e) {}
            };
        });
    }

    async startTransfer(resumeFromCheckpoint = -1) {
        this.setState(TransferState.INITIALIZING);
        this.startTime = Date.now();

        const startChunk = resumeFromCheckpoint >= 0
            ? (resumeFromCheckpoint + 1) * CHECKPOINT_CHUNKS
            : 0;

        this.currentChunk = startChunk;
        this.lastAckedCheckpoint = resumeFromCheckpoint;

        this.sendFileMeta();
        this.setState(TransferState.WAITING_FOR_ACCEPTANCE);
    }

    async handleTransferAccepted() {
        if (this.state !== TransferState.WAITING_FOR_ACCEPTANCE) {
            console.warn('[FileSender] Received acceptance but not in waiting state:', this.state);
            return;
        }
        this.setState(TransferState.TRANSFERRING);
        await this.sendChunks(this.currentChunk);
    }

    async sendChunks(startChunk) {
        try {
            await this._openTransferSocket();
        } catch (e) {
            return;
        }

        this.chunkGenerator = this.chunkFile(startChunk);

        for await (const { chunkIndex, data } of this.chunkGenerator) {

            // check both sockets
            if (
                this.state === TransferState.CANCELLED ||
                this.ws.readyState !== WebSocket.OPEN ||
                this.transferWs.readyState !== WebSocket.OPEN
            ) {
                console.warn('[FileSender] Connection closed or cancelled, stopping');
                if (this.state !== TransferState.CANCELLED) {
                    this.setState(TransferState.PAUSED);
                }
                return;
            }

            // backend memory backpressure
            if (this.isPaused && this.state === TransferState.TRANSFERRING) {
                if (this.onWaitingChange) this.onWaitingChange(true);
                while (this.isPaused && this.state === TransferState.TRANSFERRING) {
                    await new Promise(resolve => setTimeout(resolve, 50));
                }
                if (this.onWaitingChange) this.onWaitingChange(false);
            }

            const checkpointIndex = getCheckpointIndex(chunkIndex, CHECKPOINT_CHUNKS);

            // peer disk persistence flow control — max 2 unacked checkpoints
            if (
                checkpointIndex > this.lastAckedCheckpoint + 2 &&
                !this.isPaused &&
                this.state === TransferState.TRANSFERRING &&
                this.transferWs.readyState === WebSocket.OPEN
            ) {
                if (this.onWaitingChange) this.onWaitingChange(true);
                while (
                    checkpointIndex > this.lastAckedCheckpoint + 2 &&
                    !this.isPaused &&
                    this.state === TransferState.TRANSFERRING &&
                    this.transferWs.readyState === WebSocket.OPEN
                ) {
                    await new Promise(resolve => setTimeout(resolve, 50));
                }
                if (this.onWaitingChange) this.onWaitingChange(false);
            }

            if (checkpointIndex <= this.lastAckedCheckpoint) continue;

            const binaryFrame = encodeBinaryChunk(checkpointIndex, chunkIndex, data);
            this.transferWs.send(binaryFrame);

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
                    speed: this.speedCalc.getSpeed()
                });
            }
        }
    }

    handleCheckpointAck(checkpointIndex) {
        this.lastAckedCheckpoint = checkpointIndex;
        this.saveProgress();
        if (this.onCheckpointAck) this.onCheckpointAck(checkpointIndex);
        if (checkpointIndex >= this.totalCheckpoints - 1) {
            this.handleTransferComplete();
        }
    }

    handleTransferComplete() {
        this.setState(TransferState.COMPLETED);
        this.ws.send(JSON.stringify({
            type: MessageType.TRANSFER_COMPLETE,
            payload: { fileId: this.fileId }
        }));
        this.clearProgress();
        this._closeTransferSocket();
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
                payload: { fileId: this.fileId }
            }));
        }
    }

    async resume() {
        if (this.state === TransferState.PAUSED) {
            this.isPaused = false;
            this.setState(TransferState.TRANSFERRING);
            this.sendFileMeta(true);
            this.setState(TransferState.WAITING_FOR_ACCEPTANCE);
        }
    }

    cancel() {
        this.isPaused = true;
        this.setState(TransferState.CANCELLED);
        this.ws.send(JSON.stringify({
            type: MessageType.TRANSFER_CANCEL,
            payload: { fileId: this.fileId }
        }));
        this.clearProgress();
        this._closeTransferSocket();
    }

    _closeTransferSocket() {
        if (this.transferWs && this.transferWs.readyState === WebSocket.OPEN) {
            this.transferWs.close();
        }
        this.transferWs = null;
    }

    saveProgress() {
        localStorage.setItem(`file_sender_${this.fileId}`, JSON.stringify({
            fileId: this.fileId,
            fileName: this.file.name,
            lastAckedCheckpoint: this.lastAckedCheckpoint,
            timestamp: Date.now()
        }));
    }

    static loadProgress(fileId) {
        const data = localStorage.getItem(`file_sender_${fileId}`);
        return data ? JSON.parse(data) : null;
    }

    clearProgress() {
        localStorage.removeItem(`file_sender_${this.fileId}`);
    }

    setState(newState) {
        const oldState = this.state;
        this.state = newState;
        if (this.onStateChange) this.onStateChange(newState, oldState);
    }
}
