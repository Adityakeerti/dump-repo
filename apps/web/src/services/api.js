import axios from 'axios'
import { getCurrentToken } from '../utils/authStorage'

// Use relative URL - Vite proxy will route /api to backend
const API_BASE_URL = '/api'

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
})

// Add token to requests if available
// Uses context-aware token retrieval (student vs management based on URL)
api.interceptors.request.use(
    (config) => {
        const token = getCurrentToken()
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
        return config
    },
    (error) => Promise.reject(error)
)

// Add response interceptor to handle 401/403 errors globally
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Token expired or invalid - clear auth and redirect to login
            const currentPath = window.location.pathname
            if (currentPath.includes('/management')) {
                localStorage.removeItem('management_token')
                localStorage.removeItem('management_user')
                localStorage.removeItem('management_sessionId')
                window.location.href = '/management/login'
            } else {
                localStorage.removeItem('student_token')
                localStorage.removeItem('student_user')
                localStorage.removeItem('student_sessionId')
                window.location.href = '/student/login'
            }
        }
        return Promise.reject(error)
    }
)

export const authAPI = {
    login: async (usernameOrEmail, password) => {
        const response = await api.post('/auth/login', {
            usernameOrEmail,
            password,
        })
        return response.data
    },

    signup: async (userData) => {
        const response = await api.post('/auth/signup', userData)
        return response.data
    },

    healthCheck: async () => {
        const response = await api.get('/auth/health')
        return response.data
    },
}

export default api
