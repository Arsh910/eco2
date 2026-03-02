import React, { useEffect, useRef } from 'react';
import { RefreshCcw, FolderPlus, Monitor, Power } from 'lucide-react';

const ContextMenu = ({ isOpen, position, onClose, onAction }) => {
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const menuItems = [
        { label: 'Refresh', icon: RefreshCcw, action: 'refresh' },
        { label: 'New Folder', icon: FolderPlus, action: 'new_folder' },
        { label: 'Display Settings', icon: Monitor, action: 'display' },
        { type: 'separator' },
        { label: 'Shut Down', icon: Power, action: 'shutdown', className: 'text-red-400 hover:text-red-300' },
    ];

    return (
        <div
            ref={menuRef}
            className="fixed z-[100] w-56 bg-[var(--bg-glass)] backdrop-blur-xl border border-[var(--border-subtle)] rounded-lg shadow-xl py-1 animate-in fade-in zoom-in duration-100 transition-colors duration-300"
            style={{ top: position.y, left: position.x }}
            onContextMenu={(e) => e.preventDefault()}
        >
            {menuItems.map((item, index) => {
                if (item.type === 'separator') {
                    return <div key={index} className="h-px bg-[var(--border-subtle)] my-1 mx-2" />;
                }

                const Icon = item.icon;
                return (
                    <button
                        key={index}
                        className={`w-full px-4 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--text-secondary)]/10 flex items-center gap-3 transition-colors ${item.className || ''}`}
                        onClick={() => {
                            onAction(item.action);
                            onClose();
                        }}
                    >
                        <Icon className="w-4 h-4" />
                        {item.label}
                    </button>
                );
            })}
        </div>
    );
};

export default ContextMenu;
