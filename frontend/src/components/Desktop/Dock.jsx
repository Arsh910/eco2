import React, { useState, useEffect } from 'react';
import { Share2, Settings, Folder, Terminal, Video, ShoppingBag, Globe } from 'lucide-react';

const DockItem = ({ icon: Icon, label, isOpen, onClick, isMobile }) => {
    return (
        <div
            className={`group relative flex flex-col items-center gap-1 cursor-pointer transition-all duration-300 ${!isMobile ? "hover:-translate-y-2" : ""}`}
            onClick={onClick}
        >
            <div className={`
                ${isMobile ? "p-2" : "p-3"} 
                rounded-2xl 
                transition-all duration-300
                ${isMobile && isOpen ? "bg-[var(--accent-primary)] text-white" : "text-[var(--text-secondary)]"}
                ${!isMobile ? "bg-white/5 backdrop-blur-md border border-[var(--border-subtle)] shadow-lg group-hover:bg-[var(--accent-glow)] group-hover:scale-110 group-hover:text-white" : ""}
                ${!isMobile && isOpen ? 'ring-2 ring-[var(--accent-primary)] bg-[var(--accent-glow)] text-[var(--accent-primary)]' : ''}
            `}>
                <Icon className={`${isMobile ? "w-6 h-6" : "w-8 h-8"}`} />
            </div>
            {!isMobile && (
                <span className="absolute -top-10 px-2 py-1 bg-black/50 backdrop-blur-sm rounded text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {label}
                </span>
            )}
            {isOpen && !isMobile && (
                <div className="absolute -bottom-2 w-1.5 h-1.5 bg-white border border-black rounded-full"></div>
            )}
            {isMobile && isOpen && (
                <div className="w-1 h-1 bg-white border border-black rounded-full mt-1"></div>
            )}
        </div>
    );
};

const Dock = ({ currentApp, onLaunchApp }) => {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 640);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const apps = [
        { id: 'transfer', label: 'Transfer', icon: Share2 },
        { id: 'ecomeets', label: 'EcoMeets', icon: Video },
        { id: 'ecostore', label: 'EcoStore', icon: ShoppingBag },
        { id: 'terminal', label: 'Terminal', icon: Terminal },
        { id: 'settings', label: 'Settings', icon: Settings },
    ];

    if (isMobile) {
        // Mobile Layout: Fixed bottom bar like StatusBar
        return (
            <div className="fixed bottom-0 left-0 right-0 h-16 bg-[var(--bg-dock)] backdrop-blur-2xl border-t border-[var(--border-subtle)] flex items-center justify-around px-6 z-50 safe-area-bottom transition-colors duration-300">
                {apps.map((app) => (
                    <DockItem
                        key={app.id}
                        icon={app.icon}
                        label={app.label}
                        isOpen={currentApp === app.id}
                        onClick={() => onLaunchApp(app.id)}
                        isMobile={true}
                    />
                ))}
            </div>
        );
    }

    // Desktop Layout: Floating Dock
    return (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 px-6 py-4 bg-[var(--bg-dock)] backdrop-blur-2xl border border-[var(--border-subtle)] rounded-2xl flex items-end space-x-4 z-50 shadow-2xl ring-1 ring-[var(--border-highlight)] transition-colors duration-300">
            {apps.map((app) => (
                <DockItem
                    key={app.id}
                    icon={app.icon}
                    label={app.label}
                    isOpen={currentApp === app.id}
                    onClick={() => onLaunchApp(app.id)}
                    isMobile={false}
                />
            ))}
        </div>
    );
};

export default Dock;
