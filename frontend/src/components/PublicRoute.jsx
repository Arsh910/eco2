import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PublicRoute = ({ children }) => {
    const { isAuthenticated, mode, loading } = useAuth();

    if (loading) {
        return null; // Or a spinner
    }

    // If authenticated and in login mode (not guest), redirect to home
    if (isAuthenticated && mode === 'login') {
        return <Navigate to="/" replace />;
    }

    return children;
};

export default PublicRoute;
