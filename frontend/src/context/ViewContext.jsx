import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { getBackgroundSettings, updateBackgroundSettings as apiUpdateSettings } from '../services/settings.service';

const ViewContext = createContext(null);

export const useView = () => {
    const context = useContext(ViewContext);
    if (!context) {
        throw new Error('useView must be used within ViewProvider');
    }
    return context;
};

export const ViewProvider = ({ children }) => {
    const { isAuthenticated, token } = useAuth();
    const [isProMode, setIsProMode] = useState(false);

    // Load view preference state from localStorage on mount (keep this for pro mode as it depends on device optionally)
    // or we could move this to DB too, but request only mentioned background settings.
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

    const [isLoadingSettings, setIsLoadingSettings] = useState(false);

    // Fetch settings when user logs in
    useEffect(() => {
        const fetchSettings = async () => {
            if (isAuthenticated && token) {
                setIsLoadingSettings(true);
                try {
                    const settings = await getBackgroundSettings(token);
                    if (settings) {
                        setBackgroundSettings(settings);
                    }
                } catch (error) {
                    console.error("Failed to load background settings", error);
                } finally {
                    setIsLoadingSettings(false);
                }
            } else {
                // Reset to defaults or keep last known? Maybe defaults for guest.
                // For now, let's keep it as is or reset if needed.
            }
        };

        fetchSettings();
    }, [isAuthenticated, token]);

    // Update local state (Preview)
    const updateBackgroundSettings = (newSettings) => {
        setBackgroundSettings(prev => ({ ...prev, ...newSettings }));
    };

    // Save to DB
    const saveBackgroundSettings = async () => {
        if (!isAuthenticated || !token) return;
        try {
            await apiUpdateSettings(token, backgroundSettings);
            // Maybe show a toast check? handled in component
        } catch (error) {
            console.error("Failed to save settings", error);
            throw error;
        }
    };

    const value = {
        isProMode,
        toggleView,
        activeTransferTab,
        setActiveTransferTab,
        backgroundSettings,
        updateBackgroundSettings,
        saveBackgroundSettings,
        isLoadingSettings
    };

    return (
        <ViewContext.Provider value={value}>
            {children}
        </ViewContext.Provider>
    );
};
