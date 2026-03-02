import * as THREE from 'three';
export class VideoFactory {
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

        video.play().catch((err) => {
            console.warn(`[VideoFactory] Autoplay blocked for "${src}":`, err.message);
        });

        return { video, texture };
    }
    static dispose({ video, texture }) {
        video.pause();
        video.src = '';
        video.load();
        texture.dispose();
    }
}
