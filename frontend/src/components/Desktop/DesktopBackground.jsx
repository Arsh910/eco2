import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import GLOBE from 'vanta/src/vanta.globe';
import NET from 'vanta/src/vanta.net';
import { useView } from '../../context/ViewContext';
import { useAuth } from '../../context/AuthContext';
import Eco2Scene from './ads/Eco2Scene';
import AdSenseLandingPage from './ads/AdSenseLandingPage';

const DesktopBackground = () => {
    const { backgroundSettings, theme } = useView();
    const { mode } = useAuth();
    const isGuest = mode === 'guest';
    const [vantaEffect, setVantaEffect] = useState(null);
    const containerRef = useRef(null);

    // Effect to handle Vanta initialization and cleanup
    useEffect(() => {
        // Cleanup function for previous effect
        const cleanup = () => {
            if (vantaEffect) {
                try {
                    vantaEffect.destroy();
                } catch (e) {
                    console.warn("[DesktopBackground] Failed to destroy Vanta effect:", e);
                }
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
            if (vantaEffect) {
                try {
                    vantaEffect.destroy();
                } catch (e) {
                    // Ignore destroy errors
                }
            }

            try {
                // Vanta.js (especially older versions/effects) sometimes relies on global THREE
                if (!window.THREE) {
                    window.THREE = THREE;
                }

                let effect;
                // Currently only supporting Globe and Net
                // Fallback to globe if value is not a valid model type
                const modelValue = ['globe', 'net'].includes(backgroundSettings.value)
                    ? backgroundSettings.value
                    : 'globe';

                const commonConfig = {
                    el: containerRef.current,
                    THREE: THREE, // Pass explicitly as well
                    mouseControls: true,
                    touchControls: true,
                    gyroControls: false,
                    minHeight: 200.00,
                    minWidth: 200.00,
                    scale: 1.00,
                    scaleMobile: 1.00,
                };

                if (modelValue === 'globe') {
                    // Determine colors based on theme
                    const isDark = theme === 'dark';
                    const bgColor = isDark ? 0x020617 : 0xF5F5DC; // Slate-950 vs Beige
                    const globeColor = isDark
                        ? parseInt(backgroundSettings.color.replace('#', '0x'))
                        : 0x78A02E; // Olive Green for Light Mode

                    effect = GLOBE({
                        ...commonConfig,
                        color: globeColor,
                        color2: isDark ? 0xffffff : 0x3f6212, // White for Dark Mode, Dark Olive for Light Mode
                        backgroundColor: bgColor
                    });
                } else if (modelValue === 'net') {
                    const isDark = theme === 'dark';
                    const bgColor = isDark ? 0x020617 : 0xF5F5DC;
                    const color = isDark ? 0x3b82f6 : 0x2563eb; // Blue-500 vs Blue-600
                    const backgroundColor = bgColor;

                    effect = NET({
                        ...commonConfig,
                        color: color,
                        backgroundColor: backgroundColor,
                        points: 10.00,
                        maxDistance: 20.00,
                        spacing: 15.00,
                        vertexColors: false // Fix for THREE.Material warning
                    });
                }

                setVantaEffect(effect);
            } catch (error) {
                console.error("[DesktopBackground] Failed to init Vanta:", error);
            }
        };

        // Small timeout to ensure DOM is ready and previous cleanups are done
        const timeoutId = setTimeout(initVanta, 10);

        return cleanup;
    }, [backgroundSettings.type, backgroundSettings.value, backgroundSettings.color, theme]);

    // Render Logic

    if (backgroundSettings.type === 'eco2model') {
        // [Google AdSense Approval Mode]
        // return <Eco2Scene />;
        return <AdSenseLandingPage />;
    }

    if (backgroundSettings.type === 'image') {
        return (
            <>
                <div
                    className="absolute inset-0 z-0 bg-cover bg-center transition-all duration-500"
                    style={{
                        backgroundImage: `url(${backgroundSettings.value})`,
                        backgroundColor: '#020617' // Fallback
                    }}
                />
            </>
        );
    }

    return (
        <>
            <div ref={containerRef} className="absolute inset-0 z-0 bg-[#020617]" />
        </>
    );
};

export default DesktopBackground;
