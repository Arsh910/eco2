import * as THREE from 'three';

/**
 * Phase 2 — VideoFactory
 *
 * Creates an HTMLVideoElement and wraps it in a THREE.VideoTexture
 * ready for use as an emissive LED-screen material.
 *
 * Rules enforced:
 *   ✔ muted          — required for autoplay without user gesture
 *   ✔ playsInline    — avoids fullscreen on iOS
 *   ✔ autoplay
 *   ✔ loop
 *   ✔ crossOrigin    — allows cross-origin video sources
 *   ✔ preload=metadata
 *
 * Texture config (Phase 3):
 *   minFilter / magFilter = LinearFilter
 *   generateMipmaps       = false
 *   colorSpace            = SRGBColorSpace
 */
export class VideoFactory {
    /**
     * @param {string} src  URL or path to video file (e.g. "/ads/ad1.mp4")
     * @returns {{ video: HTMLVideoElement, texture: THREE.VideoTexture }}
     */
    static create(src) {
        const video = document.createElement('video');
        video.src = src;
        video.muted = true;
        video.playsInline = true;
        video.autoplay = true;
        video.loop = true;
        video.crossOrigin = 'anonymous';
        video.preload = 'metadata';

        const texture = new THREE.VideoTexture(video);
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.generateMipmaps = false;
        texture.colorSpace = THREE.SRGBColorSpace;

        // Attempt immediate play; browsers may require user interaction first.
        video.play().catch((err) => {
            console.warn(`[VideoFactory] Autoplay blocked for "${src}":`, err.message);
        });

        return { video, texture };
    }

    /**
     * Cleanly stops and disposes a video + texture reference.
     * Call this before discarding to avoid resource leaks.
     *
     * @param {{ video: HTMLVideoElement, texture: THREE.VideoTexture }} ref
     */
    static dispose({ video, texture }) {
        video.pause();
        video.src = '';
        video.load();   // resets internal state and releases media resource
        texture.dispose();
    }
}
