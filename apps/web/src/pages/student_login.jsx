import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authAPI } from '../services/api'
import { setAuth } from '../utils/authStorage'
import './student_login.css'

const StudentLogin = ({ setIsAuthenticated }) => {
    const [isLoginMode, setIsLoginMode] = useState(true)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const navigate = useNavigate()

    // Login form state
    const [loginData, setLoginData] = useState({
        usernameOrEmail: '',
        password: '',
    })

    // Signup form state
    const [signupData, setSignupData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        fullName: '',
        studentId: '',
        phone: '',
        department: '',
        semester: '',
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

            // Store token and user data with student-specific keys (includes sessionId)
            setAuth('student', response.token, {
                id: response.id,
                username: response.username,
                email: response.email,
                fullName: response.fullName,
                studentId: response.studentId,
                role: response.role,
            }, response.sessionId)

            setSuccess('Login successful! Redirecting...')
            setIsAuthenticated(true)

            setTimeout(() => {
                navigate('/student/dashboard')
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
                studentId: signupData.studentId,
                phone: signupData.phone || null,
                department: signupData.department || null,
                semester: signupData.semester || null,
            })

            // Store token and user data with student-specific keys (includes sessionId)
            setAuth('student', response.token, {
                id: response.id,
                username: response.username,
                email: response.email,
                fullName: response.fullName,
                studentId: response.studentId,
                role: response.role,
            }, response.sessionId)

            setSuccess('Registration successful! Redirecting...')
            setIsAuthenticated(true)

            setTimeout(() => {
                navigate('/student/dashboard')
            }, 1000)
        } catch (err) {
            setError(err.response?.data?.error || 'Registration failed. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="login-container">
            {/* Left Panel - Branding */}
            <div className="branding-panel">
                <div className="branding-content">
                    <div className="logo-section">
                        <div className="logo-icon">
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 3L1 9L12 15L21 10.09V17H23V9M5 13.18V17.18L12 21L19 17.18V13.18L12 17L5 13.18Z" fill="currentColor" />
                            </svg>
                        </div>
                        <h1 className="brand-title">Campus Intelligence</h1>
                        <p className="brand-subtitle">Unified Student Management System</p>
                    </div>

                    <div className="features-section">
                        <div className="feature-item">
                            <div className="feature-icon">✓</div>
                            <div className="feature-text">
                                <h3>Secure Access</h3>
                                <p>Enterprise-grade authentication</p>
                            </div>
                        </div>
                        <div className="feature-item">
                            <div className="feature-icon">✓</div>
                            <div className="feature-text">
                                <h3>Real-time Updates</h3>
                                <p>Instant notifications and alerts</p>
                            </div>
                        </div>
                        <div className="feature-item">
                            <div className="feature-icon">✓</div>
                            <div className="feature-text">
                                <h3>Comprehensive Tools</h3>
                                <p>Library, attendance, and academics</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Panel - Forms */}
            <div className="form-panel">
                <div className="form-container">
                    <div className="form-header">
                        <h2>{isLoginMode ? 'Student Login' : 'Create Account'}</h2>
                        <p className="form-subtitle">
                            {isLoginMode
                                ? 'Access your student portal'
                                : 'Register for the student portal'}
                        </p>
                    </div>

                    {/* Toggle Buttons */}
                    <div className="flex gap-2 mb-8 bg-slate-100 p-1.5 rounded-xl">
                        <button
                            className={`flex-1 py-3 rounded-lg font-semibold text-[0.95rem] transition-all duration-300
                            ${isLoginMode
                                    ? 'bg-white text-blue-900 shadow-sm'
                                    : 'bg-transparent text-slate-500 hover:text-blue-900'}`}
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
                            className={`flex-1 py-3 rounded-lg font-semibold text-[0.95rem] transition-all duration-300
                            ${!isLoginMode
                                    ? 'bg-white text-blue-900 shadow-sm'
                                    : 'bg-transparent text-slate-500 hover:text-blue-900'}`}
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

                    {/* Error/Success Messages */}
                    {error && <div className="p-4 rounded-lg mb-6 text-sm font-medium bg-red-100 text-red-800 border border-red-200">{error}</div>}
                    {success && <div className="p-4 rounded-lg mb-6 text-sm font-medium bg-green-100 text-green-800 border border-green-200">{success}</div>}

                    {/* Login Form */}
                    {isLoginMode ? (
                        <form onSubmit={handleLoginSubmit} className="flex flex-col gap-6">
                            <div className="flex flex-col gap-2">
                                <label htmlFor="usernameOrEmail" className="text-sm font-semibold text-slate-700">Username or Email</label>
                                <input
                                    type="text"
                                    id="usernameOrEmail"
                                    value={loginData.usernameOrEmail}
                                    onChange={(e) =>
                                        setLoginData({ ...loginData, usernameOrEmail: e.target.value })
                                    }
                                    className="p-3.5 border-2 border-slate-200 rounded-lg text-base transition-all focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                                    placeholder="Enter your username or email"
                                    required
                                />
                            </div>

                            <div className="flex flex-col gap-2">
                                <label htmlFor="password" className="text-sm font-semibold text-slate-700">Password</label>
                                <input
                                    type="password"
                                    id="password"
                                    value={loginData.password}
                                    onChange={(e) =>
                                        setLoginData({ ...loginData, password: e.target.value })
                                    }
                                    className="p-3.5 border-2 border-slate-200 rounded-lg text-base transition-all focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                                    placeholder="Enter your password"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full py-4 mt-2 bg-gradient-to-br from-blue-900 to-blue-600 text-white rounded-lg font-semibold text-base shadow-lg hover:shadow-blue-900/20 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-300"
                                disabled={loading}
                            >
                                {loading ? 'Signing in...' : 'Sign In'}
                            </button>
                        </form>
                    ) : (
                        // Signup Form
                        <form onSubmit={handleSignupSubmit} className="flex flex-col gap-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex flex-col gap-2">
                                    <label htmlFor="fullName" className="text-sm font-semibold text-slate-700">Full Name *</label>
                                    <input
                                        type="text"
                                        id="fullName"
                                        value={signupData.fullName}
                                        onChange={(e) =>
                                            setSignupData({ ...signupData, fullName: e.target.value })
                                        }
                                        className="p-3.5 border-2 border-slate-200 rounded-lg text-base transition-all focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                                        placeholder="John Doe"
                                        required
                                    />
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label htmlFor="studentId" className="text-sm font-semibold text-slate-700">Student ID *</label>
                                    <input
                                        type="text"
                                        id="studentId"
                                        value={signupData.studentId}
                                        onChange={(e) =>
                                            setSignupData({ ...signupData, studentId: e.target.value })
                                        }
                                        className="p-3.5 border-2 border-slate-200 rounded-lg text-base transition-all focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                                        placeholder="STU2024001"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col gap-2">
                                <label htmlFor="email" className="text-sm font-semibold text-slate-700">Email *</label>
                                <input
                                    type="email"
                                    id="email"
                                    value={signupData.email}
                                    onChange={(e) =>
                                        setSignupData({ ...signupData, email: e.target.value })
                                    }
                                    className="p-3.5 border-2 border-slate-200 rounded-lg text-base transition-all focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                                    placeholder="john@university.edu"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex flex-col gap-2">
                                    <label htmlFor="signupPassword" className="text-sm font-semibold text-slate-700">Password *</label>
                                    <input
                                        type="password"
                                        id="signupPassword"
                                        value={signupData.password}
                                        onChange={(e) =>
                                            setSignupData({ ...signupData, password: e.target.value })
                                        }
                                        className="p-3.5 border-2 border-slate-200 rounded-lg text-base transition-all focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                                        placeholder="Min. 6 characters"
                                        required
                                        minLength={6}
                                    />
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label htmlFor="confirmPassword" className="text-sm font-semibold text-slate-700">Confirm Password *</label>
                                    <input
                                        type="password"
                                        id="confirmPassword"
                                        value={signupData.confirmPassword}
                                        onChange={(e) =>
                                            setSignupData({ ...signupData, confirmPassword: e.target.value })
                                        }
                                        className="p-3.5 border-2 border-slate-200 rounded-lg text-base transition-all focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                                        placeholder="Re-enter password"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex flex-col gap-2">
                                    <label htmlFor="department" className="text-sm font-semibold text-slate-700">Department</label>
                                    <input
                                        type="text"
                                        id="department"
                                        value={signupData.department}
                                        onChange={(e) =>
                                            setSignupData({ ...signupData, department: e.target.value })
                                        }
                                        className="p-3.5 border-2 border-slate-200 rounded-lg text-base transition-all focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                                        placeholder="Computer Science"
                                    />
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label htmlFor="semester" className="text-sm font-semibold text-slate-700">Semester</label>
                                    <input
                                        type="text"
                                        id="semester"
                                        value={signupData.semester}
                                        onChange={(e) =>
                                            setSignupData({ ...signupData, semester: e.target.value })
                                        }
                                        className="p-3.5 border-2 border-slate-200 rounded-lg text-base transition-all focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                                        placeholder="5"
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col gap-2">
                                <label htmlFor="phone" className="text-sm font-semibold text-slate-700">Phone Number</label>
                                <input
                                    type="tel"
                                    id="phone"
                                    value={signupData.phone}
                                    onChange={(e) =>
                                        setSignupData({ ...signupData, phone: e.target.value })
                                    }
                                    className="p-3.5 border-2 border-slate-200 rounded-lg text-base transition-all focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                                    placeholder="+1 (555) 123-4567"
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full py-4 mt-2 bg-gradient-to-br from-blue-900 to-blue-600 text-white rounded-lg font-semibold text-base shadow-lg hover:shadow-blue-900/20 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-300"
                                disabled={loading}
                            >
                                {loading ? 'Creating Account...' : 'Create Account'}
                            </button>
                        </form>
                    )}

                    <div className="form-footer">
                        <p className="footer-text">
                            © 2024 Campus Intelligence System. All rights reserved.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default StudentLogin
