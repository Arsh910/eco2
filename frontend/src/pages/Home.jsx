import React, { useState, useEffect, useRef } from 'react';
import GLOBE from 'vanta/src/vanta.globe';
import StatusBar from '../components/Desktop/StatusBar';
import Dock from '../components/Desktop/Dock';
import WindowArea from '../components/Desktop/WindowArea';
import ContextMenu from '../components/Desktop/ContextMenu';

const Home = () => {
    const [vantaEffect, setVantaEffect] = useState(null);
    const vantaRef = useRef(null);

    const [currentApp, setCurrentApp] = useState(null);
    const [contextMenu, setContextMenu] = useState({ isOpen: false, x: 0, y: 0 });

    useEffect(() => {
        if (!vantaEffect && vantaRef.current) {
            try {
                setVantaEffect(
                    GLOBE({
                        el: vantaRef.current,
                        mouseControls: true,
                        touchControls: true,
                        gyroControls: false,
                        minHeight: 200.00,
                        minWidth: 200.00,
                        scale: 1.00,
                        scaleMobile: 1.00,
                        color: 0x3b82f6,
                        backgroundColor: 0x0f172a
                    })
                );
            } catch (error) {
                console.error("Failed to initialize Vanta effect:", error);
            }
        }
        return () => {
            if (vantaEffect) vantaEffect.destroy();
        };
    }, [vantaEffect]);

    const handleContextMenu = (e) => {
        e.preventDefault();
        setContextMenu({
            isOpen: true,
            x: e.clientX,
            y: e.clientY
        });
    };

    const handleCloseContextMenu = () => {
        setContextMenu({ ...contextMenu, isOpen: false });
    };

    const handleLaunchApp = (appId) => {
        setCurrentApp(appId);
    };

    const handleCloseApp = () => {
        setCurrentApp(null);
    };

    return (
        <div
            className="h-screen w-screen overflow-hidden relative font-sans text-slate-100 select-none"
            onContextMenu={handleContextMenu}
            onClick={handleCloseContextMenu}
        >
            {/* Vanta Background */}
            <div ref={vantaRef} className="absolute inset-0 z-0"></div>

            {/* Desktop UI */}
            <div className="relative z-10 h-full flex flex-col">
                <StatusBar currentApp={currentApp} />

                <div className="flex-grow relative">
                    {/* Window Area */}
                    <WindowArea app={currentApp} onClose={handleCloseApp} />
                </div>

                <Dock currentApp={currentApp} onLaunchApp={handleLaunchApp} />
            </div>

            {/* Context Menu */}
            <ContextMenu
                isOpen={contextMenu.isOpen}
                position={{ x: contextMenu.x, y: contextMenu.y }}
                onClose={handleCloseContextMenu}
                onAction={(action) => console.log('Action:', action)}
            />
        </div>
    );
};

export default Home;
