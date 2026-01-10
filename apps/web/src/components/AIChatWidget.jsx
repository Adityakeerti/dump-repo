import React, { useState, useEffect, useRef } from 'react';
import { Bot, X, Send, Sparkles, Loader2, ChevronDown } from 'lucide-react';
import { getCurrentToken, getCurrentUser } from '../utils/authStorage';

// Use proxy-based API URL (configured in vite.config.js)
// This avoids CORS issues and hardcoded ports
const AI_API_BASE = '/agent-api';

const AIChatWidget = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'chatbot', content: 'Hi! I\'m your Campus AI Assistant. Ask me anything about academics, library, schedules, or campus services!' }
    ]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState('connected'); // 'connected', 'disconnected', 'error'
    const [currentUserInfo, setCurrentUserInfo] = useState(null);
    const [currentToken, setCurrentToken] = useState(null);
    const messagesEndRef = useRef(null);

    // Get user from localStorage - always get fresh data
    const getUserInfo = () => {
        // Check management user first
        const managementUser = localStorage.getItem('management_user');
        if (managementUser) {
            const parsed = JSON.parse(managementUser);
            return {
                userId: parsed.id || parsed.userId || `mgmt_${parsed.email}`,
                role: parsed.managementRole || parsed.role || 'MANAGEMENT',
                email: parsed.email,
                name: parsed.fullName || parsed.username
            };
        }
        // Check student user (using correct key)
        const studentUser = localStorage.getItem('student_user') || localStorage.getItem('user');
        if (studentUser) {
            const parsed = JSON.parse(studentUser);
            return {
                userId: parsed.id || parsed.userId || parsed.email,
                role: 'STUDENT',
                email: parsed.email,
                name: parsed.fullName || parsed.username,
                studentId: parsed.studentId || parsed.collegeRollNumber
            };
        }
        return { userId: 'anonymous', role: 'GUEST' };
    };

    // Get token from both contexts - always get fresh token
    const getToken = () => {
        // Try management token first
        const mgmtToken = localStorage.getItem('management_token');
        if (mgmtToken) return mgmtToken;

        // Try student token
        const studentToken = localStorage.getItem('student_token');
        if (studentToken) return studentToken;

        // Fallback to legacy 'token' key
        return localStorage.getItem('token');
    };

    // Update user info and token when component mounts or when storage changes
    useEffect(() => {
        let previousEmail = null;

        const updateUserInfo = () => {
            const userInfo = getUserInfo();
            const token = getToken();

            // Clear messages if user changed (different email)
            if (previousEmail && previousEmail !== userInfo.email) {
                setMessages([
                    { role: 'chatbot', content: 'Hi! I\'m your Campus AI Assistant. Ask me anything about academics, library, schedules, or campus services!' }
                ]);
            }

            previousEmail = userInfo.email;
            setCurrentUserInfo(userInfo);
            setCurrentToken(token);
        };

        updateUserInfo();

        // Listen for storage changes (when user logs in/out)
        const handleStorageChange = () => {
            updateUserInfo();
        };

        window.addEventListener('storage', handleStorageChange);

        // Also check periodically (in case of same-window logout/login)
        const interval = setInterval(updateUserInfo, 2000);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            clearInterval(interval);
        };
    }, []);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const sendMessage = async () => {
        if (!inputMessage.trim() || isLoading) return;

        const userMessage = inputMessage.trim();
        setInputMessage('');
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setIsLoading(true);

        try {
            // Always get fresh user info and token (don't use cached state)
            const userInfo = getUserInfo();
            const token = getToken();

            // Debug logging
            console.log('AI Chat - User Info:', {
                userId: userInfo.userId,
                role: userInfo.role,
                email: userInfo.email,
                hasToken: !!token,
                tokenPreview: token ? `${token.substring(0, 20)}...` : 'none'
            });

            // Update state
            setCurrentUserInfo(userInfo);
            setCurrentToken(token);

            // Build headers WITHOUT Authorization
            // Agent1 now trusts the user_context we send in the body
            const headers = { 'Content-Type': 'application/json' };

            const response = await fetch(`${AI_API_BASE}/chat/`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    message: userMessage,
                    user_context: {
                        role: userInfo.role,
                        email: userInfo.email,
                        name: userInfo.name,
                        studentId: userInfo.studentId
                    }
                })
            });

            if (response.ok) {
                const data = await response.json();
                setConnectionStatus('connected');
                setMessages(prev => [...prev, {
                    role: 'chatbot',
                    content: data.message,
                    ragUsed: data.rag_used
                }]);
            } else {
                const errorData = await response.json().catch(() => ({ detail: response.statusText }));
                console.error('AI Chat error:', response.status, errorData);
                setConnectionStatus('error');

                let errorMessage = '❌ Sorry, I encountered an error. Please try again.';
                if (response.status === 401) {
                    errorMessage = '🔒 ' + (errorData.detail || 'Your session has expired. Please log in again.');
                } else if (response.status === 403) {
                    errorMessage = '⛔ You do not have permission to use this feature.';
                } else if (response.status === 500) {
                    errorMessage = '⚠️ Server error. The AI service may be temporarily unavailable.';
                }
                setMessages(prev => [...prev, {
                    role: 'chatbot',
                    content: errorMessage,
                    isError: true
                }]);
            }
        } catch (error) {
            console.error('AI Chat error:', error);
            setConnectionStatus('disconnected');
            setMessages(prev => [...prev, {
                role: 'chatbot',
                content: '🔌 Unable to connect to AI service. Please ensure:\n• Agent1 backend is running on port 8001\n• You have a stable internet connection\n• Try refreshing the page',
                isError: true
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    if (!isOpen) {
        // Floating button
        return (
            <button
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('AI Chat button clicked');
                    setIsOpen(true);
                }}
                className="fixed bottom-6 right-6 z-[9999] w-14 h-14 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center group hover:scale-110 cursor-pointer"
                title="Open AI Assistant"
                type="button"
            >
                <Bot className="text-white" size={28} />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white animate-pulse"></span>
            </button>
        );
    }

    return (
        <div className={`fixed z-[9999] transition-all ${isMinimized ? 'bottom-6 right-6' : 'bottom-6 right-6 w-96 h-[500px]'}`}>
            {isMinimized ? (
                // Minimized state
                <button
                    onClick={() => setIsMinimized(false)}
                    className="w-14 h-14 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
                >
                    <Bot className="text-white" size={28} />
                </button>
            ) : (
                // Full chat window
                <div className="bg-white rounded-2xl shadow-2xl flex flex-col h-full overflow-hidden border border-gray-200">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                                <Sparkles className="text-white" size={20} />
                            </div>
                            <div>
                                <h3 className="text-white font-semibold flex items-center gap-2">
                                    Campus AI
                                    <span className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-green-400' :
                                        connectionStatus === 'disconnected' ? 'bg-red-400' :
                                            'bg-yellow-400'
                                        }`} title={connectionStatus}></span>
                                </h3>
                                <p className="text-white/70 text-xs">Powered by Gemini</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setIsMinimized(true)}
                                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                                title="Minimize"
                            >
                                <ChevronDown className="text-white" size={20} />
                            </button>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                                title="Close"
                            >
                                <X className="text-white" size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                        {messages.map((msg, idx) => (
                            <div
                                key={idx}
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[80%] p-3 rounded-2xl ${msg.role === 'user'
                                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-br-sm'
                                        : msg.isError
                                            ? 'bg-red-50 text-red-700 border border-red-200 rounded-bl-sm'
                                            : 'bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-sm'
                                        }`}
                                >
                                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                    {msg.ragUsed && (
                                        <p className="text-xs mt-2 opacity-60 flex items-center gap-1">
                                            <Sparkles size={12} /> Context-enhanced response
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-white p-3 rounded-2xl rounded-bl-sm shadow-sm border border-gray-100">
                                    <Loader2 className="animate-spin text-purple-600" size={20} />
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="p-4 bg-white border-t border-gray-100">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={inputMessage}
                                onChange={(e) => setInputMessage(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Ask anything..."
                                className="flex-1 px-4 py-2.5 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                                disabled={isLoading}
                            />
                            <button
                                onClick={sendMessage}
                                disabled={!inputMessage.trim() || isLoading}
                                className="p-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
                            >
                                <Send size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AIChatWidget;
