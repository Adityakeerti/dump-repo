import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { getAuth, validateAndRestoreSession } from '../utils/authStorage';

/**
 * Protected route component for student pages
 * Uses student-specific localStorage keys and validates session on mount
 */
const ProtectedStudentRoute = ({ children }) => {
    const [isValidating, setIsValidating] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        const validateSession = async () => {
            // First check localStorage
            const { token, user, sessionId } = getAuth('student');

            if (!token || !user) {
                setIsAuthenticated(false);
                setIsValidating(false);
                return;
            }

            // If we have sessionId, validate with backend
            if (sessionId) {
                const result = await validateAndRestoreSession('student');
                setIsAuthenticated(result.valid);
            } else {
                // Legacy session without sessionId - accept it
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
                background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a3e 100%)'
            }}>
                <div style={{ color: 'white', fontSize: '1.2rem' }}>Loading...</div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/student/login" replace />;
    }

    return children;
};

export default ProtectedStudentRoute;
