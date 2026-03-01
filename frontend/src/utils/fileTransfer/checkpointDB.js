/**
 * IndexedDB wrapper for checkpoint persistence
 * Stores checkpoint progress to enable resume after browser refresh or crash
 */

const DB_NAME = 'FileTransferCheckpoints';
const DB_VERSION = 1;
const STORE_NAME = 'checkpoints';

let dbInstance = null;

/**
 * Initialize IndexedDB
 * @returns {Promise<IDBDatabase>}
 */
export async function initDB() {
    if (dbInstance) {
        return dbInstance;
    }

    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            dbInstance = request.result;
            resolve(dbInstance);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            // Create object store if it doesn't exist
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'fileId' });
                store.createIndex('timestamp', 'timestamp', { unique: false });
            }
        };
    });
}

/**
 * Save checkpoint for a file transfer
 * @param {string} fileId - Unique file identifier (UUID)
 * @param {number} lastCheckpoint - Last completed checkpoint index
 * @param {object} metadata - Optional metadata (fileName, fileSize, etc.)
 * @returns {Promise<void>}
 */
export async function saveCheckpoint(fileId, lastCheckpoint, metadata = {}) {
    const db = await initDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        const data = {
            fileId,
            lastCheckpoint,
            timestamp: Date.now(),
            ...metadata
        };

        const request = store.put(data);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

/**
 * Load checkpoint for a file transfer
 * @param {string} fileId - Unique file identifier
 * @returns {Promise<{lastCheckpoint: number, timestamp: number}|null>}
 */
export async function loadCheckpoint(fileId) {
    const db = await initDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(fileId);

        request.onsuccess = () => {
            const result = request.result;
            resolve(result || null);
        };
        request.onerror = () => reject(request.error);
    });
}

/**
 * Clear checkpoint after transfer completion
 * @param {string} fileId - Unique file identifier
 * @returns {Promise<void>}
 */
export async function clearCheckpoint(fileId) {
    const db = await initDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(fileId);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

/**
 * Get all checkpoint records (for debugging or resume UI)
 * @returns {Promise<Array>}
 */
export async function getAllCheckpoints() {
    const db = await initDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Clear old checkpoints (older than specified days)
 * @param {number} daysOld - Age threshold in days
 * @returns {Promise<number>} - Number of records deleted
 */
export async function clearOldCheckpoints(daysOld = 7) {
    const db = await initDB();
    const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const index = store.index('timestamp');
        const request = index.openCursor(IDBKeyRange.upperBound(cutoffTime));

        let deleteCount = 0;

        request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                cursor.delete();
                deleteCount++;
                cursor.continue();
            } else {
                resolve(deleteCount);
            }
        };

        request.onerror = () => reject(request.error);
    });
}
