import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [loading, setLoading] = useState(true);

    const [authState, setAuthState] = useState({
        isAuthenticated: false,
        mode: null, // 'login' or 'guest'
        token: null,
        guestName: null,
        user: null
    });

    // Load auth state from localStorage on mount and verify token
    useEffect(() => {
        const verifyToken = async (token) => {
            try {
                const response = await fetch('http://localhost:8000/api/user/manageuser/', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    console.log('Token invalid, logging out');
                    localStorage.removeItem('eco2_auth');
                    setAuthState({
                        isAuthenticated: false,
                        mode: null,
                        token: null,
                        guestName: null,
                        user: null
                    });
                }
            } catch (error) {
                console.error('Token verification failed:', error);
                localStorage.removeItem('eco2_auth');
                setAuthState({
                    isAuthenticated: false,
                    mode: null,
                    token: null,
                    guestName: null,
                    user: null
                });
            } finally {
                setLoading(false);
            }
        };

        const savedAuth = localStorage.getItem('eco2_auth');
        if (savedAuth) {
            try {
                const parsed = JSON.parse(savedAuth);
                setAuthState(parsed);

                // Verify token if logged in
                if (parsed.token && parsed.mode === 'login') {
                    verifyToken(parsed.token);
                } else {
                    setLoading(false);
                }
            } catch (error) {
                console.error('Failed to parse saved auth state:', error);
                localStorage.removeItem('eco2_auth');
                setLoading(false);
            }
        } else {
            setLoading(false);
        }
    }, []);

    // Save auth state to localStorage only for logged-in users, NOT guest mode
    useEffect(() => {
        if (authState.isAuthenticated && authState.mode === 'login') {
            // Only persist logged-in users with tokens
            localStorage.setItem('eco2_auth', JSON.stringify(authState));
        } else {
            // Guest mode or logged out - don't persist
            localStorage.removeItem('eco2_auth');
        }
    }, [authState]);

    const login = (token, user) => {
        console.log("AuthContext: login called", { token, user });
        setAuthState({
            isAuthenticated: true,
            mode: 'login',
            token,
            guestName: null,
            user
        });
        console.log("AuthContext: authState updated");
    };

    const guestMode = (guestName) => {
        setAuthState({
            isAuthenticated: true,
            mode: 'guest',
            token: null,
            guestName,
            user: null
        });
    };

    const logout = () => {
        setAuthState({
            isAuthenticated: false,
            mode: null,
            token: null,
            guestName: null,
            user: null
        });
        localStorage.removeItem('eco2_auth');
    };

    const value = {
        ...authState,
        loading,
        login,
        guestMode,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
