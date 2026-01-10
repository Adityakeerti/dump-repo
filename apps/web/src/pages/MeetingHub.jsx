import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Video, Users, ArrowRight, Sparkles } from 'lucide-react';
import { getDashboardUrl, getAuth } from '../utils/authStorage';

const MeetingHub = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState({ name: 'User', email: '' });
    const [joinRoomId, setJoinRoomId] = useState('');
    const [showJoinModal, setShowJoinModal] = useState(false);

    useEffect(() => {
        // Load user from local storage - check management first, then student
        const managementAuth = getAuth('management');
        const studentAuth = getAuth('student');
        const storedUser = managementAuth.user || studentAuth.user || {};
        setUser(storedUser);
    }, []);

    const handleCreateMeeting = () => {
        const roomID = Math.floor(Math.random() * 10000) + "";
        navigate(`/meeting/room/${roomID}`);
    };

    const handleJoinMeeting = () => {
        if (joinRoomId.trim()) {
            navigate(`/meeting/room/${joinRoomId}`);
        }
    };

    const handleLogout = () => {
        // Navigate back to the appropriate dashboard
        navigate(getDashboardUrl());
    };

    return (
        <div className="min-h-screen bg-gray-50 font-sans flex items-center justify-center p-4 relative overflow-hidden text-gray-800">

            {/* Background Decoration (Subtle) */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-100/40 rounded-full blur-[100px] opacity-60"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-100/40 rounded-full blur-[100px] opacity-60"></div>
            </div>

            <div className="w-full max-w-5xl relative z-10 space-y-8">

                {/* Header Section */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xl font-bold text-white shadow-md">
                            {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-xl font-bold text-gray-900">
                                    Welcome, {user.name}
                                </h3>
                                <Sparkles size={16} className="text-amber-400 fill-amber-400" />
                            </div>
                            <p className="text-sm text-gray-500">Ready to collaborate?</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="px-5 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 font-medium transition-all text-sm flex items-center gap-2"
                    >
                        <LogOut size={16} /> Back to Dashboard
                    </button>
                </div>

                {/* Main Actions Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* Create Meeting Card */}
                    <div
                        onClick={handleCreateMeeting}
                        className="group bg-white rounded-3xl p-8 border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
                            <Video size={120} />
                        </div>

                        <div className="relative z-10 flex flex-col h-full items-start">
                            <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-6 group-hover:bg-blue-600 transition-colors duration-300">
                                <Video size={32} className="text-blue-600 group-hover:text-white transition-colors duration-300" />
                            </div>

                            <h2 className="text-2xl font-bold text-gray-900 mb-2">New Meeting</h2>
                            <p className="text-gray-500 mb-8 max-w-xs">Start an instant meeting and share the link to invite others.</p>

                            <button className="mt-auto px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold shadow-lg shadow-blue-200 group-hover:shadow-blue-300 group-hover:scale-105 transition-all flex items-center gap-2">
                                Start Now <ArrowRight size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Join Meeting Card */}
                    <div
                        onClick={() => setShowJoinModal(true)}
                        className="group bg-white rounded-3xl p-8 border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
                            <Users size={120} />
                        </div>

                        <div className="relative z-10 flex flex-col h-full items-start">
                            <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-6 group-hover:bg-indigo-600 transition-colors duration-300">
                                <Users size={32} className="text-indigo-600 group-hover:text-white transition-colors duration-300" />
                            </div>

                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Join Meeting</h2>
                            <p className="text-gray-500 mb-8 max-w-xs">Enter a room code or link to join a meeting in progress.</p>

                            <button className="mt-auto px-6 py-3 rounded-xl bg-white border border-gray-200 text-gray-700 font-semibold shadow-sm group-hover:border-indigo-200 group-hover:text-indigo-600 transition-all flex items-center gap-2">
                                Enter Code
                            </button>
                        </div>
                    </div>

                </div>
            </div>

            {/* Light Theme Modal */}
            {showJoinModal && (
                <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200 p-4">
                    <div className="bg-white border border-gray-100 p-8 rounded-3xl w-full max-w-md text-center shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Users size={32} className="text-indigo-600" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">Join Meeting</h3>
                        <p className="text-gray-500 mb-8">Enter the meeting ID to connect</p>

                        <input
                            type="text"
                            value={joinRoomId}
                            onChange={(e) => setJoinRoomId(e.target.value)}
                            placeholder="e.g. 1234"
                            className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-center text-2xl tracking-widest py-4 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all mb-8 placeholder:text-gray-300 font-mono"
                            onKeyDown={(e) => e.key === 'Enter' && handleJoinMeeting()}
                            autoFocus
                        />

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setShowJoinModal(false)}
                                className="px-6 py-3 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleJoinMeeting}
                                className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors shadow-lg shadow-indigo-100"
                            >
                                Join Room
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MeetingHub;
