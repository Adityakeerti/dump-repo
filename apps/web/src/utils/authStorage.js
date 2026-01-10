/**
 * Auth Storage Utility
 * Provides role-specific localStorage keys to prevent session conflicts
 * when multiple users (student, librarian, admin) are logged in simultaneously.
 * Now includes persistent session management with backend validation.
 */

const STORAGE_KEYS = {
    student: {
        token: 'student_token',
        user: 'student_user',
        sessionId: 'student_sessionId'
    },
    management: {
        token: 'management_token',
        user: 'management_user',
        sessionId: 'management_sessionId'
    }
};

/**
 * Get the appropriate storage key based on context
 */
export const getStorageKey = (context, type) => {
    if (!STORAGE_KEYS[context] || !STORAGE_KEYS[context][type]) {
        console.warn(`Unknown storage key: ${context}.${type}`);
        return `${context}_${type}`;
    }
    return STORAGE_KEYS[context][type];
};

/**
 * Store auth data for a specific context (includes sessionId)
 */
export const setAuth = (context, token, user, sessionId = null) => {
    localStorage.setItem(getStorageKey(context, 'token'), token);
    localStorage.setItem(getStorageKey(context, 'user'), JSON.stringify(user));
    if (sessionId) {
        localStorage.setItem(getStorageKey(context, 'sessionId'), sessionId);
    }
};

/**
 * Get auth data for a specific context
 */
export const getAuth = (context) => {
    const token = localStorage.getItem(getStorageKey(context, 'token'));
    const userStr = localStorage.getItem(getStorageKey(context, 'user'));
    const sessionId = localStorage.getItem(getStorageKey(context, 'sessionId'));

    let user = null;
    if (userStr) {
        try {
            user = JSON.parse(userStr);
        } catch (e) {
            console.error('Failed to parse user data:', e);
        }
    }

    return { token, user, sessionId };
};

/**
 * Check if user is authenticated for a specific context
 */
export const isAuthenticated = (context) => {
    const { token, user } = getAuth(context);
    return !!token && !!user;
};

/**
 * Clear auth data for a specific context
 */
export const clearAuth = (context) => {
    localStorage.removeItem(getStorageKey(context, 'token'));
    localStorage.removeItem(getStorageKey(context, 'user'));
    localStorage.removeItem(getStorageKey(context, 'sessionId'));
};

/**
 * Clear all auth data (logout from everything)
 */
export const clearAllAuth = () => {
    clearAuth('student');
    clearAuth('management');
};

/**
 * Detect context from current URL
 */
export const getCurrentContext = () => {
    const path = window.location.pathname;
    if (path.includes('/student')) return 'student';
    if (path.includes('/management')) return 'management';
    return 'student';
};

/**
 * Get current user's token based on URL context
 */
export const getCurrentToken = () => {
    return getAuth(getCurrentContext()).token;
};

/**
 * Get current user based on URL context
 */
export const getCurrentUser = () => {
    return getAuth(getCurrentContext()).user;
};

/**
 * Get the correct dashboard URL based on active auth
 * Checks management first (since shared pages are used by both)
 */
export const getDashboardUrl = () => {
    const managementAuth = getAuth('management');
    if (managementAuth.token && managementAuth.user) {
        return '/management/dashboard';
    }
    return '/student/dashboard';
};

/**
 * Validate session with backend and restore auth if valid
 * Call this on app initialization to persist sessions across refreshes
 */
export const validateAndRestoreSession = async (context) => {
    const { sessionId } = getAuth(context);

    if (!sessionId) {
        return { valid: false, reason: 'no_session' };
    }

    try {
        const response = await fetch('/api/auth/validate-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId })
        });

        const data = await response.json();

        if (data.valid) {
            // Restore/update auth data from server
            setAuth(context, data.token, data.user, data.sessionId);
            return { valid: true, user: data.user };
        } else {
            // Session invalid, clear local data
            clearAuth(context);
            return { valid: false, reason: data.error || 'invalid_session' };
        }
    } catch (error) {
        console.error('Session validation failed:', error);
        // On network error, keep existing session (offline support)
        const { token, user } = getAuth(context);
        if (token && user) {
            return { valid: true, user, offline: true };
        }
        return { valid: false, reason: 'network_error' };
    }
};

/**
 * Logout and invalidate session on backend
 */
export const logout = async (context) => {
    const { sessionId, token } = getAuth(context);

    if (sessionId) {
        try {
            const response = await fetch('/api/auth/logout', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : undefined
                },
                body: JSON.stringify({ sessionId })
            });
            
            if (!response.ok) {
                console.warn('Logout API call returned non-OK status:', response.status);
            }
        } catch (error) {
            console.error('Logout API call failed:', error);
            // Continue with local logout even if API call fails
        }
    }

    // Always clear local auth data, even if API call fails
    clearAuth(context);
    
    // Also clear all other auth contexts to prevent cross-contamination
    clearAllAuth();
};

export default {
    setAuth,
    getAuth,
    isAuthenticated,
    clearAuth,
    clearAllAuth,
    getCurrentContext,
    getCurrentToken,
    getCurrentUser,
    getStorageKey,
    validateAndRestoreSession,
    logout
};
