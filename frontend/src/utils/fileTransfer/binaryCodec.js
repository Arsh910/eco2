import { HEADER_SIZE } from './constants.js';
export function encodeBinaryChunk(checkpointIndex, chunkIndex, data) {
    const dataArray = data instanceof Uint8Array ? data : new Uint8Array(data);
    const buffer = new ArrayBuffer(HEADER_SIZE + dataArray.byteLength);
    const view = new DataView(buffer);
    view.setUint32(0, checkpointIndex, false);  // false = big-endian
    view.setUint32(4, chunkIndex, false);
    const uint8View = new Uint8Array(buffer);
    uint8View.set(dataArray, HEADER_SIZE);

    return buffer;
}

export function decodeBinaryChunk(arrayBuffer) {
    const view = new DataView(arrayBuffer);
    const checkpointIndex = view.getUint32(0, false);
    const chunkIndex = view.getUint32(4, false);
    const data = new Uint8Array(arrayBuffer, HEADER_SIZE);

    return {
        checkpointIndex,
        chunkIndex,
        data
    };
}

export function getCheckpointIndex(chunkIndex, checkpointChunks = 128) {
    return Math.floor(chunkIndex / checkpointChunks);
}

export function getCheckpointStartChunk(checkpointIndex, checkpointChunks = 128) {
    return checkpointIndex * checkpointChunks;
}
