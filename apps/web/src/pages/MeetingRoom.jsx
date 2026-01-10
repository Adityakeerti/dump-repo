import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';
import SockJS from 'sockjs-client';
import Stomp from 'stompjs';
import { Send, Download, MessageSquare, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { getCurrentUser, getAuth } from '../utils/authStorage';

// Use proxy path for WebSocket to avoid mixed content issues
const MEETING_WS_URL = '/ws';

const MeetingRoom = () => {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const videoContainerRef = useRef(null);
    const zpRef = useRef(null); // Ref to store Zego instance

    // Get user from proper auth context (student or management)
    const studentAuth = getAuth('student');
    const managementAuth = getAuth('management');
    const user = studentAuth.user || managementAuth.user || {};

    const userName = user.fullName || user.name || user.username || user.email?.split('@')[0] || 'Guest';
    // CRITICAL: userId must NEVER be empty for Zego authentication
    const rawUserId = user.id || user.userId || user.studentId || user.managerId;
    const userId = rawUserId ? String(rawUserId) : 'user_' + Date.now() + '_' + Math.floor(Math.random() * 10000);

    console.log('👤 User Info:', { userName, userId, user });

    // Chat State
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [stompClient, setStompClient] = useState(null);
    const [hasJoinedMeeting, setHasJoinedMeeting] = useState(false); // New state to track actual join
    const messagesEndRef = useRef(null);

    // --- Zego Cloud Integration ---
    const isInitializing = useRef(false); // Prevent double init in React Strict Mode

    useEffect(() => {
        const initMeeting = async () => {
            // Prevent double initialization
            if (isInitializing.current || !videoContainerRef.current) return;
            isInitializing.current = true;

            try {
                const appID = 1836935326;
                const serverSecret = "1c9cfa38377a2f2eee4eff73add02f52";

                console.log('🎬 Initializing Zego Meeting:', { roomId, userId, userName });

                const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
                    appID,
                    serverSecret,
                    roomId,
                    userId,
                    userName
                );

                console.log('✅ Token generated successfully');

                const zp = ZegoUIKitPrebuilt.create(kitToken);
                zpRef.current = zp; // Store instance

                zp.joinRoom({
                    container: videoContainerRef.current,
                    sharedLinks: [
                        {
                            name: 'Copy Link',
                            url: window.location.protocol + '//' + window.location.host + '/meeting/room/' + roomId
                        },
                        {
                            name: 'Meeting Code',
                            url: roomId
                        },
                    ],
                    scenario: {
                        mode: ZegoUIKitPrebuilt.GroupCall,
                    },
                    turnOnMicrophoneWhenJoining: false,
                    turnOnCameraWhenJoining: false,
                    showMyCameraToggleButton: true,
                    showMyMicrophoneToggleButton: true,
                    showAudioVideoSettingsButton: true,
                    showScreenSharingButton: true,
                    showTextChat: false, // Usage Custom Chat
                    showUserList: true,
                    maxUsers: 50,
                    layout: "Auto",
                    showLayoutButton: true,
                    onJoinRoom: () => {
                        console.log('✅ Successfully joined Zego room');
                        setHasJoinedMeeting(true); // Trigger chat connection
                        setIsChatOpen(true); // Auto-open chat on join (optional, user asked to hide in preview)
                    },
                    onLeaveRoom: () => {
                        console.log('👋 Left Zego room');
                        navigate('/meeting');
                    },
                    onError: (error) => {
                        console.error('❌ Zego Error:', error);
                        alert(`Meeting Error: ${error.msg || 'Failed to connect. Please check your Zego credentials.'}`);
                    }
                });
            } catch (error) {
                console.error('❌ Failed to initialize Zego:', error);
                alert('Failed to initialize meeting room. Please check console for details.');
            }
        };

        initMeeting();

        // Cleanup function to fix "White Page" bug on re-entry
        return () => {
            isInitializing.current = false; // Reset flag for next mount
            if (zpRef.current) {
                zpRef.current.destroy();
                zpRef.current = null;
            }
            // Disconnect socket on unmount
            if (stompClient) {
                stompClient.disconnect();
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roomId, userId, userName, navigate]);


    // --- Custom WebSocket Chat Logic ---
    useEffect(() => {
        // Only connect if user has actually joined the meeting
        if (!hasJoinedMeeting) return;

        const socket = new SockJS(MEETING_WS_URL); // Connect to Backend Meeting WebSocket
        const client = Stomp.over(socket);
        client.debug = null; // Disable debug logs

        client.connect({}, () => {
            // Subscribe to public topic
            client.subscribe('/topic/public', onMessageReceived);

            // Tell server user joined
            client.send("/app/chat.addUser",
                {},
                JSON.stringify({ sender: userName, type: 'JOIN' })
            );

            setStompClient(client);
        }, (error) => {
            console.error('WebSocket Error:', error);
            setMessages(prev => [...prev, { type: 'SYSTEM', content: 'Connection to chat server failed.' }]);
        });

        return () => {
            if (client && client.connected) {
                client.disconnect();
            }
        };
    }, [hasJoinedMeeting, userName]); // Depend on hasJoinedMeeting

    const onMessageReceived = (payload) => {
        const message = JSON.parse(payload.body);
        setMessages(prev => [...prev, message]);
    };

    const sendMessage = (e) => {
        e.preventDefault();
        if (inputMessage.trim() && stompClient) {
            const chatMessage = {
                sender: userName,
                content: inputMessage,
                type: 'CHAT'
            };
            stompClient.send("/app/chat.sendMessage", {}, JSON.stringify(chatMessage));
            setInputMessage('');
        }
    };

    // Auto-scroll to bottom of chat
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const exportChat = () => {
        // Logic from chat.js
        if (messages.length === 0) return;

        const chatContent = messages.map(msg => {
            if (msg.type === 'CHAT') return `[${msg.sender}]: ${msg.content}`;
            if (msg.type === 'JOIN') return `${msg.sender} joined!`;
            if (msg.type === 'LEAVE') return `${msg.sender} left!`;
            return '';
        }).join('\n');

        const blob = new Blob([chatContent], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chat-history-${new Date().toISOString().slice(0, 10)}.txt`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    };

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-slate-950 relative">

            {/* Back Button Overlay */}
            <div className="absolute top-4 left-4 z-50">
                <button
                    onClick={() => navigate('/meeting')}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800/80 backdrop-blur-md text-white rounded-full border border-white/10 hover:bg-slate-700 transition-colors"
                >
                    <ArrowLeft size={18} /> Back
                </button>
            </div>

            {/* Video Container - Responsive Flex Item */}
            {/* The video container will take remaining space. When sidebar is visible, it naturally shrinks. */}
            <div
                className={`flex-1 relative transition-all duration-300 h-full`}
                ref={videoContainerRef}
            >
                {/* ZegoUIKitPrebuilt will fill this container */}
            </div>

            {/* Chat Sidebar - Responsive Flex Item */}
            {hasJoinedMeeting && (
                <>
                    <div
                        className={`bg-slate-900 border-l border-white/5 flex flex-col transition-all duration-300 h-full relative z-40 ${isChatOpen ? 'w-[350px] translate-x-0' : 'w-0 translate-x-full overflow-hidden'
                            }`}
                    >
                        {/* Chat Content - Wrapper to ensure width stability during transition */}
                        <div className="w-[350px] flex flex-col h-full absolute right-0"> {/* Width fixed to inner content to prevent squash during slide */}

                            {/* Chat Header */}
                            <div className="p-4 border-b border-white/5 flex justify-between items-center bg-transparent">
                                <h3 className="text-white font-medium flex items-center gap-2 text-sm tracking-wide">
                                    <MessageSquare size={16} className="text-indigo-400" />
                                    Chat
                                </h3>
                                <button
                                    onClick={exportChat}
                                    title="Export Chat"
                                    className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full"
                                >
                                    <Download size={16} />
                                </button>
                            </div>

                            {/* Messages Area */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-900/50">
                                {messages.map((msg, index) => {
                                    if (msg.type === 'JOIN' || msg.type === 'LEAVE') {
                                        return (
                                            <div key={index} className="flex items-center justify-center gap-2 my-2 opacity-60">
                                                <div className="h-[1px] bg-white/10 w-4"></div>
                                                <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                                                    {msg.sender.split(' ')[0]} {msg.type === 'JOIN' ? 'joined' : 'left'}
                                                </span>
                                                <div className="h-[1px] bg-white/10 w-4"></div>
                                            </div>
                                        );
                                    }
                                    if (msg.type === 'SYSTEM') {
                                        return <div key={index} className="text-center text-xs text-red-400 py-1">{msg.content}</div>;
                                    }

                                    const isMe = msg.sender === userName;
                                    return (
                                        <div key={index} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group max-w-full`}>
                                            <div className="flex items-end gap-2 max-w-[90%]">
                                                {!isMe && (
                                                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-[10px] font-bold shadow-md shrink-0">
                                                        {msg.sender.charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                                <div className={`px-3 py-2 text-sm break-words ${isMe
                                                    ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm'
                                                    : 'bg-slate-800 text-slate-200 rounded-2xl rounded-tl-sm border border-white/5'
                                                    }`}>
                                                    {msg.content}
                                                </div>
                                            </div>
                                            <span className="text-[10px] text-slate-600 mt-1 mx-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {isMe ? 'You' : msg.sender}
                                            </span>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input Area */}
                            <div className="p-3 border-t border-white/5 bg-slate-900">
                                <form onSubmit={sendMessage} className="relative flex items-center bg-slate-800 rounded-full border border-white/5 overflow-hidden transition-colors focus-within:border-indigo-500/50">
                                    <input
                                        type="text"
                                        value={inputMessage}
                                        onChange={(e) => setInputMessage(e.target.value)}
                                        placeholder="Type a message..."
                                        className="flex-1 bg-transparent text-white text-sm px-4 py-3 focus:outline-none placeholder:text-slate-600"
                                    />
                                    <button
                                        type="submit"
                                        disabled={!inputMessage.trim()}
                                        className="p-2 mr-1 text-indigo-400 hover:text-indigo-300 disabled:opacity-30 disabled:hover:text-indigo-400 transition-colors"
                                    >
                                        <Send size={18} />
                                    </button>
                                </form>
                            </div>
                        </div>

                    </div>

                    {/* Toggle Chat Button - Vertical Tab */}
                    {/* Positioned OUTSIDE the sidebar container so it doesn't get clipped */}
                    <button
                        onClick={() => setIsChatOpen(!isChatOpen)}
                        className={`absolute top-1/2 -translate-y-1/2 z-50 w-6 h-24 bg-slate-900 border border-r-0 border-white/10 text-slate-400 hover:text-white rounded-l-xl flex items-center justify-center transition-all duration-300 shadow-xl hover:bg-slate-800 ${isChatOpen ? 'right-[350px]' : 'right-0'
                            }`}
                        title={isChatOpen ? "Close Chat" : "Open Chat"}
                    >
                        {isChatOpen ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                    </button>
                </>
            )}

        </div>
    );
};

export default MeetingRoom;
