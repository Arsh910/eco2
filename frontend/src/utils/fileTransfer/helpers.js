export function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

export async function generateFileId(file) {
    const fileData = `${file.name}-${file.size}-${file.lastModified}`;
    if (crypto && crypto.subtle) {
        try {
            const encoder = new TextEncoder();
            const data = encoder.encode(fileData);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            return `${hashHex.substring(0, 8)}-${hashHex.substring(8, 12)}-${hashHex.substring(12, 16)}-${hashHex.substring(16, 20)}-${hashHex.substring(20, 32)}`;
        } catch (err) {
            console.warn('[generateFileId] Crypto API failed, using fallback:', err);
        }
    }

    let hash = 0;
    for (let i = 0; i < fileData.length; i++) {
        const char = fileData.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    const hashStr = Math.abs(hash).toString(16).padStart(8, '0');
    return `${hashStr}-file-id-${file.size.toString(16)}`;
}

export function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function formatSpeed(bytesPerSecond) {
    return `${formatBytes(bytesPerSecond)}/s`;
}

export function calculateETA(bytesRemaining, bytesPerSecond) {
    if (bytesPerSecond <= 0) return Infinity;
    return bytesRemaining / bytesPerSecond;
}

export function formatDuration(seconds) {
    if (!isFinite(seconds) || seconds < 0) return '--:--';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
        return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
        return `${minutes}m ${secs}s`;
    } else {
        return `${secs}s`;
    }
}

export function supportsOPFS() {
    return 'storage' in navigator && 'getDirectory' in navigator.storage;
}

export async function downloadFromOPFS(fileName) {
    try {
        const root = await navigator.storage.getDirectory();
        const fileHandle = await root.getFileHandle(fileName);
        const file = await fileHandle.getFile();
        const blob = new Blob([file], { type: file.type || 'application/octet-stream' });

        if ('showSaveFilePicker' in window) {
            try {
                const saveHandle = await window.showSaveFilePicker({
                    suggestedName: fileName,
                    types: [{
                        description: 'All Files',
                        accept: { '*/*': [] }
                    }]
                });

                const writable = await saveHandle.createWritable();
                await writable.write(blob);
                await writable.close();
                return true;
            } catch (err) {
                console.warn('[downloadFromOPFS] Save picker error:', err);
            }
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return true;

    } catch (error) {
        console.error('[downloadFromOPFS] Error:', error);
        throw error;
    }
}
