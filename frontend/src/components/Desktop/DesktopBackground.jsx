import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import GLOBE from 'vanta/src/vanta.globe';
// Import other Vanta effects if needed in the future
// import NET from 'vanta/src/vanta.net';
// import DOTS from 'vanta/src/vanta.dots';
import { useView } from '../../context/ViewContext';

const DesktopBackground = () => {
    const { backgroundSettings } = useView();
    const [vantaEffect, setVantaEffect] = useState(null);
    const containerRef = useRef(null);

    // Effect to handle Vanta initialization and cleanup
    useEffect(() => {
        // Cleanup function for previous effect
        const cleanup = () => {
            if (vantaEffect) {
                vantaEffect.destroy();
                setVantaEffect(null);
            }
        };

        // If type is not model, just cleanup and return
        if (backgroundSettings.type !== 'model' || !containerRef.current) {
            cleanup();
            return;
        }

        // Initialize Vanta Effect
        const initVanta = () => {
            // Destroy existing effect first
            if (vantaEffect) vantaEffect.destroy();

            try {
                let effect;
                // Currently only supporting Globe, but structure allows expansion
                // Fallback to globe if value is not a valid model type (e.g. image URL from previous state)
                const modelValue = ['globe', 'net', 'dots'].includes(backgroundSettings.value)
                    ? backgroundSettings.value
                    : 'globe';

                if (modelValue === 'globe') {
                    effect = GLOBE({
                        el: containerRef.current,
                        THREE: THREE,
                        mouseControls: true,
                        touchControls: true,
                        gyroControls: false,
                        minHeight: 200.00,
                        minWidth: 200.00,
                        scale: 1.00,
                        scaleMobile: 1.00,
                        color: parseInt(backgroundSettings.color.replace('#', '0x')),
                        backgroundColor: 0x020617 // Slate-950 (Deep Space)
                    });
                }

                setVantaEffect(effect);
            } catch (error) {
                console.error("[DesktopBackground] Failed to init Vanta:", error);
            }
        };

        initVanta();

        return cleanup;
    }, [backgroundSettings.type, backgroundSettings.value, backgroundSettings.color]);

    // Render Logic
    if (backgroundSettings.type === 'image') {
        return (
            <div
                className="absolute inset-0 z-0 bg-cover bg-center transition-all duration-500"
                style={{
                    backgroundImage: `url(${backgroundSettings.value})`,
                    backgroundColor: '#020617' // Fallback
                }}
            />
        );
    }

    return (
        <div ref={containerRef} className="absolute inset-0 z-0 bg-[#020617]" />
    );
};

export default DesktopBackground;
