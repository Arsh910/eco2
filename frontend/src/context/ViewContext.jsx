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

    const value = {
        isProMode,
        toggleView,
        activeTransferTab,
        setActiveTransferTab
    };

    return (
        <ViewContext.Provider value={value}>
            {children}
        </ViewContext.Provider>
    );
};
