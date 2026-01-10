import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { getAuth, validateAndRestoreSession } from '../utils/authStorage';

// Role hierarchy - higher number = more permissions
const ROLE_HIERARCHY = {
    ADMIN: 4,      // Registrar
    MODERATOR: 3,  // ERP Admin
    FACULTY: 2,    // Teacher
    LIBRARIAN: 1,  // Librarian
    STUDENT: 0     // Not allowed
};

/**
 * Protected route component for management pages
 * Validates session with backend on mount for persistent login
 */
const ProtectedManagementRoute = ({
    children,
    allowedRoles = ['ADMIN', 'MODERATOR', 'FACULTY', 'LIBRARIAN'],
    minimumLevel = 1
}) => {
    const [isValidating, setIsValidating] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState(null);

    useEffect(() => {
        const validateSession = async () => {
            // First check localStorage
            const auth = getAuth('management');

            if (!auth.token || !auth.user) {
                setIsAuthenticated(false);
                setIsValidating(false);
                return;
            }

            // If we have sessionId, validate with backend
            if (auth.sessionId) {
                const result = await validateAndRestoreSession('management');
                if (result.valid) {
                    setUser(result.user);
                    setIsAuthenticated(true);
                } else {
                    setIsAuthenticated(false);
                }
            } else {
                // Legacy session without sessionId - accept it
                setUser(auth.user);
                setIsAuthenticated(true);
            }

            setIsValidating(false);
        };

        validateSession();
    }, []);

    // Show loading while validating
    if (isValidating) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'
            }}>
                <div style={{ color: 'white', fontSize: '1.2rem' }}>Loading...</div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/management/login" replace />;
    }

    if (!user) {
        return <Navigate to="/management/login" replace />;
    }

    const userRole = user.role || 'STUDENT';
    const userLevel = ROLE_HIERARCHY[userRole] ?? 0;

    // Check if user is a student (not allowed in management portal)
    if (userRole === 'STUDENT' || userLevel === 0) {
        return <Navigate to="/student/login" replace />;
    }

    // Check role level
    if (userLevel < minimumLevel) {
        return <Navigate to="/management/dashboard" replace />;
    }

    // Check specific allowed roles
    if (!allowedRoles.includes(userRole)) {
        return <Navigate to="/management/dashboard" replace />;
    }

    // User is authorized
    return children;
};

export default ProtectedManagementRoute;
