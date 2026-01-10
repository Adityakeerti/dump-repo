import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { getAuth, validateAndRestoreSession } from '../utils/authStorage';

/**
 * Protected route component that allows BOTH student and management users
 * Use this for shared pages like Groups, Messages, Meetings, Library
 */
const ProtectedRoute = ({ children }) => {
    const [isValidating, setIsValidating] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [authContext, setAuthContext] = useState(null); // 'student' or 'management'

    useEffect(() => {
        const validateSession = async () => {
            // Try student auth first
            const studentAuth = getAuth('student');
            if (studentAuth.token && studentAuth.user) {
                if (studentAuth.sessionId) {
                    const result = await validateAndRestoreSession('student');
                    if (result.valid) {
                        setIsAuthenticated(true);
                        setAuthContext('student');
                        setIsValidating(false);
                        return;
                    }
                } else {
                    // Legacy session without sessionId
                    setIsAuthenticated(true);
                    setAuthContext('student');
                    setIsValidating(false);
                    return;
                }
            }

            // Try management auth
            const managementAuth = getAuth('management');
            if (managementAuth.token && managementAuth.user) {
                if (managementAuth.sessionId) {
                    const result = await validateAndRestoreSession('management');
                    if (result.valid) {
                        setIsAuthenticated(true);
                        setAuthContext('management');
                        setIsValidating(false);
                        return;
                    }
                } else {
                    // Legacy session without sessionId
                    setIsAuthenticated(true);
                    setAuthContext('management');
                    setIsValidating(false);
                    return;
                }
            }

            // No valid auth found
            setIsAuthenticated(false);
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
        // Redirect to student login by default (most common)
        return <Navigate to="/student/login" replace />;
    }

    return children;
};

export default ProtectedRoute;
