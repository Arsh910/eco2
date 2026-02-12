import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PublicRoute = ({ children }) => {
    const { isAuthenticated, mode } = useAuth();

    // If authenticated and in login mode (not guest), redirect to home
    // Guests can also be redirected if desired, but request specifically mentioned "logged in"
    if (isAuthenticated && mode === 'login') {
        return <Navigate to="/" replace />;
    }

    return children;
};

export default PublicRoute;
