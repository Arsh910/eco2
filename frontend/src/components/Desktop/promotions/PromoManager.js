import * as THREE from 'three';
import { fetchAds } from './PromoService';
import { CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';

export class PromoManager {
    constructor(screenRegistry) {
        this.screenRegistry = screenRegistry;
        this.activeCssObjects = new Map();
    }

    async loadAds() {
        const ads = await fetchAds();
        if (!ads || ads.length === 0) return;

        for (const ad of ads) {
            const screen = this.screenRegistry.getScreen(ad.screen);
            if (!screen) {
                console.warn(`[PromoManager] Screen ${ad.screen} not found in GLB.`);
                continue;
            }

            try {
                if (this.activeCssObjects.has(ad.screen)) {
                    const oldObj = this.activeCssObjects.get(ad.screen);
                    screen.remove(oldObj);
                    this.activeCssObjects.delete(ad.screen);
                }

                screen.geometry.computeBoundingBox();
                const box = screen.geometry.boundingBox;
                const size = new THREE.Vector3();
                box.getSize(size);
                const center = new THREE.Vector3();
                box.getCenter(center);

                const axesArgs = [
                    { axis: 0, len: size.x },
                    { axis: 1, len: size.y },
                    { axis: 2, len: size.z },
                ].sort((a, b) => a.len - b.len);

                const thickAxis = axesArgs[0].axis;

                const n1 = new THREE.Vector3(); n1.setComponent(thickAxis, 1);
                const n2 = new THREE.Vector3(); n2.setComponent(thickAxis, -1);

                screen.updateMatrixWorld(true);
                const screenWorldPos = new THREE.Vector3();
                screen.getWorldPosition(screenWorldPos);

                const toScreen = screenWorldPos.clone().setY(0).normalize();

                let zAxis = n1;
                let bestDot = -Infinity;
                for (const n of [n1, n2]) {
                    const worldN = n.clone().transformDirection(screen.matrixWorld).normalize();
                    const d = worldN.dot(toScreen);
                    if (d > bestDot) {
                        bestDot = d;
                        zAxis = n;
                    }
                }

                const localUp = new THREE.Vector3(0, 1, 0).transformDirection(screen.matrixWorld.clone().invert()).normalize();

                const axesIdx = [0, 1, 2].filter(a => a !== thickAxis);
                const axisA = new THREE.Vector3(); axisA.setComponent(axesIdx[0], 1);
                const axisB = new THREE.Vector3(); axisB.setComponent(axesIdx[1], 1);

                let yAxis = axisA;
                let maxDot = -Infinity;
                for (const axis of [axisA, axisA.clone().negate(), axisB, axisB.clone().negate()]) {
                    const d = axis.dot(localUp);
                    if (d > maxDot) {
                        maxDot = d;
                        yAxis = axis;
                    }
                }

                const xAxis = new THREE.Vector3().crossVectors(yAxis, zAxis).normalize();

                const mat = new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis);

                const w = Math.abs(xAxis.dot(size));
                const h = Math.abs(yAxis.dot(size));

                const adDiv = document.createElement('div');
                const pixelWidth = 640;
                const pixelHeight = Math.round(pixelWidth * (h / w));

                adDiv.style.width = `${pixelWidth}px`;
                adDiv.style.height = `${pixelHeight}px`;
                adDiv.style.backgroundColor = '#000';
                adDiv.style.position = 'relative';
                adDiv.style.pointerEvents = 'auto';
                adDiv.style.overflow = 'hidden';

                const contentDiv = document.createElement('div');
                contentDiv.style.width = '100%';
                contentDiv.style.height = '100%';
                if (ad.videoUrl) {
                    const video = document.createElement('video');
                    video.src = ad.videoUrl;
                    video.style.width = '100%';
                    video.style.height = '100%';
                    video.style.objectFit = 'cover';
                    video.crossOrigin = 'anonymous';

                    video.muted = true;
                    video.defaultMuted = true;
                    video.autoplay = true;
                    video.loop = true;
                    video.playsInline = true;

                    video.play().catch(e => console.warn('[PromoManager] Autoplay prevented:', e));
                    contentDiv.appendChild(video);

                    if (ad.clickUrl) {
                        contentDiv.style.cursor = 'pointer';
                        contentDiv.onclick = () => window.open(ad.clickUrl, '_blank');
                    }
                } else {
                    contentDiv.innerHTML = `
                        <div style="color:white; font-family:sans-serif; display:flex; 
                                    align-items:center; justify-content:center; 
                                    width:100%; height:100%; border:2px solid #555;">
                            Google AdSense Overlay<br/>(${pixelWidth}x${pixelHeight})
                        </div>
                    `;
                }

                const shieldDiv = document.createElement('div');
                shieldDiv.style.position = 'absolute';
                shieldDiv.style.top = '0';
                shieldDiv.style.left = '0';
                shieldDiv.style.width = '100%';
                shieldDiv.style.height = '100%';
                shieldDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.01)';
                shieldDiv.style.zIndex = '10';
                shieldDiv.style.display = 'flex';
                shieldDiv.style.alignItems = 'center';
                shieldDiv.style.justifyContent = 'center';
                shieldDiv.style.cursor = 'pointer';
                shieldDiv.style.transition = 'background-color 0.2s, opacity 0.2s';

                const promptText = document.createElement('span');
                promptText.innerText = 'Click again to open Ad';
                promptText.style.color = 'white';
                promptText.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
                promptText.style.padding = '12px 24px';
                promptText.style.borderRadius = '8px';
                promptText.style.fontFamily = 'sans-serif';
                promptText.style.fontWeight = 'bold';
                promptText.style.fontSize = '24px';
                promptText.style.opacity = '0';
                promptText.style.transition = 'opacity 0.2s';
                promptText.style.pointerEvents = 'none';

                shieldDiv.appendChild(promptText);

                let resetTimeout = null;
                shieldDiv.addEventListener('click', (e) => {
                    e.stopPropagation();


                    shieldDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.4)';
                    promptText.style.opacity = '1';
                    shieldDiv.style.pointerEvents = 'none';

                    if (resetTimeout) clearTimeout(resetTimeout);
                    resetTimeout = setTimeout(() => {
                        shieldDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.01)';
                        promptText.style.opacity = '0';
                        shieldDiv.style.pointerEvents = 'auto';
                    }, 3000);
                });

                adDiv.appendChild(contentDiv);
                adDiv.appendChild(shieldDiv);

                const cssObject = new CSS3DObject(adDiv);
                cssObject.rotation.setFromRotationMatrix(mat);

                const scaleFactor = w / pixelWidth;
                cssObject.scale.set(scaleFactor, scaleFactor, scaleFactor);

                // Position it locally in the center, pushed slightly outward along the normal
                const offset = size.getComponent(thickAxis) / 2 + 0.005;
                const pos = center.clone().add(zAxis.clone().multiplyScalar(offset));
                cssObject.position.copy(pos);

                screen.add(cssObject);
                this.activeCssObjects.set(ad.screen, cssObject);

                screen.material = new THREE.MeshStandardMaterial({
                    color: 0x010101,
                    roughness: 0.9,
                    metalness: 0.1
                });

                screen.userData.clickUrl = null;

            } catch (error) {
                console.error(`[PromoManager] Failed applying ad to ${ad.screen}:`, error);
            }
        }
    }

    dispose() {
        this.activeCssObjects.forEach((cssObject, screenName) => {
            const screen = this.screenRegistry.getScreen(screenName);
            if (screen) screen.remove(cssObject);
        });
        this.activeCssObjects.clear();
    }
}
