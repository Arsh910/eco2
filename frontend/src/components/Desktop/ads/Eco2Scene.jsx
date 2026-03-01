import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS3DRenderer } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import { AdManager } from './AdManager';

// ── Background helpers ────────────────────────────────────────────────────────

function createStarfield() {
    const count = 4000;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
        // Spread stars across a large sphere
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = 300 + Math.random() * 200;
        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = r * Math.cos(phi);

        // Slight colour variation: white → cool blue
        const t = Math.random();
        colors[i * 3] = 0.7 + t * 0.3;   // R
        colors[i * 3 + 1] = 0.8 + t * 0.2;   // G
        colors[i * 3 + 2] = 1.0;              // B
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
        size: 0.6,
        vertexColors: true,
        transparent: true,
        opacity: 0.85,
        sizeAttenuation: true,
    });

    return new THREE.Points(geo, mat);
}

function createGroundGrid() {
    // Infinite-feel glowing neon grid on the ground plane
    const size = 200;
    const divisions = 40;
    const grid = new THREE.GridHelper(size, divisions, 0x1a4fff, 0x0d1f66);
    grid.position.y = 0;
    grid.material.transparent = true;
    grid.material.opacity = 0.35;
    return grid;
}

function createGlowRing() {
    // Subtle horizontal glow disk at ground level around the building
    const geo = new THREE.RingGeometry(6, 14, 64);
    const mat = new THREE.MeshBasicMaterial({
        color: 0x2244ff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.12,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    });
    const ring = new THREE.Mesh(geo, mat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.05;
    return ring;
}

function createAmbientParticles() {
    // Slow-drifting motes floating around the building
    const count = 120;
    const positions = new Float32Array(count * 3);
    const velocities = [];

    for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 30;
        positions[i * 3 + 1] = Math.random() * 20;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 30;
        velocities.push(
            (Math.random() - 0.5) * 0.01,
            Math.random() * 0.008 + 0.002,
            (Math.random() - 0.5) * 0.01
        );
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
        size: 0.15,
        color: 0x4488ff,
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    });

    const points = new THREE.Points(geo, mat);
    points.userData.velocities = velocities;
    return points;
}

// ─────────────────────────────────────────────────────────────────────────────

import { ScreenRegistry } from './ScreenRegistry';
// ... previous imports are kept intact ...

const Eco2Scene = () => {
    const containerRef = useRef(null);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const W = window.innerWidth;
        const H = window.innerHeight;

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(W, H);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.2;
        renderer.shadowMap.enabled = true;

        const canvas = renderer.domElement;
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.zIndex = '1';
        el.appendChild(canvas);

        const cssRenderer = new CSS3DRenderer();
        cssRenderer.setSize(W, H);
        cssRenderer.domElement.style.position = 'absolute';
        cssRenderer.domElement.style.top = '0';
        cssRenderer.domElement.style.left = '0';
        cssRenderer.domElement.style.width = '100%';
        cssRenderer.domElement.style.height = '100%';
        cssRenderer.domElement.style.zIndex = '2'; // Sit on top of WebGL
        cssRenderer.domElement.style.pointerEvents = 'none'; // Pass clicks through to canvas unless the DIV itself has auto
        el.appendChild(cssRenderer.domElement);

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x020617);
        scene.fog = new THREE.FogExp2(0x020b2a, 0.008);

        const camera = new THREE.PerspectiveCamera(15, W / H, 0.01, 1000);
        const isMobile = window.innerWidth < 768;
        camera.position.set(5, isMobile ? 12 : 10, isMobile ? 50 : 25);

        // ... Environment ...
        const stars = createStarfield();
        scene.add(stars);

        const groundGrid = createGroundGrid();
        scene.add(groundGrid);

        const glowRing = createGlowRing();
        scene.add(glowRing);

        const ambientParticles = createAmbientParticles();
        scene.add(ambientParticles);

        scene.add(new THREE.AmbientLight(0xffffff, 1.2));
        const key = new THREE.DirectionalLight(0xfff0e0, 2.0);
        key.position.set(0, 20, 10);
        scene.add(key);
        const frontFill = new THREE.DirectionalLight(0xffeedd, 1.5);
        frontFill.position.set(5, 8, 25);
        scene.add(frontFill);
        const rim = new THREE.DirectionalLight(0x2255ff, 0.4);
        rim.position.set(0, 5, -20);
        scene.add(rim);

        const controls = new OrbitControls(camera, canvas);
        controls.enableDamping = true;
        controls.dampingFactor = 0.06;
        controls.enablePan = false;
        controls.target.set(0, 3, 0);

        const mouse = { x: 0, y: 0 };
        const mouseTarget = { x: 0, y: 0 };

        const onMouseMove = (e) => {
            mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            mouse.y = -((e.clientY / window.innerHeight) * 2 - 1);
        };
        window.addEventListener('mousemove', onMouseMove);

        const onTouchMove = (e) => {
            if (e.touches.length === 0) return;
            const t = e.touches[0];
            mouse.x = -((t.clientX / window.innerWidth) * 2 - 1);
            mouse.y = ((t.clientY / window.innerHeight) * 2 - 1);
        };
        window.addEventListener('touchmove', onTouchMove, { passive: true });

        let adManager = null;
        let adRefreshInterval = null;
        let modelGroup = null;
        const baseRotY = 0;

        const loader = new GLTFLoader();
        loader.load('/eco2/eco2.glb',
            async (gltf) => {
                const model = gltf.scene;

                modelGroup = new THREE.Group();
                modelGroup.add(model);
                scene.add(modelGroup);

                model.updateWorldMatrix(true, true);

                const box = new THREE.Box3();
                model.traverse(c => {
                    if (c.isMesh) {
                        c.geometry.computeBoundingBox();
                        box.union(c.geometry.boundingBox.clone().applyMatrix4(c.matrixWorld));
                    }
                });

                if (box.isEmpty()) { console.error('[Eco2Scene] No meshes!'); return; }

                const center = box.getCenter(new THREE.Vector3());
                model.position.set(-center.x, -box.min.y, -center.z);
                model.rotation.set(0, Math.PI + 0.9, 0);
                model.updateWorldMatrix(true, true);

                const size = new THREE.Vector3();
                box.getSize(size);
                const midH = size.y * 0.5;
                controls.target.set(0, midH, 0);
                camera.lookAt(0, midH, 0);
                camera.updateProjectionMatrix();

                // 1. Register all ad screens from the GLTF model
                const registry = new ScreenRegistry(model);

                // 2. Initialize AdManager taking the registry
                adManager = new AdManager(registry);

                // 3. Initial Ad Load
                await adManager.loadAds();

                // 4. Setup 60-second ad refresh schedule per requirements
                adRefreshInterval = setInterval(() => {
                    console.log('[AdManager] Normal refresh interval triggered.');
                    adManager.loadAds();
                }, 60000);
            },
            undefined,
            err => console.error('[Eco2Scene] load error:', err)
        );

        const onResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
            cssRenderer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener('resize', onResize);

        let raf;
        let elapsed = 0;
        const animate = () => {
            raf = requestAnimationFrame(animate);
            elapsed += 0.016;

            mouseTarget.x += (mouse.x - mouseTarget.x) * 0.05;
            mouseTarget.y += (mouse.y - mouseTarget.y) * 0.05;

            if (modelGroup) {
                const rawY = -(baseRotY + mouseTarget.x * (Math.PI / 2));
                const rawX = mouseTarget.y * (Math.PI / 2);
                modelGroup.rotation.y = THREE.MathUtils.clamp(rawY, -0.35, 0.35);
                modelGroup.rotation.x = THREE.MathUtils.clamp(rawX, -0.1, 0.26);
            }

            stars.rotation.y = elapsed * 0.005;
            stars.rotation.x = elapsed * 0.002;
            glowRing.material.opacity = 0.08 + Math.sin(elapsed * 1.2) * 0.06;

            const pos = ambientParticles.geometry.attributes.position;
            const vel = ambientParticles.userData.velocities;
            for (let i = 0; i < pos.count; i++) {
                pos.array[i * 3] += vel[i * 3];
                pos.array[i * 3 + 1] += vel[i * 3 + 1];
                pos.array[i * 3 + 2] += vel[i * 3 + 2];
                if (pos.array[i * 3 + 1] > 22) pos.array[i * 3 + 1] = 0;
                if (Math.abs(pos.array[i * 3]) > 16) vel[i * 3] *= -1;
                if (Math.abs(pos.array[i * 3 + 2]) > 16) vel[i * 3 + 2] *= -1;
            }
            pos.needsUpdate = true;

            controls.update();
            renderer.render(scene, camera);
            cssRenderer.render(scene, camera);
        };
        animate();

        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener('resize', onResize);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('touchmove', onTouchMove);
            clearInterval(adRefreshInterval);
            if (adManager) adManager.dispose();
            controls.dispose();
            renderer.dispose();
            if (el.contains(canvas)) el.removeChild(canvas);
            if (el.contains(cssRenderer.domElement)) el.removeChild(cssRenderer.domElement);
        };
    }, []);

    return <div ref={containerRef} style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', zIndex: 0, overflow: 'hidden' }} />;
};

export default Eco2Scene;
