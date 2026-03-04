export const CHUNK_SIZE = 64 * 1024;        // 64KB — optimal WebSocket frame size
export const CHECKPOINT_CHUNKS = 128;       // checkpoint every 128 chunks = 8MB checkpoints
export const CHECKPOINT_SIZE = 256 * 1024 * 1024;

export const MessageType = {
    FILE_META: 'file-meta',
    RESUME_REQUEST: 'resume-request',
    RESUME_INFO: 'resume-info',
    TRANSFER_ACCEPTED: 'transfer-accepted',
    CHECKPOINT_ACK: 'checkpoint-ack',
    TRANSFER_COMPLETE: 'transfer-complete',
    TRANSFER_ERROR: 'transfer-error',
    TRANSFER_PAUSE: 'transfer-pause',
    TRANSFER_CANCEL: 'transfer-cancel'
};

export const BACKPRESSURE_HIGH_WATERMARK = 16 * 1024 * 1024;
export const BACKPRESSURE_LOW_WATERMARK = 8 * 1024 * 1024;
export const HEADER_SIZE = 8;
export const TransferState = {
    IDLE: 'idle',
    INITIALIZING: 'initializing',
    WAITING_FOR_ACCEPTANCE: 'waiting_for_acceptance',
    PENDING_ACCEPTANCE: 'pending_acceptance',
    TRANSFERRING: 'transferring',
    PAUSED: 'paused',
    COMPLETED: 'completed',
    FAILED: 'failed',
    CANCELLED: 'cancelled'
};
