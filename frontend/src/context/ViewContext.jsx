import { createContext, useContext, useState, useEffect } from 'react';

const ViewContext = createContext(null);

export const useView = () => {
    const context = useContext(ViewContext);
    if (!context) {
        throw new Error('useView must be used within ViewProvider');
    }
    return context;
};

export const ViewProvider = ({ children }) => {
    const [isProMode, setIsProMode] = useState(false);

    // Load view preference state from localStorage on mount
    useEffect(() => {
        const savedView = localStorage.getItem('eco2_view_preference');
        if (savedView) {
            setIsProMode(JSON.parse(savedView));
        }
    }, []);

    const toggleView = () => {
        setIsProMode(prev => {
            const newState = !prev;
            localStorage.setItem('eco2_view_preference', JSON.stringify(newState));
            return newState;
        });
    };

    const [activeTransferTab, setActiveTransferTab] = useState('text'); // 'text' | 'file'

    // Background Settings
    const [backgroundSettings, setBackgroundSettings] = useState({
        type: 'model', // 'model' | 'image'
        value: 'globe', // 'globe' | 'net' | 'dots' | 'url'
        color: '#3b82f6' // Default Indigo-500
    });

    useEffect(() => {
        const savedBg = localStorage.getItem('eco2_background_settings');
        if (savedBg) {
            try {
                setBackgroundSettings(JSON.parse(savedBg));
            } catch (e) {
                console.error("Failed to parse background settings", e);
            }
        }
    }, []);

    const updateBackgroundSettings = (newSettings) => {
        setBackgroundSettings(prev => {
            const updated = { ...prev, ...newSettings };
            localStorage.setItem('eco2_background_settings', JSON.stringify(updated));
            return updated;
        });
    };

    const value = {
        isProMode,
        toggleView,
        activeTransferTab,
        setActiveTransferTab,
        backgroundSettings,
        updateBackgroundSettings
    };

    return (
        <ViewContext.Provider value={value}>
            {children}
        </ViewContext.Provider>
    );
};
