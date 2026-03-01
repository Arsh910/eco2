import React, { useRef, useState, useEffect } from 'react';
import Draggable from 'react-draggable';
import DataTransfer from '../../pages/eco2apps/connect/DataTransfer';
import Terminal from '../../pages/eco2apps/terminal/Terminal';
import Settings from '../../pages/eco2apps/settings/Settings';
import EcoMeets from '../../pages/eco2apps/ecomeets/EcoMeets';
import EcoStore from '../../pages/eco2apps/ecostore/EcoStore';

// Mapping of app IDs to components
const AppComponents = {
    transfer: DataTransfer,
    ecomeets: EcoMeets,
    terminal: Terminal,
    settings: Settings,
    ecostore: EcoStore,
};

const WindowArea = ({ app, onClose }) => {
    const nodeRef = useRef(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 640);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    if (!app) return null;

    const AppComponent = AppComponents[app];
    const bounds = {
        top: 32,
    };

    const initialY = isMobile ? 0 : 50;

    return (
        <Draggable
            nodeRef={nodeRef}
            handle=".window-title-bar"
            defaultPosition={{ x: isMobile ? 0 : 100, y: initialY }}
            enableUserSelectHack={false}
            disabled={isMobile}
            bounds={bounds}
        >
            <div
                ref={nodeRef}
                style={{
                    position: 'absolute',
                    width: isMobile ? '100%' : '80%',
                    // Height = 100% - StatusBar(2rem) - Dock(4rem)
                    height: isMobile ? 'calc(100% - 6rem)' : '80%',
                    top: isMobile ? '2rem' : undefined,
                    left: isMobile ? 0 : undefined,
                    touchAction: 'none'
                }}
                className="bg-[var(--bg-window)] backdrop-blur-2xl border border-[var(--border-subtle)] sm:rounded-xl shadow-2xl flex flex-col overflow-hidden ring-1 ring-[var(--border-highlight)] transition-colors duration-300"
            >
                {/* Window Title Bar */}
                <div
                    className={`window-title-bar h-12 border-b border-[var(--border-subtle)] flex items-center justify-between px-2 select-none cursor-grab active:cursor-grabbing touch-none transition-colors duration-300 ${isProcessing ? 'bg-yellow-100/10' : 'bg-white/5'
                        }`}
                >
                    <div className="flex items-center">
                        {/* Close Button - 44px touch target */}
                        <div
                            className="w-11 h-11 flex items-center justify-center cursor-pointer group touch-manipulation"
                            onClick={onClose}
                        >
                            <span className="w-3 h-3 rounded-full bg-red-500 group-hover:bg-red-600 transition-colors"></span>
                        </div>

                        {/* Minimize Button - 44px touch target */}
                        {/* <div className="w-11 h-11 flex items-center justify-center cursor-pointer group touch-manipulation">
                            <span className="w-3 h-3 rounded-full bg-yellow-500 group-hover:bg-yellow-600 transition-colors"></span>
                        </div> */}

                        {/* Maximize Button - 44px touch target */}
                        {/* <div className="w-11 h-11 flex items-center justify-center cursor-pointer group touch-manipulation">
                            <span className="w-3 h-3 rounded-full bg-green-500 group-hover:bg-green-600 transition-colors"></span>
                        </div> */}
                    </div>
                    <span className={`text-sm font-medium capitalize pointer-events-none transition-colors duration-300 ${isProcessing ? 'text-yellow-200' : 'text-[var(--text-secondary)]'}`}>{app}</span>
                    <div className="w-14"></div>
                </div>

                {/* Window Content */}
                <div className="flex-grow overflow-auto relative" style={{ cursor: 'default' }}>
                    {AppComponent ? (
                        <AppComponent
                            onProcessStart={() => setIsProcessing(true)}
                            onProcessEnd={() => setIsProcessing(false)}
                        />
                    ) : (
                        <div className="p-4 text-red-400">App not found</div>
                    )}
                </div>
            </div>
        </Draggable>
    );
};

export default WindowArea;
