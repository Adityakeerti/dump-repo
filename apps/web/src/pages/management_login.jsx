import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authAPI } from '../services/api'
import { setAuth } from '../utils/authStorage'
import './management_login.css'

// Role mapping to DB ENUM
const ROLE_OPTIONS = [
    { id: 'ADMIN', name: 'Registrar', icon: '👔', description: 'Top-level authority' },
    { id: 'MODERATOR', name: 'ERP Admin', icon: '⚙️', description: 'Operational admin' },
    { id: 'FACULTY', name: 'Teacher', icon: '📚', description: 'Academic staff' },
    { id: 'LIBRARIAN', name: 'Librarian', icon: '📖', description: 'Library staff' },
]

const ManagementLogin = ({ setIsAuthenticated }) => {
    const [isLoginMode, setIsLoginMode] = useState(true)
    const [selectedRole, setSelectedRole] = useState('FACULTY')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const navigate = useNavigate()

    const [loginData, setLoginData] = useState({
        usernameOrEmail: '',
        password: '',
    })

    const [signupData, setSignupData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        fullName: '',
        employeeId: '',
        phone: '',
    })

    const handleLoginSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const response = await authAPI.login(
                loginData.usernameOrEmail,
                loginData.password
            )

            // Verify role is not STUDENT
            if (response.role === 'STUDENT') {
                setError('Students cannot access the management portal. Please use the student login.')
                setLoading(false)
                return
            }

            // Verify selected role matches the actual database role
            if (response.role !== selectedRole) {
                const roleNames = {
                    ADMIN: 'Registrar',
                    MODERATOR: 'ERP Admin',
                    FACULTY: 'Teacher',
                    LIBRARIAN: 'Librarian'
                }
                setError(`Your account role is "${roleNames[response.role] || response.role}". Please select the correct role.`)
                setLoading(false)
                return
            }

            // Store token and user data with management-specific keys (includes sessionId)
            setAuth('management', response.token, {
                id: response.id,
                username: response.username,
                email: response.email,
                fullName: response.fullName,
                studentId: response.studentId,
                role: response.role,
                managementRole: response.role, // Use actual DB role
            }, response.sessionId)

            setSuccess('Login successful! Redirecting to dashboard...')
            setIsAuthenticated(true)

            setTimeout(() => {
                navigate('/management/dashboard')
            }, 1000)
        } catch (err) {
            setError(err.response?.data?.error || 'Invalid credentials. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const handleSignupSubmit = async (e) => {
        e.preventDefault()
        setError('')

        // Validation
        if (signupData.password !== signupData.confirmPassword) {
            setError('Passwords do not match')
            return
        }

        if (signupData.password.length < 6) {
            setError('Password must be at least 6 characters')
            return
        }

        setLoading(true)

        try {
            // Generate username from email (part before @)
            const generatedUsername = signupData.email.split('@')[0]

            const response = await authAPI.signup({
                username: generatedUsername,
                email: signupData.email,
                password: signupData.password,
                fullName: signupData.fullName,
                studentId: signupData.employeeId, // Using studentId field for employee ID
                phone: signupData.phone || null,
                role: selectedRole, // Pass the selected management role
            })

            // Store token and user data with management-specific keys (includes sessionId)
            setAuth('management', response.token, {
                id: response.id,
                username: response.username,
                email: response.email,
                fullName: response.fullName,
                studentId: response.studentId,
                role: response.role,
                managementRole: selectedRole,
            }, response.sessionId)

            setSuccess('Account created! Redirecting to dashboard...')
            setIsAuthenticated(true)

            setTimeout(() => {
                navigate('/management/dashboard')
            }, 1000)
        } catch (err) {
            setError(err.response?.data?.error || 'Registration failed. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="management-login-container">
            {/* Left Panel - Branding */}
            <div className="management-branding-panel">
                <div className="management-branding-content">
                    <div className="management-logo-section">
                        <div className="management-logo-icon">
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z" fill="currentColor" />
                            </svg>
                        </div>
                        <h1 className="management-brand-title">Management Portal</h1>
                        <p className="management-brand-subtitle">Campus Intelligence Administration</p>
                    </div>

                    <div className="management-features-section">
                        <div className="management-feature-item">
                            <div className="management-feature-icon">🔐</div>
                            <div className="management-feature-text">
                                <h3>Secure Access</h3>
                                <p>Role-based authentication system</p>
                            </div>
                        </div>
                        <div className="management-feature-item">
                            <div className="management-feature-icon">📊</div>
                            <div className="management-feature-text">
                                <h3>Admin Dashboard</h3>
                                <p>Complete control over campus operations</p>
                            </div>
                        </div>
                        <div className="management-feature-item">
                            <div className="management-feature-icon">⚡</div>
                            <div className="management-feature-text">
                                <h3>Real-time Updates</h3>
                                <p>Instant notifications and alerts</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Panel - Login/Signup Form */}
            <div className="management-form-panel">
                <div className="management-form-container">
                    <div className="management-form-header">
                        <h2>{isLoginMode ? 'Staff Login' : 'Create Staff Account'}</h2>
                        <p className="management-form-subtitle">
                            {isLoginMode ? 'Access your management dashboard' : 'Register for management portal'}
                        </p>
                    </div>

                    {/* Toggle Buttons */}
                    <div style={{
                        display: 'flex',
                        gap: '0.5rem',
                        marginBottom: '1.5rem',
                        background: '#e2e8f0',
                        padding: '0.375rem',
                        borderRadius: '12px'
                    }}>
                        <button
                            style={{
                                flex: 1,
                                padding: '0.75rem 1.5rem',
                                border: 'none',
                                background: isLoginMode ? 'white' : 'transparent',
                                color: isLoginMode ? '#1e293b' : '#475569',
                                fontWeight: 600,
                                fontSize: '0.95rem',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                boxShadow: isLoginMode ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                                transition: 'all 0.3s ease'
                            }}
                            onClick={() => {
                                setIsLoginMode(true)
                                setError('')
                                setSuccess('')
                            }}
                            type="button"
                        >
                            Login
                        </button>
                        <button
                            style={{
                                flex: 1,
                                padding: '0.75rem 1.5rem',
                                border: 'none',
                                background: !isLoginMode ? 'white' : 'transparent',
                                color: !isLoginMode ? '#1e293b' : '#475569',
                                fontWeight: 600,
                                fontSize: '0.95rem',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                boxShadow: !isLoginMode ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                                transition: 'all 0.3s ease'
                            }}
                            onClick={() => {
                                setIsLoginMode(false)
                                setError('')
                                setSuccess('')
                            }}
                            type="button"
                        >
                            Sign Up
                        </button>
                    </div>

                    {/* Role Selector */}
                    <div className="management-role-selector">
                        {ROLE_OPTIONS.map((role) => (
                            <div
                                key={role.id}
                                className={`management-role-option ${selectedRole === role.id ? 'active' : ''}`}
                                onClick={() => setSelectedRole(role.id)}
                            >
                                <div className="role-icon">{role.icon}</div>
                                <div className="role-name">{role.name}</div>
                            </div>
                        ))}
                    </div>

                    {/* Error/Success Messages */}
                    {error && (
                        <div className="management-alert management-alert-error">
                            <span>⚠️</span>
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="management-alert management-alert-success">
                            <span>✓</span>
                            {success}
                        </div>
                    )}

                    {/* Login Form */}
                    {isLoginMode ? (
                        <form onSubmit={handleLoginSubmit}>
                            <div className="management-form-group">
                                <label htmlFor="usernameOrEmail">Email</label>
                                <input
                                    type="text"
                                    id="usernameOrEmail"
                                    value={loginData.usernameOrEmail}
                                    onChange={(e) =>
                                        setLoginData({ ...loginData, usernameOrEmail: e.target.value })
                                    }
                                    placeholder="Enter your email"
                                    required
                                />
                            </div>

                            <div className="management-form-group">
                                <label htmlFor="password">Password</label>
                                <input
                                    type="password"
                                    id="password"
                                    value={loginData.password}
                                    onChange={(e) =>
                                        setLoginData({ ...loginData, password: e.target.value })
                                    }
                                    placeholder="Enter your password"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                className="management-btn-primary"
                                disabled={loading}
                            >
                                {loading ? 'Signing in...' : 'Sign In to Dashboard'}
                            </button>
                        </form>
                    ) : (
                        // Signup Form
                        <form onSubmit={handleSignupSubmit}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div className="management-form-group" style={{ marginBottom: 0 }}>
                                    <label htmlFor="fullName">Full Name *</label>
                                    <input
                                        type="text"
                                        id="fullName"
                                        value={signupData.fullName}
                                        onChange={(e) =>
                                            setSignupData({ ...signupData, fullName: e.target.value })
                                        }
                                        placeholder="John Doe"
                                        required
                                    />
                                </div>

                                <div className="management-form-group" style={{ marginBottom: 0 }}>
                                    <label htmlFor="employeeId">Employee ID *</label>
                                    <input
                                        type="text"
                                        id="employeeId"
                                        value={signupData.employeeId}
                                        onChange={(e) =>
                                            setSignupData({ ...signupData, employeeId: e.target.value })
                                        }
                                        placeholder="EMP2024001"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="management-form-group">
                                <label htmlFor="signupEmail">Email *</label>
                                <input
                                    type="email"
                                    id="signupEmail"
                                    value={signupData.email}
                                    onChange={(e) =>
                                        setSignupData({ ...signupData, email: e.target.value })
                                    }
                                    placeholder="john@university.edu"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div className="management-form-group" style={{ marginBottom: 0 }}>
                                    <label htmlFor="signupPassword">Password *</label>
                                    <input
                                        type="password"
                                        id="signupPassword"
                                        value={signupData.password}
                                        onChange={(e) =>
                                            setSignupData({ ...signupData, password: e.target.value })
                                        }
                                        placeholder="Min. 6 characters"
                                        required
                                        minLength={6}
                                    />
                                </div>

                                <div className="management-form-group" style={{ marginBottom: 0 }}>
                                    <label htmlFor="confirmPassword">Confirm Password *</label>
                                    <input
                                        type="password"
                                        id="confirmPassword"
                                        value={signupData.confirmPassword}
                                        onChange={(e) =>
                                            setSignupData({ ...signupData, confirmPassword: e.target.value })
                                        }
                                        placeholder="Re-enter password"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="management-form-group">
                                <label htmlFor="phone">Phone Number</label>
                                <input
                                    type="tel"
                                    id="phone"
                                    value={signupData.phone}
                                    onChange={(e) =>
                                        setSignupData({ ...signupData, phone: e.target.value })
                                    }
                                    placeholder="+1 (555) 123-4567"
                                />
                            </div>

                            <button
                                type="submit"
                                className="management-btn-primary"
                                disabled={loading}
                            >
                                {loading ? 'Creating Account...' : 'Create Staff Account'}
                            </button>
                        </form>
                    )}

                    <div className="management-form-footer">
                        <p className="management-footer-text">
                            © 2024 Campus Intelligence System. All rights reserved.
                        </p>
                        <a href="/student/login" className="management-footer-link">
                            ← Back to Student Portal
                        </a>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ManagementLogin
