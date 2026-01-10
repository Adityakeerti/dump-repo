import React, { useState, useEffect, useRef } from 'react';
import {
    Users,
    Search,
    MoreVertical,
    Send,
    Hash,
    Plus,
    Menu,
    ArrowLeft,
    X,
    MessageSquare,
    Bell
} from 'lucide-react';
import SockJS from 'sockjs-client';
import Stomp from 'stompjs';
import { useNavigate } from 'react-router-dom';
import { getDashboardUrl, getCurrentUser } from '../utils/authStorage';
import NoticesPanel from '../components/NoticesPanel';

// Smart protocol detection: Use proxy on HTTPS, direct on HTTP
const isHttps = window.location.protocol === 'https:';
const CHAT_API_BASE = isHttps ? '' : `http://${window.location.hostname}:8083`;
const WS_URL = isHttps ? null : `http://${window.location.hostname}:8083/ws`; // WebSocket only works on HTTP

const GroupsPage = () => {
    const navigate = useNavigate();
    // User State - using getCurrentUser() from authStorage
    const [user, setUser] = useState(getCurrentUser() || {});

    // UI State
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [activeView, setActiveView] = useState('chat'); // 'chat' | 'notices'

    // Chat State
    const [activeGroup, setActiveGroup] = useState(null); // No default group selected
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [stompClient, setStompClient] = useState(null);
    const [connected, setConnected] = useState(false);
    const [currentSubscription, setCurrentSubscription] = useState(null);

    // Groups List
    const [groups, setGroups] = useState([]);
    const [users, setUsers] = useState([]); // For creating groups
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [newGroupDesc, setNewGroupDesc] = useState('');
    const [selectedMembers, setSelectedMembers] = useState([]);

    const messagesEndRef = useRef(null);

    // --- 1. Fetch User's Groups & Default Master Group ---
    useEffect(() => {
        const userId = user.userId || user.id;
        console.log('[Groups] Current user:', user);
        console.log('[Groups] User ID:', userId);

        const fetchGroups = async () => {
            try {
                // Fetch joined groups from API (Assuming endpoint exists or just listing all public ones for now)
                // For this demo, we can just fetch ALL rooms or User's rooms.
                // Let's assume we want to show Master Group + User Groups.

                const url = `${CHAT_API_BASE}/api/groups/user/${userId}`;
                console.log('[Groups] Fetching from:', url);

                const res = await fetch(url);
                console.log('[Groups] Response status:', res.status, res.ok);

                let myGroups = [];
                if (res.ok) {
                    myGroups = await res.json();
                    console.log('[Groups] Fetched groups:', myGroups);
                } else {
                    console.error('[Groups] Failed with status:', res.status);
                    const errorText = await res.text();
                    console.error('[Groups] Error response:', errorText);
                }

                setGroups(myGroups);
                console.log('[Groups] Groups state updated:', myGroups);
            } catch (e) {
                console.error('[Groups] Fetch error:', e);
            }
        };
        if (userId) {
            console.log('[Groups] Fetching groups for userId:', userId);
            fetchGroups();
        } else {
            console.warn('[Groups] No userId found, skipping groups fetch');
        }

        // Fetch all users for group creation
        const fetchUsers = async () => {
            try {
                const res = await fetch(`${CHAT_API_BASE}/api/users/all`);
                if (res.ok) {
                    const allUsers = await res.json();
                    console.log('[Create Group] Fetched users:', allUsers);
                    setUsers(allUsers);
                } else {
                    console.error('[Create Group] Failed with status:', res.status);
                }
            } catch (e) {
                console.error('[Create Group] Fetch error:', e);
            }
        };
        fetchUsers();
    }, [user]);

    // --- 2. WebSocket Connection ---
    useEffect(() => {
        const userId = user.userId || user.id;
        if (!userId) return;

        // WebSocket doesn't work on HTTPS without SSL backend - skip if null
        if (!WS_URL) {
            console.warn('[Groups] WebSocket disabled on HTTPS. Real-time chat unavailable. Access via HTTP for live updates.');
            return;
        }

        const socket = new SockJS(WS_URL);
        const client = Stomp.over(socket);
        client.debug = null;

        client.connect({}, () => {
            setConnected(true);
            setStompClient(client);

            // Subscription happens when activeGroup changes (effect at line 87)

            client.send("/app/chat.addUser", {}, JSON.stringify({ id: userId, email: user.email }));
        }, (err) => {
            console.error("WebSocket Error:", err);
            setConnected(false);
        });

        return () => {
            if (currentSubscription) {
                currentSubscription.unsubscribe();
            }
            if (client && client.connected) {
                client.disconnect();
            }
        };
    }, [user]); // Re-connect only if user changes (rare)

    // --- 3. Handle Active Group Change ---
    useEffect(() => {
        if (!stompClient || !connected || !activeGroup) return;
        subscribeToGroup(stompClient, activeGroup);
        loadHistory(activeGroup);
    }, [activeGroup, stompClient, connected]);

    const subscribeToGroup = (client, group) => {
        // Cleanup previous subscription
        if (currentSubscription) {
            currentSubscription.unsubscribe();
        }

        // Match backend logic: Default College uses MASTER_GROUP topic
        let destination = `/topic/room/${group.id}`;
        if (group.id === 'MASTER_GROUP' || group.name === 'Default College' || group.name === 'Master Group') {
            destination = `/topic/room/MASTER_GROUP`;
        }

        console.log('[WebSocket] Subscribing to:', destination, 'for group:', group.name);

        const subscription = client.subscribe(destination, (payload) => {
            console.log('[WebSocket] Received message:', payload.body);
            const msg = JSON.parse(payload.body);
            setMessages(prev => [...prev, msg]);
        });

        setCurrentSubscription(subscription);
    };

    const loadHistory = async (group) => {
        setMessages([]);
        try {
            const res = await fetch(`${CHAT_API_BASE}/api/history/room/${group.id}`);
            if (res.ok) {
                setMessages(await res.json());
            }
        } catch (e) { console.error(e); }
    };

    const sendMessage = (e) => {
        e.preventDefault();
        if (!inputMessage.trim() || !stompClient || !activeGroup) return;

        const userId = user.userId || user.id;
        const msg = {
            senderId: userId,
            content: inputMessage,
            type: 'CHAT'
        };

        console.log('[WebSocket] Sending message to:', `/app/chat.sendMessage/${activeGroup.id}`, msg);
        stompClient.send(`/app/chat.sendMessage/${activeGroup.id}`, {}, JSON.stringify(msg));

        // Optimistic update: add message immediately for sender
        const optimisticMsg = {
            id: Date.now(), // Temporary ID
            sender: { id: userId, fullName: user.fullName || user.email },
            content: inputMessage,
            timestamp: new Date(),
            type: 'CHAT'
        };
        setMessages(prev => [...prev, optimisticMsg]);

        setInputMessage('');
    };

    const handleCreateGroup = async (e) => {
        e.preventDefault();
        if (!newGroupName.trim()) return;

        const userId = user.userId || user.id;
        try {
            const res = await fetch(`${CHAT_API_BASE}/api/groups/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newGroupName,
                    description: newGroupDesc,
                    creatorId: userId,
                    memberIds: selectedMembers
                })
            });

            if (res.ok) {
                const newGroup = await res.json();
                setGroups(prev => [...prev, newGroup]);
                setShowCreateModal(false);
                setNewGroupName('');
                setNewGroupDesc('');
                setSelectedMembers([]);
                setActiveGroup(newGroup);
            }
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    return (
        <div className="flex h-screen bg-gray-50 font-sans">

            {/* Mobile Hamburger / Navigation Overlay */}
            {sidebarOpen && (
                <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setSidebarOpen(false)}>
                    <div className="w-64 h-full bg-white p-4 shadow-xl" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="font-bold text-lg">Navigation</h2>
                            <button onClick={() => setSidebarOpen(false)}><X size={20} /></button>
                        </div>
                        <nav className="space-y-2">
                            <NavItem icon={<ArrowLeft size={20} />} label="Back to Dashboard" onClick={() => navigate(getDashboardUrl())} />
                            <NavItem icon={<MessageSquare size={20} />} label="Messages" onClick={() => navigate('/messages')} />
                            <NavItem icon={<Users size={20} />} label="Groups" active />
                            <NavItem icon={<Calendar size={20} />} label="Meetings" onClick={() => navigate('/meeting')} />
                        </nav>
                    </div>
                </div>
            )}

            {/* Sidebar (Desktop) */}
            <div className="hidden md:flex w-80 bg-white border-r border-gray-200 flex-col">
                <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <button onClick={() => navigate(getDashboardUrl())} className="p-1 hover:bg-gray-100 rounded-full mr-1">
                            <ArrowLeft size={18} className="text-gray-500" />
                        </button>
                        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <Users className="text-indigo-600" /> Groups
                        </h1>
                    </div>
                    <button onClick={() => setShowCreateModal(true)} className="text-blue-600 hover:bg-blue-50 p-1 rounded-full"><Plus size={20} /></button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {/* WORK SECTION */}
                    <div className="p-3 border-b border-gray-100">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider px-2 mb-2 flex items-center gap-2">
                            <Hash size={12} /> Work
                        </h3>
                        {groups.filter(g => g.type === 'WORK' || g.name === 'Default College' || g.name === 'Master Group').map(g => (
                            <div
                                key={g.id}
                                onClick={() => { setActiveGroup(g); setActiveView('chat'); }}
                                className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${activeGroup?.id === g.id && activeView === 'chat' ? 'bg-indigo-50 border border-indigo-100' : 'hover:bg-gray-50'}`}
                            >
                                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                                    #
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-medium text-gray-900 text-sm truncate">{g.name}</h4>
                                </div>
                            </div>
                        ))}
                        {groups.filter(g => g.type === 'WORK' || g.name === 'Default College' || g.name === 'Master Group').length === 0 && (
                            <p className="text-xs text-gray-400 px-2 py-2">No work groups</p>
                        )}
                    </div>

                    {/* PERSONAL SECTION */}
                    <div className="p-3 border-b border-gray-100">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider px-2 mb-2 flex items-center gap-2">
                            <Users size={12} /> Personal
                        </h3>
                        {groups.filter(g => g.type !== 'WORK' && g.name !== 'Default College' && g.name !== 'Master Group').map(g => (
                            <div
                                key={g.id}
                                onClick={() => { setActiveGroup(g); setActiveView('chat'); }}
                                className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${activeGroup?.id === g.id && activeView === 'chat' ? 'bg-purple-50 border border-purple-100' : 'hover:bg-gray-50'}`}
                            >
                                <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-sm">
                                    {g.name?.[0] || '#'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-medium text-gray-900 text-sm truncate">{g.name}</h4>
                                </div>
                            </div>
                        ))}
                        {groups.filter(g => g.type !== 'WORK' && g.name !== 'Default College' && g.name !== 'Master Group').length === 0 && (
                            <p className="text-xs text-gray-400 px-2 py-2">No personal groups</p>
                        )}
                    </div>

                    {/* NOTICES SECTION */}
                    <div className="p-3">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider px-2 mb-2 flex items-center gap-2">
                            <Bell size={12} /> Notices
                        </h3>
                        <div
                            onClick={() => { setActiveGroup(null); setActiveView('notices'); }}
                            className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${activeView === 'notices' && !activeGroup ? 'bg-amber-50 border border-amber-200' : 'hover:bg-gray-50'}`}
                        >
                            <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
                                <Bell size={16} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-gray-900 text-sm">All Notices</h4>
                                <p className="text-xs text-gray-400">View announcements</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Chat Area */}
            {activeGroup ? (
                <div className="flex-1 flex flex-col bg-slate-50 relative">
                    <div className="h-16 bg-white border-b border-gray-200 flex justify-between items-center px-6 shadow-sm z-10">
                        <div className="flex items-center gap-3">
                            <button className="md:hidden" onClick={() => setSidebarOpen(true)}>
                                <Menu size={20} />
                            </button>
                            <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold">
                                #
                            </div>
                            <div>
                                <h2 className="font-bold text-gray-800">{activeGroup.name}</h2>
                            </div>
                        </div>

                        {/* View Toggle Tabs */}
                        <div className="flex items-center gap-2">
                            <div className="flex bg-gray-100 rounded-lg p-1 mr-2">
                                <button
                                    onClick={() => setActiveView('chat')}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${activeView === 'chat' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    <MessageSquare size={14} />
                                    Chat
                                </button>
                                <button
                                    onClick={() => setActiveView('notices')}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${activeView === 'notices' ? 'bg-white text-amber-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    <Bell size={14} />
                                    Notices
                                </button>
                            </div>
                            {/* Leave Group Button */}
                            <button
                                onClick={async () => {
                                    // Default College / Master Group check
                                    if (activeGroup.name === 'Default College' || activeGroup.name === 'Master Group' || activeGroup.id === 'MASTER_GROUP') {
                                        alert("It is a Master group, you can't leave it.");
                                        return;
                                    }

                                    if (confirm(`Are you sure you want to leave ${activeGroup.name}?`)) {
                                        const userId = user.userId || user.id;
                                        await fetch(`${CHAT_API_BASE}/api/groups/leave?groupId=${activeGroup.id}&userId=${userId}`, { method: 'POST' });
                                        window.location.reload();
                                    }
                                }}
                                className={`text-xs px-2 py-1 rounded border ${(activeGroup.name === 'Default College' || activeGroup.name === 'Master Group')
                                    ? 'text-gray-400 border-gray-200 cursor-not-allowed opacity-50'
                                    : 'text-red-500 hover:bg-red-50 border-red-100'
                                    }`}
                            >
                                Leave
                            </button>
                            <button className="text-gray-400"><MoreVertical size={20} /></button>
                        </div>
                    </div>

                    {/* Conditional View: Chat or Notices */}
                    {activeView === 'notices' ? (
                        <NoticesPanel groupId={activeGroup.id} user={user} />
                    ) : (
                        <>
                            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                {messages.map((msg, idx) => {
                                    const myId = user.userId || user.id;
                                    const isMe = (msg.sender?.id === myId) || (msg.senderId === myId);
                                    const senderName = msg.sender?.fullName || 'Unknown';

                                    return (
                                        <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[70%]`}>
                                                {!isMe && <span className="text-[10px] text-gray-500 ml-1 mb-1">{senderName}</span>}
                                                <div className={`px-4 py-2 rounded-2xl text-sm ${isMe ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-white text-gray-800 border border-gray-100 rounded-tl-sm'}`}>
                                                    {msg.content}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>

                            <div className="p-4 bg-white border-t border-gray-200">
                                <form onSubmit={sendMessage} className="flex gap-2">
                                    <input
                                        type="text"
                                        value={inputMessage}
                                        onChange={(e) => setInputMessage(e.target.value)}
                                        placeholder={`Message #${activeGroup.name}...`}
                                        className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                    <button type="submit" className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700">
                                        <Send size={20} />
                                    </button>
                                </form>
                            </div>
                        </>
                    )}
                </div>
            ) : activeView === 'notices' ? (
                /* Notices View (when selected from sidebar) */
                <div className="flex-1 flex flex-col bg-slate-50">
                    <div className="h-16 bg-white border-b border-gray-200 flex items-center px-6 shadow-sm">
                        <div className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold">
                            <Bell size={20} />
                        </div>
                        <div className="ml-3">
                            <h2 className="font-bold text-gray-800">All Notices</h2>
                            <p className="text-xs text-gray-400">Announcements from administration</p>
                        </div>
                    </div>
                    <NoticesPanel groupId={null} user={user} />
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center bg-gray-50">
                    <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 mb-6">
                        <Users size={48} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Select a Group</h2>
                    <p className="text-gray-500 max-w-sm text-center">Click on a group to start chatting or view notices.</p>
                </div>
            )}

            {/* Create Group Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCreateModal(false)}>
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-2xl font-bold text-gray-900">Create Group</h2>
                            <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateGroup} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Group Name</label>
                                <input
                                    type="text"
                                    value={newGroupName}
                                    onChange={(e) => setNewGroupName(e.target.value)}
                                    placeholder="Enter group name"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                                <textarea
                                    value={newGroupDesc}
                                    onChange={(e) => setNewGroupDesc(e.target.value)}
                                    placeholder="What's this group about?"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                    rows="3"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Add Members (Optional)
                                    {users.length > 0 && <span className="text-gray-400 text-xs ml-2">({users.filter(u => u.id !== (user.userId || user.id)).length} available)</span>}
                                </label>
                                <div className="border border-gray-300 rounded-lg min-h-[120px] max-h-64 overflow-y-auto bg-gray-50">
                                    {users.filter(u => u.id !== (user.userId || user.id)).length === 0 ? (
                                        <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
                                            No other users available
                                        </div>
                                    ) : (
                                        users.filter(u => u.id !== (user.userId || user.id)).map(u => (
                                            <label key={u.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white cursor-pointer border-b border-gray-100 last:border-0">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedMembers.includes(u.id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedMembers(prev => [...prev, u.id]);
                                                        } else {
                                                            setSelectedMembers(prev => prev.filter(id => id !== u.id));
                                                        }
                                                    }}
                                                    className="w-4 h-4 text-blue-600 rounded"
                                                />
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                                                        {u.fullName?.[0] || 'U'}
                                                    </div>
                                                    <span className="text-sm text-gray-900">{u.fullName}</span>
                                                </div>
                                            </label>
                                        ))
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                                >
                                    Create Group
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GroupsPage;
