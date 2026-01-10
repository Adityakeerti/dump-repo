import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Home,
    BookOpen,
    MessageSquare,
    Calendar,
    Users,
    Bell,
    Bot,
    Upload,
    TrendingUp,
    Clock,
    AlertCircle,
    Sparkles,
    CheckCircle,
    Award,
    Activity,
    Search,
    Mic,
    MoreHorizontal,
    LogOut,
    Loader2
} from 'lucide-react';
import AIChatWidget from '../components/AIChatWidget';
import { logout } from '../utils/authStorage';

const StudentDashboard = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState({ name: 'Guest', studentId: 'N/A', collegeRollNumber: null, avatar: 'G', email: '', username: '' });
    const [activeTab, setActiveTab] = useState('all');
    const [showNotifications, setShowNotifications] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    // State for dashboard data (Initialized to empty - no dummy data)
    const [quickStats, setQuickStats] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Load user from local storage (check both student_user and legacy 'user' key)
        try {
            const storedUser = localStorage.getItem('student_user') || localStorage.getItem('user');
            if (storedUser) {
                const parsedUser = JSON.parse(storedUser);
                setUser({
                    name: parsedUser.fullName || parsedUser.username || 'Student',
                    studentId: parsedUser.studentId || parsedUser.collegeRollNumber || null,
                    collegeRollNumber: parsedUser.studentId || parsedUser.collegeRollNumber || null,
                    avatar: (parsedUser.fullName || parsedUser.username || 'S').charAt(0).toUpperCase(),
                    email: parsedUser.email || '',
                    username: parsedUser.username || ''
                });
            }
        } catch (error) {
            console.error("Failed to load user data", error);
        }

        // Simulate API fetch (For now just stops loading, in future this will call backend)
        setTimeout(() => {
            setLoading(false);
        }, 500);
    }, []);

    const handleMeetingClick = () => {
        navigate('/meeting');
    };

    const handleLogout = async () => {
        // Confirmation dialog
        if (!window.confirm('Are you sure you want to logout?')) {
            return;
        }

        setIsLoggingOut(true);
        try {
            await logout('student');
            // Clear all storage to ensure clean logout
            localStorage.clear();
            navigate('/student/login', { replace: true });
        } catch (error) {
            console.error('Logout error:', error);
            // Still navigate to login and clear storage even if API call fails
            localStorage.clear();
            navigate('/student/login', { replace: true });
        } finally {
            setIsLoggingOut(false);
        }
    };

    return (
        <div className="flex h-screen bg-gray-50 font-sans text-gray-800">
            {/* AI Chat Widget */}
            <AIChatWidget />
            {/* Left Sidebar - Navigation */}
            <aside className="w-64 bg-white border-r border-gray-200 flex flex-col hidden md:flex shrink-0">
                <div className="p-6 border-b border-gray-100">
                    <div className="flex items-center gap-2 text-blue-700 font-bold text-xl tracking-tight">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
                            <Sparkles size={18} />
                        </div>
                        Campus<span className="text-gray-900">Intell</span>
                    </div>
                </div>

                <nav className="p-4 space-y-1 flex-1">
                    <NavItem icon={<Home size={20} />} label="Dashboard" active />
                    <NavItem icon={<BookOpen size={20} />} label="Academics" onClick={() => navigate('/academics')} />
                    <NavItem icon={<Users size={20} />} label="Groups" onClick={() => navigate('/groups')} />
                    <NavItem icon={<BookOpen size={20} />} label="Library" onClick={() => navigate('/student/library')} />
                    <NavItem icon={<Calendar size={20} />} label="Meetings" onClick={handleMeetingClick} />
                    <NavItem icon={<MessageSquare size={20} />} label="Messages" onClick={() => navigate('/messages')} />
                </nav>

                <div className="p-4">
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-blue-600 font-bold shadow-sm border border-blue-100">
                                {user.avatar}
                            </div>
                            <div className="overflow-hidden flex-1">
                                <h4 className="font-semibold text-sm truncate">{user.name}</h4>
                                <p className="text-xs text-gray-500 truncate">{user.studentId || user.collegeRollNumber || 'N/A'}</p>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            disabled={isLoggingOut}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-white border-2 border-red-200 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-50 hover:border-red-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                        >
                            {isLoggingOut ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    Logging out...
                                </>
                            ) : (
                                <>
                                    <LogOut size={16} />
                                    Logout
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto">
                <div className="max-w-[1600px] mx-auto p-6 md:p-8">

                    {/* Header */}
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user.name.split(' ')[0]}! 👋</h1>
                            <p className="text-gray-500">Here's what's happening in your campus today.</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="relative hidden md:block">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search anything..."
                                    className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64 transition-all hover:bg-gray-50"
                                />
                            </div>
                            <button
                                onClick={() => setShowNotifications(!showNotifications)}
                                className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all relative shadow-sm
                                    ${showNotifications ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                            >
                                <Bell size={20} />
                                {!showNotifications && notifications.length > 0 && (
                                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white animate-pulse"></span>
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col xl:flex-row gap-6">

                        {/* LEFT COLUMN (Wide) */}
                        <div className="flex-1 space-y-6">

                            {/* Quick Stats Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <StatCard
                                    icon={<CheckCircle className="text-green-600" size={24} />}
                                    label="Attendance"
                                    value={quickStats ? `${quickStats.attendance.value}%` : '--'}
                                    trend={quickStats ? quickStats.attendance.trend : 'No data'}
                                    color="green"
                                    loading={loading}
                                />
                                <StatCard
                                    icon={<BookOpen className="text-blue-600" size={24} />}
                                    label="Assignments"
                                    value={quickStats ? quickStats.assignments.value : '--'}
                                    trend={quickStats ? quickStats.assignments.trend : 'No data'}
                                    color="blue"
                                    loading={loading}
                                />
                                <StatCard
                                    icon={<Award className="text-purple-600" size={24} />}
                                    label="CGPA"
                                    value={quickStats ? quickStats.cgpa.value : '--'}
                                    trend={quickStats ? quickStats.cgpa.trend : 'No data'}
                                    color="purple"
                                    loading={loading}
                                />
                                <StatCard
                                    icon={<TrendingUp className="text-orange-600" size={24} />}
                                    label="Class Rank"
                                    value={quickStats ? `#${quickStats.ranking.value}` : '--'}
                                    trend={quickStats ? quickStats.ranking.trend : 'No data'}
                                    color="orange"
                                    loading={loading}
                                />
                            </div>

                            {/* Recent Activities Feed (Unified) */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 min-h-[300px]">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-lg font-bold text-gray-900">Recent Activities</h3>
                                        {activities.length > 0 && <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-md font-medium">New</span>}
                                    </div>
                                    <div className="flex bg-gray-100 p-1 rounded-lg">
                                        <TabButton active={activeTab === 'all'} onClick={() => setActiveTab('all')} label="All" />
                                        <TabButton active={activeTab === 'academic'} onClick={() => setActiveTab('academic')} label="Academic" />
                                        <TabButton active={activeTab === 'events'} onClick={() => setActiveTab('events')} label="Events" />
                                    </div>
                                </div>

                                {loading ? (
                                    <div className="space-y-4">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="animate-pulse flex items-start gap-4 p-4 rounded-xl border border-gray-100">
                                                <div className="w-10 h-10 rounded-full bg-gray-200"></div>
                                                <div className="flex-1 space-y-2">
                                                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                                                    <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : activities.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-center text-gray-500">
                                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                            <Activity size={32} className="text-gray-400" />
                                        </div>
                                        <p className="font-medium">No recent activities</p>
                                        <p className="text-xs mt-1">Check back later for updates.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {activities.map((activity) => (
                                            <div key={activity.id} className="flex items-start gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors border border-gray-100">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 
                                                    ${activity.type === 'attendance' ? 'bg-green-100 text-green-600' :
                                                        activity.type === 'mark' ? 'bg-purple-100 text-purple-600' :
                                                            'bg-blue-100 text-blue-600'}`}>
                                                    {activity.type === 'attendance' ? <CheckCircle size={18} /> :
                                                        activity.type === 'mark' ? <Award size={18} /> : <Calendar size={18} />}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-start">
                                                        <h4 className="font-semibold text-gray-900">{activity.title}</h4>
                                                        <span className="text-xs text-gray-400">{activity.time}</span>
                                                    </div>
                                                    <p className="text-sm text-gray-600 mt-0.5">{activity.detail}</p>
                                                </div>
                                                <button className="text-gray-400 hover:text-gray-600">
                                                    <MoreHorizontal size={18} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                        </div>

                        {/* RIGHT COLUMN (Sidebar Style) - 30% Width on large screens */}
                        <div className="xl:w-80 space-y-6">

                            {/* 1. Live Notifications (Collapsible) */}
                            {showNotifications && (
                                <div className="animate-in fade-in zoom-in-95 duration-200 origin-top-right relative">
                                    {/* Connection Arrow */}
                                    <div className="absolute -top-2 right-6 w-4 h-4 bg-white transform rotate-45 border-t border-l border-gray-200 z-10"></div>

                                    <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 p-5 relative z-0">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                                Live Notifications
                                                {notifications.length > 0 && (
                                                    <span className="flex h-2 w-2 relative">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                                    </span>
                                                )}
                                            </h3>
                                            <button
                                                onClick={() => setShowNotifications(false)}
                                                className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-full transition-colors"
                                            >
                                                <span className="sr-only">Close</span>
                                                &times;
                                            </button>
                                        </div>

                                        {notifications.length === 0 ? (
                                            <div className="text-center py-6 text-gray-500">
                                                <Bell size={24} className="mx-auto mb-2 text-gray-300" />
                                                <p className="text-xs">No new notifications</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
                                                {notifications.map((notif) => (
                                                    <div key={notif.id} className="p-3 bg-gray-50/50 rounded-xl border border-gray-100 hover:bg-blue-50/50 hover:border-blue-100 transition-all cursor-pointer group">
                                                        <div className="flex justify-between items-start mb-1">
                                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide
                                                            ${notif.type === 'urgent' ? 'bg-red-100 text-red-600' :
                                                                    notif.type === 'warning' ? 'bg-orange-100 text-orange-600' :
                                                                        'bg-blue-100 text-blue-600'}`}>
                                                                {notif.type}
                                                            </span>
                                                            <span className="text-[10px] text-gray-400 group-hover:text-blue-400">{notif.time}</span>
                                                        </div>
                                                        <h4 className="text-sm font-semibold text-gray-800 leading-tight mb-1 group-hover:text-blue-700">{notif.title}</h4>
                                                        <p className="text-xs text-gray-500 group-hover:text-gray-600">{notif.desc}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                    </div>
                                </div>
                            )}

                            {/* 2. Widgets Box (Moves up when notifs closed) */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
                                <h3 className="font-bold text-gray-900 mb-4">Widgets</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <WidgetButton icon={<Calendar size={20} />} label="Calendar" color="bg-indigo-50 text-indigo-600" />
                                    <WidgetButton icon={<CheckCircle size={20} />} label="To-Do" color="bg-emerald-50 text-emerald-600" />
                                    <WidgetButton icon={<Users size={20} />} label="Groups" color="bg-amber-50 text-amber-600" />
                                    <WidgetButton
                                        icon={
                                            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="lucide">
                                                <path d="M4 4v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8.342a2 2 0 0 0-.602-1.43l-4.44-4.342A2 2 0 0 0 13.56 2H6a2 2 0 0 0-2 2z" />
                                                <path d="M14 2v6h6" />
                                                <path d="M10 13h4" />
                                                <path d="M10 17h4" />
                                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" opacity="0.1" fill="currentColor" />
                                            </svg>
                                        }
                                        label="Notion"
                                        color="bg-slate-50 text-slate-700"
                                    />
                                </div>
                            </div>

                            {/* 3. V-Board (Restored) */}
                            <div
                                onClick={() => window.open('/vboard/index.html', '_blank')}
                                className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 p-6 text-white text-center shadow-lg group cursor-pointer"
                            >
                                <div className="absolute top-0 right-0 p-3 opacity-20 transform group-hover:scale-110 transition-transform">
                                    <Sparkles size={60} />
                                </div>
                                <h3 className="text-xl font-bold mb-2 relative z-10">V-Board</h3>
                                <p className="text-indigo-100 text-sm mb-4 relative z-10">Collaborate with peers in real-time.</p>
                                <button className="bg-white text-indigo-700 px-4 py-2 rounded-lg font-bold text-sm hover:bg-indigo-50 transition-colors shadow-sm w-full relative z-10">
                                    Launch Board
                                </button>
                            </div>

                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

// --- Helper Components ---

const NavItem = ({ icon, label, active, badge, onClick }) => (
    <button onClick={onClick} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all mb-1
        ${active ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}>
        <div className="flex items-center gap-3">
            {icon}
            <span className="text-sm">{label}</span>
        </div>
        {badge && (
            <span className="bg-blue-100 text-blue-600 text-xs font-bold px-2 py-0.5 rounded-full">
                {badge}
            </span>
        )}
    </button>
);

const StatCard = ({ icon, label, value, trend, color, loading }) => (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start mb-3">
            <div className={`p-2 rounded-lg bg-${color}-50`}>
                {icon}
            </div>
            {loading ? (
                <div className="h-4 w-12 bg-gray-200 rounded animate-pulse"></div>
            ) : (
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full 
                ${trend.includes('+') || trend === 'On Track' || trend === 'Top 10%' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {trend}
                </span>
            )}
        </div>
        {loading ? (
            <div className="h-8 w-16 bg-gray-200 rounded animate-pulse mb-1"></div>
        ) : (
            <div className="text-2xl font-bold text-gray-900 mb-0.5">{value}</div>
        )}
        <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</div>
    </div>
);

const WidgetButton = ({ icon, label, color }) => (
    <button className={`flex flex-col items-center justify-center p-3 rounded-xl transition-transform hover:scale-105 ${color}`}>
        <div className="mb-1">{icon}</div>
        <span className="text-xs font-semibold">{label}</span>
    </button>
);

const TabButton = ({ active, onClick, label }) => (
    <button
        onClick={onClick}
        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${active ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
    >
        {label}
    </button>
);

export default StudentDashboard;
