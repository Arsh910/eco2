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
    const [theme, setTheme] = useState('dark');

    // Load view preference state from localStorage on mount
    useEffect(() => {
        const savedTheme = localStorage.getItem('eco2_theme_preference');
        if (savedTheme) {
            setTheme(savedTheme);
            document.documentElement.classList.toggle('dark', savedTheme === 'dark');
        } else {
            document.documentElement.classList.add('dark');
        }
    }, []);

    const toggleTheme = () => {
        setTheme(prev => {
            const newTheme = prev === 'dark' ? 'light' : 'dark';
            localStorage.setItem('eco2_theme_preference', newTheme);
            document.documentElement.classList.toggle('dark', newTheme === 'dark');
            return newTheme;
        });
    };

    const [activeTransferTab, setActiveTransferTab] = useState('text'); // 'text' | 'file'

    // Background Settings
    const [backgroundSettings, setBackgroundSettings] = useState({
        type: 'eco2model', // 'eco2model' | 'model' | 'image'
        value: 'globe',    // used when type='model': 'globe' | 'net'
        color: '#3b82f6'
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
        theme,
        toggleTheme,
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
