/**
 * Binary chunk encoder/decoder for WebSocket frames
 * 
 * Binary frame format (big-endian):
 * - 4 bytes: checkpointIndex (uint32)
 * - 4 bytes: chunkIndex (uint32)
 * - N bytes: file data
 */

import { HEADER_SIZE } from './constants.js';

/**
 * Encode a file chunk into a binary WebSocket frame
 * @param {number} checkpointIndex - Checkpoint index (floor(chunkIndex / CHECKPOINT_CHUNKS))
 * @param {number} chunkIndex - Absolute chunk index
 * @param {Uint8Array|ArrayBuffer} data - Raw file chunk data
 * @returns {ArrayBuffer} - Encoded binary frame ready to send
 */
export function encodeBinaryChunk(checkpointIndex, chunkIndex, data) {
    // Convert data to Uint8Array if needed
    const dataArray = data instanceof Uint8Array ? data : new Uint8Array(data);

    // Create buffer for header + data
    const buffer = new ArrayBuffer(HEADER_SIZE + dataArray.byteLength);
    const view = new DataView(buffer);

    // Write header (big-endian)
    view.setUint32(0, checkpointIndex, false);  // false = big-endian
    view.setUint32(4, chunkIndex, false);

    // Copy data after header
    const uint8View = new Uint8Array(buffer);
    uint8View.set(dataArray, HEADER_SIZE);

    return buffer;
}

/**
 * Decode a binary WebSocket frame
 * @param {ArrayBuffer} arrayBuffer - Binary frame received from WebSocket
 * @returns {{checkpointIndex: number, chunkIndex: number, data: Uint8Array}} - Decoded chunk
 */
export function decodeBinaryChunk(arrayBuffer) {
    const view = new DataView(arrayBuffer);

    // Read header (big-endian)
    const checkpointIndex = view.getUint32(0, false);
    const chunkIndex = view.getUint32(4, false);

    // Extract data (everything after header)
    const data = new Uint8Array(arrayBuffer, HEADER_SIZE);

    return {
        checkpointIndex,
        chunkIndex,
        data
    };
}

/**
 * Calculate checkpoint index from chunk index
 * @param {number} chunkIndex - Absolute chunk index
 * @param {number} checkpointChunks - Chunks per checkpoint (default: 128)
 * @returns {number} - Checkpoint index
 */
export function getCheckpointIndex(chunkIndex, checkpointChunks = 128) {
    return Math.floor(chunkIndex / checkpointChunks);
}

/**
 * Calculate starting chunk for a checkpoint
 * @param {number} checkpointIndex - Checkpoint index
 * @param {number} checkpointChunks - Chunks per checkpoint (default: 128)
 * @returns {number} - Starting chunk index
 */
export function getCheckpointStartChunk(checkpointIndex, checkpointChunks = 128) {
    return checkpointIndex * checkpointChunks;
}
