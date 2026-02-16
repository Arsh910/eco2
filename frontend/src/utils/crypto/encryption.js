// encryption.js - Client-side AES-GCM Encryption

// Generate a key from a password
export async function generateKey(password, salt) {
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
        "raw",
        enc.encode(password),
        { name: "PBKDF2" },
        false,
        ["deriveBits", "deriveKey"]
    );

    return window.crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: salt || window.crypto.getRandomValues(new Uint8Array(16)),
            iterations: 100000,
            hash: "SHA-256"
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
    );
}

// Encrypt a file (Blob/File)
export async function encryptFile(file, password) {
    try {
        const salt = window.crypto.getRandomValues(new Uint8Array(16));
        const key = await generateKey(password, salt);
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const fileData = await file.arrayBuffer();

        const encryptedContent = await window.crypto.subtle.encrypt(
            { name: "AES-GCM", iv: iv },
            key,
            fileData
        );

        // Pack the salt + iv + encrypted data
        // Format: [SALT (16)][IV (12)][DATA]
        const encryptedBlob = new Blob([salt, iv, encryptedContent], { type: 'application/octet-stream' });
        return encryptedBlob;
    } catch (error) {
        console.error("Encryption failed:", error);
        throw new Error("Encryption failed");
    }
}

// Decrypt a file (Blob/File)
export async function decryptFile(encryptedFile, password) {
    try {
        const buffer = await encryptedFile.arrayBuffer();

        // Extract parts
        const salt = buffer.slice(0, 16);
        const iv = buffer.slice(16, 28);
        const data = buffer.slice(28);

        const key = await generateKey(password, salt);

        const decryptedContent = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv: iv },
            key,
            data
        );

        return new Blob([decryptedContent]);
    } catch (error) {
        console.error("Decryption failed:", error);
        throw new Error("Invalid password or corrupted file");
    }
}
