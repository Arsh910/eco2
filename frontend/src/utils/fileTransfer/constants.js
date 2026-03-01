/**
 * Fixed constants for large file transfer system
 * DO NOT MODIFY these values - they are part of the protocol spec
 */

// Chunk and checkpoint sizes
export const CHUNK_SIZE = 2 * 1024 * 1024;  // 2 MB per chunk
export const CHECKPOINT_CHUNKS = 128;       // 128 chunks per checkpoint  
export const CHECKPOINT_SIZE = 256 * 1024 * 1024;  // 256 MB per checkpoint

// WebSocket message types
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

// Backpressure thresholds for WebSocket buffering
export const BACKPRESSURE_HIGH_WATERMARK = 16 * 1024 * 1024;  // 16 MB - pause sending
export const BACKPRESSURE_LOW_WATERMARK = 8 * 1024 * 1024;    // 8 MB - resume sending

// Binary frame header sizes
export const HEADER_SIZE = 8;  // 4 bytes checkpointIndex + 4 bytes chunkIndex

// Transfer states
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
