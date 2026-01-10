import React, { useState, useEffect, useRef } from 'react';
import {
    MessageSquare,
    Search,
    MoreVertical,
    Send,
    Paperclip,
    Smile,
    UserPlus,
    Check,
    X,
    Users,
    Menu,
    ArrowLeft
} from 'lucide-react';
import SockJS from 'sockjs-client';
import Stomp from 'stompjs';
import { useNavigate } from 'react-router-dom';
import { getDashboardUrl, getCurrentUser } from '../utils/authStorage';

// Smart protocol detection: Use proxy on HTTPS, direct on HTTP
const isHttps = window.location.protocol === 'https:';
const CHAT_API_BASE = isHttps ? '' : `http://${window.location.hostname}:8083`;
const WS_URL = isHttps ? null : `http://${window.location.hostname}:8083/ws`; // WebSocket only works on HTTP

// ... (Imports assumed stable)

const MessagesPage = () => {
    // User State - using getCurrentUser() from authStorage
    const navigate = useNavigate();
    const [user, setUser] = useState(getCurrentUser() || {});
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // UI selections
    const [tab, setTab] = useState('CHATS'); // CHATS, REQUESTS
    const [replyingTo, setReplyingTo] = useState(null);

    // Data State
    const [activeChat, setActiveChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [stompClient, setStompClient] = useState(null);
    const [connected, setConnected] = useState(false);

    // Social Data
    const [friends, setFriends] = useState([]);
    const [pendingRequests, setPendingRequests] = useState([]);
    const [sentRequests, setSentRequests] = useState([]); // [NEW] Track sent requests
    const [searchResults, setSearchResults] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');

    const messagesEndRef = useRef(null);

    // --- 1. Fetch Initial Data ---
    useEffect(() => {
        if (!user.userId && !user.id) return;
        const userId = user.userId || user.id;
        console.log('[Messages] User ID:', userId);

        const fetchData = async () => {
            try {
                // Fetch Friends
                console.log('[Messages] Fetching friends from:', `${CHAT_API_BASE}/api/friends/${userId}`);
                const fRes = await fetch(`${CHAT_API_BASE}/api/friends/${userId}`);
                if (fRes.ok) {
                    const friendsData = await fRes.json();
                    console.log('[Messages] Fetched friends:', friendsData);
                    setFriends(friendsData);
                } else {
                    console.error('[Messages] Friends fetch failed with status:', fRes.status);
                }

                // Fetch Incoming Requests
                console.log('[Messages] Fetching requests from:', `${CHAT_API_BASE}/api/friends/requests/${userId}`);
                const rRes = await fetch(`${CHAT_API_BASE}/api/friends/requests/${userId}`);
                if (rRes.ok) {
                    const requestsData = await rRes.json();
                    console.log('[Messages] Fetched pending requests:', requestsData);
                    setPendingRequests(requestsData);
                } else {
                    console.error('[Messages] Requests fetch failed with status:', rRes.status);
                }

                // Fetch Sent Requests [NEW]
                console.log('[Messages] Fetching sent requests from:', `${CHAT_API_BASE}/api/friends/sent/${userId}`);
                const sRes = await fetch(`${CHAT_API_BASE}/api/friends/sent/${userId}`);
                if (sRes.ok) {
                    const sentData = await sRes.json();
                    console.log('[Messages] Fetched sent requests:', sentData);
                    setSentRequests(sentData);
                } else {
                    console.error('[Messages] Sent requests fetch failed with status:', sRes.status);
                }

            } catch (error) {
                console.error('[Messages] Fetch error:', error);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 5000); // Polling for updates
        return () => clearInterval(interval);
    }, [user]);

    // --- 2. WebSocket Connection ---
    useEffect(() => {
        const userId = user.userId || user.id;
        if (!userId) return;

        // WebSocket doesn't work on HTTPS without SSL backend - skip if null
        if (!WS_URL) {
            console.warn('[Messages] WebSocket disabled on HTTPS. Real-time chat unavailable. Messages still work via polling.');
            return;
        }

        const socket = new SockJS(WS_URL);
        const client = Stomp.over(socket);
        client.debug = null;

        client.connect({}, () => {
            setConnected(true);
            setStompClient(client);

            client.subscribe(`/topic/private/${userId}`, (payload) => {
                const msg = JSON.parse(payload.body);
                // Only append if it belongs to active chat
                setMessages(prev => {
                    if (activeChat && (
                        (msg.sender?.id === activeChat.id) ||
                        (msg.recipient?.id === activeChat.id) ||
                        (msg.senderId === activeChat.id) ||
                        (msg.recipientId === activeChat.id)
                    )) {
                        return [...prev, msg];
                    }
                    return prev;
                });
            });

            client.send("/app/chat.addUser", {}, JSON.stringify({ id: userId, email: user.email }));
        });

        return () => { if (client && client.connected) client.disconnect(); };
    }, [user, activeChat]);

    // --- 3. Load Chat History ---
    useEffect(() => {
        if (!activeChat) return;

        const loadHistory = async () => {
            setMessages([]);
            const userId = user.userId || user.id;
            try {
                const res = await fetch(`${CHAT_API_BASE}/api/history/private/${userId}/${activeChat.id}`);
                if (res.ok) setMessages(await res.json());
            } catch (e) { console.error(e); }
        };

        loadHistory();
        setReplyingTo(null);
    }, [activeChat]);

    // --- 4. Search ---
    useEffect(() => {
        const t = setTimeout(async () => {
            if (searchQuery.length > 2) {
                const res = await fetch(`${CHAT_API_BASE}/api/users/search?query=${searchQuery}`);
                if (res.ok) setSearchResults(await res.json());
            } else {
                setSearchResults([]);
            }
        }, 500);
        return () => clearTimeout(t);
    }, [searchQuery]);

    // --- Actions ---
    const sendMessage = (e) => {
        e.preventDefault();
        if (!inputMessage.trim() || !stompClient || !activeChat) return;

        const userId = user.userId || user.id;
        const msg = {
            senderId: userId,
            recipientId: activeChat.id,
            content: inputMessage,
            type: 'CHAT',
            replyToId: replyingTo?.id
        };

        stompClient.send("/app/chat.sendPrivateMessage", {}, JSON.stringify(msg));
        setInputMessage('');
        setReplyingTo(null);
    };

    const handleSendRequest = async (receiverId) => {
        const userId = user.userId || user.id;
        await fetch(`${CHAT_API_BASE}/api/friends/add?senderId=${userId}&receiverId=${receiverId}`, { method: 'POST' });
        // Optimistically update
        setSentRequests(prev => [...prev, { receiver: { id: receiverId } }]); // Minimal mock
        setSearchQuery('');
        alert('Request Sent!');
    };

    const handleAcceptRequest = async (reqId) => {
        await fetch(`${CHAT_API_BASE}/api/friends/accept?requestId=${reqId}`, { method: 'POST' });
        // Optimistically remove from pending list
        setPendingRequests(prev => prev.filter(r => r.id !== reqId));
    };

    const handleRejectRequest = async (reqId) => {
        // For now, just remove from local state (backend might not have explicit reject endpoint)
        setPendingRequests(prev => prev.filter(r => r.id !== reqId));
        // If backend has a reject endpoint, add: await fetch(`${CHAT_API_BASE}/api/friends/reject?requestId=${reqId}`, { method: 'POST' });
    };

    // [NEW] Unfriend Action
    const handleRemoveFriend = async (friendId) => {
        if (!confirm("Are you sure you want to remove this connection?")) return;

        const userId = user.userId || user.id;
        try {
            await fetch(`${CHAT_API_BASE}/api/friends/remove?userId=${userId}&friendId=${friendId}`, { method: 'POST' });
            setActiveChat(null);
            setFriends(prev => prev.filter(f => f.id !== friendId)); // Optimistic remove
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, replyingTo]);

    return (
        <div className="flex h-screen bg-gray-50 font-sans overflow-hidden text-gray-800">
            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setSidebarOpen(false)}>
                    <div className="w-64 h-full bg-white p-4 shadow-xl" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="font-bold text-lg text-gray-800">Menu</h2>
                            <button onClick={() => setSidebarOpen(false)}><X size={20} /></button>
                        </div>
                        <nav className="space-y-2">
                            <NavItem icon={<ArrowLeft size={20} />} label="Back to Dashboard" onClick={() => navigate(getDashboardUrl())} />
                            <NavItem icon={<MessageSquare size={20} />} label="Chats" active={tab === 'CHATS'} onClick={() => { setTab('CHATS'); setSidebarOpen(false) }} />
                            <NavItem icon={<UserPlus size={20} />} label={`Requests (${pendingRequests.length})`} active={tab === 'REQUESTS'} onClick={() => { setTab('REQUESTS'); setSidebarOpen(false) }} />
                        </nav>
                    </div>
                </div>
            )}

            {/* Left Sidebar (Desktop) */}
            <div className="hidden md:flex w-80 bg-white border-r border-gray-200 flex-col">
                {/* Header */}
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate(getDashboardUrl())} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
                            <ArrowLeft size={20} />
                        </button>
                        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Messages</h1>
                    </div>
                    <div className="flex bg-gray-100 rounded-lg p-1">
                        <button onClick={() => setTab('CHATS')} className={`p-1.5 rounded-md transition-all ${tab === 'CHATS' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`} title="Chats">
                            <MessageSquare size={18} />
                        </button>
                        <button onClick={() => setTab('REQUESTS')} className={`p-1.5 rounded-md transition-all relative ${tab === 'REQUESTS' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`} title="Requests">
                            <UserPlus size={18} />
                            {pendingRequests.length > 0 && <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border border-white"></span>}
                        </button>
                    </div>
                </div>

                {/* Search */}
                <div className="p-3">
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Find students..."
                            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
                        />
                    </div>
                    {/* Search Results Dropdown */}
                    {searchResults.length > 0 && (
                        <div className="absolute mt-2 w-72 bg-white shadow-xl z-20 rounded-xl border border-gray-100 max-h-60 overflow-y-auto p-1">
                            {searchResults.map(u => {
                                const isFriend = friends.some(f => f.id === u.id);
                                const isSent = sentRequests.some(r => r.receiver.id === u.id);
                                const isMe = u.id === (user.userId || user.id);

                                return (
                                    <div key={u.id} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                                                {u.fullName?.[0] || 'U'}
                                            </div>
                                            <div className="text-sm font-medium text-gray-900">{u.fullName}</div>
                                        </div>
                                        {!isMe && !isFriend && (
                                            isSent ? (
                                                <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-2 py-1 rounded-full">Request Sent</span>
                                            ) : (
                                                <button onClick={() => handleSendRequest(u.id)} className="text-xs bg-blue-50 text-blue-600 font-semibold px-2 py-1 rounded-full hover:bg-blue-100">
                                                    Connect
                                                </button>
                                            )
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Lists */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                    {tab === 'REQUESTS' && (
                        <>
                            <div className="px-2 py-1 text-xs font-bold text-gray-400 uppercase tracking-wider">Pending Requests</div>
                            {pendingRequests.length === 0 && <p className="text-center text-gray-400 text-sm py-8">No matching requests</p>}
                            {pendingRequests.map(req => (
                                <div key={req.id} className="p-3 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center font-bold">
                                            {req.sender.fullName?.[0]}
                                        </div>
                                        <div>
                                            <div className="font-semibold text-gray-900 text-sm">{req.sender.fullName}</div>
                                            <div className="text-xs text-gray-500">Wants to connect</div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleAcceptRequest(req.id)} className="flex-1 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700">Accept</button>
                                        <button onClick={() => handleRejectRequest(req.id)} className="flex-1 py-1.5 bg-gray-100 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-200">Decline</button>
                                    </div>
                                </div>
                            ))}
                        </>
                    )}

                    {tab === 'CHATS' && (
                        <>
                            {friends.length === 0 && <p className="text-center text-gray-400 text-sm py-8">No conversations yet. Search to connect!</p>}
                            {friends.map(u => (
                                <div
                                    key={u.id}
                                    onClick={() => setActiveChat({ id: u.id, name: u.fullName || u.username, type: 'PRIVATE' })}
                                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${activeChat?.id === u.id ? 'bg-blue-50 border border-blue-100 shadow-sm' : 'hover:bg-gray-50'}`}
                                >
                                    <div className="relative">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-600 flex items-center justify-center font-bold">
                                            {(u.fullName || u.username).charAt(0).toUpperCase()}
                                        </div>
                                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-baseline mb-0.5">
                                            <h3 className="font-semibold text-gray-900 text-sm truncate">{u.fullName || u.username}</h3>
                                            <span className="text-[10px] text-gray-400">12:00</span>
                                        </div>
                                        <p className="text-xs text-gray-500 truncate">Tap to chat with {u.fullName?.split(' ')[0]}</p>
                                    </div>
                                </div>
                            ))}
                        </>
                    )}
                </div>
            </div>

            {/* Chat Area */}
            {activeChat ? (
                <div className="flex-1 flex flex-col bg-white relative">

                    {/* Header */}
                    <div className="h-16 border-b border-gray-200 flex items-center justify-between px-6 bg-white z-10">
                        <div className="flex items-center gap-3">
                            <div className="md:hidden" onClick={() => setSidebarOpen(true)}><Menu className="text-gray-500" /></div>
                            <div className="flex flex-col">
                                <span className="font-bold text-gray-900 text-lg">{activeChat.name}</span>
                                <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span> Online
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <button className="text-gray-400 hover:text-gray-600"><Search size={20} /></button>
                            {/* Unfriend Option */}
                            <div className="group relative">
                                <button className="text-gray-400 hover:text-gray-600"><MoreVertical size={20} /></button>
                                <div className="absolute right-0 mt-2 w-48 bg-white shadow-xl rounded-lg border border-gray-100 py-1 hidden group-hover:block z-50">
                                    <button
                                        onClick={() => handleRemoveFriend(activeChat.id)}
                                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                    >
                                        Remove Connection
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 space-y-4">
                        {messages.map((msg, idx) => {
                            const myId = user.userId || user.id;
                            const isMe = (msg.sender?.id === myId) || (msg.senderId === myId);

                            return (
                                <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}>
                                    <div className={`max-w-[70%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>

                                        {/* Reply Context Bubble */}
                                        {msg.replyTo && (
                                            <div className="mb-1 text-xs text-gray-500 flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-lg border-l-2 border-gray-400 opacity-80">
                                                <div className="font-medium">{msg.replyTo.sender?.fullName || 'User'}:</div>
                                                <div className="truncate max-w-[150px]">{msg.replyTo.content}</div>
                                            </div>
                                        )}

                                        <div className={`relative px-4 py-2 rounded-2xl text-sm shadow-sm
                                            ${isMe ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-white text-gray-800 border border-gray-100 rounded-tl-sm'}`}>
                                            <p>{msg.content}</p>
                                            <span className={`text-[10px] block mt-1 text-right opacity-70 ${isMe ? 'text-blue-100' : 'text-gray-400'}`}>
                                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>

                                            {/* Hover Reply */}
                                            <button
                                                onClick={() => setReplyingTo(msg)}
                                                className={`absolute top-0 p-1 rounded-full shadow-sm bg-white text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity
                                                ${isMe ? '-left-8' : '-right-8'}`}
                                            >
                                                <div className="scale-x-[-1]"><Smile size={14} /></div>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="p-4 bg-white border-t border-gray-200">
                        {replyingTo && (
                            <div className="flex justify-between items-center mb-2 px-4 py-2 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg">
                                <div className="text-sm">
                                    <span className="font-bold text-blue-700 block">Replying to {replyingTo.sender?.fullName || 'User'}</span>
                                    <span className="text-gray-500 truncate block max-w-md">{replyingTo.content}</span>
                                </div>
                                <button onClick={() => setReplyingTo(null)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
                            </div>
                        )}
                        <form onSubmit={sendMessage} className="flex gap-2 items-center">
                            <button type="button" className="p-2 text-gray-400 hover:text-gray-600"><Smile size={24} /></button>
                            <button type="button" className="p-2 text-gray-400 hover:text-gray-600"><Paperclip size={22} /></button>
                            <input
                                value={inputMessage}
                                onChange={e => setInputMessage(e.target.value)}
                                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all text-sm"
                                placeholder="Type your message..."
                            />
                            <button type="submit" className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-md transition-colors hover:scale-105 active:scale-95">
                                <Send size={20} />
                            </button>
                        </form>
                    </div>

                </div>
            ) : (
                <div className="hidden md:flex flex-1 flex-col items-center justify-center bg-gray-50">
                    <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-6 animate-bounce-slow">
                        <MessageSquare size={48} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Messages</h2>
                    <p className="text-gray-500 max-w-sm text-center">Select a conversation from the left or search for a student to start connecting.</p>
                </div>
            )}
        </div>
    );
};

export default MessagesPage;

// Updated NavItem helper
const NavItem = ({ icon, label, active, onClick }) => (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${active ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
        {icon}
        <span>{label}</span>
    </button>
);
