import React, { useState } from 'react';
import StatusBar from '../components/Desktop/StatusBar';
import Dock from '../components/Desktop/Dock';
import WindowArea from '../components/Desktop/WindowArea';
import ContextMenu from '../components/Desktop/ContextMenu';
import DesktopBackground from '../components/Desktop/DesktopBackground.jsx';

const Home = () => {
    const [currentApp, setCurrentApp] = useState(null);
    const [contextMenu, setContextMenu] = useState({ isOpen: false, x: 0, y: 0 });

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

    const handleContextMenuAction = (action) => {
        if (action === 'display') {
            handleLaunchApp('settings');
        }
        // Add other actions here
        console.log('Action:', action);
    };

    return (
        <div
            className="h-screen w-screen overflow-hidden relative font-sans text-slate-100 select-none"
            onContextMenu={handleContextMenu}
            onClick={handleCloseContextMenu}
        >
            {/* Modular Desktop Background */}
            <DesktopBackground />

            {/* Desktop UI */}
            <div className="relative z-10 h-full flex flex-col pointer-events-none">
                <div className="pointer-events-auto">
                    <StatusBar currentApp={currentApp} />
                </div>

                <div className="flex-grow relative pointer-events-auto">
                    {/* Window Area */}
                    <WindowArea app={currentApp} onClose={handleCloseApp} />
                </div>

                <div className="pointer-events-auto">
                    <Dock currentApp={currentApp} onLaunchApp={handleLaunchApp} />
                </div>
            </div>

            {/* Context Menu */}
            <div className="pointer-events-auto relative z-50">
                <ContextMenu
                    isOpen={contextMenu.isOpen}
                    position={{ x: contextMenu.x, y: contextMenu.y }}
                    onClose={handleCloseContextMenu}
                    onAction={handleContextMenuAction}
                />
            </div>
        </div>
    );
};

export default Home;
