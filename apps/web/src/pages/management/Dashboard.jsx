import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Bell,
    Search,
    CheckCircle,
    Users,
    Calendar,
    Activity,
    MoreHorizontal,
    Award,
    TrendingUp,
    BookOpen,
    Sparkles,
    Bot,
    ScanLine,
    LogOut
} from 'lucide-react';
import AIChatWidget from '../../components/AIChatWidget';
import { logout } from '../../utils/authStorage';

const ManagementDashboard = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState({ name: 'Guest', role: 'FACULTY', avatar: 'G', email: '' });
    const [activeTab, setActiveTab] = useState('all');
    const [showNotifications, setShowNotifications] = useState(false);
    const [loading, setLoading] = useState(true);
    const [notifications, setNotifications] = useState([]);
    const [activities, setActivities] = useState([]);

    useEffect(() => {
        try {
            // Read from management-specific key (set by management_login.jsx via setAuth('management', ...))
            const storedUser = localStorage.getItem('management_user');
            if (storedUser) {
                const parsedUser = JSON.parse(storedUser);
                setUser({
                    name: parsedUser.fullName || parsedUser.username || 'Staff',
                    // Use managementRole (selected in UI) if available, fallback to database role
                    role: parsedUser.managementRole || parsedUser.role || 'FACULTY',
                    avatar: (parsedUser.fullName || parsedUser.username || 'S').charAt(0).toUpperCase(),
                    email: parsedUser.email || ''
                });
            }
        } catch (error) {
            console.error("Failed to load user data", error);
        }
        setTimeout(() => setLoading(false), 500);
    }, []);

    const getRoleDisplayName = (role) => {
        const roleNames = {
            ADMIN: 'Registrar',
            MODERATOR: 'ERP Admin',
            FACULTY: 'Teacher',
            LIBRARIAN: 'Librarian'
        };
        return roleNames[role] || role;
    };

    const handleLogout = async () => {
        try {
            await logout('management');
            navigate('/management/login');
        } catch (error) {
            console.error('Logout error:', error);
            // Still navigate to login even if API call fails
            navigate('/management/login');
        }
    };

    return (
        <div className="max-w-[1600px] mx-auto p-6 md:p-8">
            {/* AI Chat Widget */}
            <AIChatWidget />

            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Welcome back, {user.name.split(' ')[0]}! 👋</h1>
                    <p className="text-slate-500">
                        {getRoleDisplayName(user.role)} Dashboard • Here's what's happening today.
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="relative hidden md:block">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search anything..."
                            className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 w-64 transition-all hover:bg-slate-50"
                        />
                    </div>
                    <button
                        onClick={() => setShowNotifications(!showNotifications)}
                        className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all relative shadow-sm
                            ${showNotifications ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                        <Bell size={20} />
                        {!showNotifications && notifications.length > 0 && (
                            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white animate-pulse"></span>
                        )}
                    </button>
                    <button
                        onClick={handleLogout}
                        className="w-10 h-10 rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all flex items-center justify-center shadow-sm"
                        title="Logout"
                    >
                        <LogOut size={18} />
                    </button>
                </div>
            </div>

            <div className="flex flex-col xl:flex-row gap-6">

                {/* LEFT COLUMN (Wide) */}
                <div className="flex-1 space-y-6">

                    {/* Quick Stats Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard
                            icon={<Users className="text-blue-600" size={24} />}
                            label="Active Users"
                            value="--"
                            trend="No data"
                            color="blue"
                            loading={loading}
                        />
                        <StatCard
                            icon={<BookOpen className="text-green-600" size={24} />}
                            label="Pending Tasks"
                            value="--"
                            trend="No data"
                            color="green"
                            loading={loading}
                        />
                        <StatCard
                            icon={<Award className="text-purple-600" size={24} />}
                            label="Reports"
                            value="--"
                            trend="No data"
                            color="purple"
                            loading={loading}
                        />
                        <StatCard
                            icon={<TrendingUp className="text-orange-600" size={24} />}
                            label="Activity"
                            value="--"
                            trend="No data"
                            color="orange"
                            loading={loading}
                        />
                    </div>

                    {/* Recent Activities Feed */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 min-h-[300px]">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                                <h3 className="text-lg font-bold text-slate-900">Recent Activities</h3>
                                {activities.length > 0 && <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-md font-medium">New</span>}
                            </div>
                            <div className="flex bg-slate-100 p-1 rounded-lg">
                                <TabButton active={activeTab === 'all'} onClick={() => setActiveTab('all')} label="All" />
                                <TabButton active={activeTab === 'work'} onClick={() => setActiveTab('work')} label="Work" />
                                <TabButton active={activeTab === 'alerts'} onClick={() => setActiveTab('alerts')} label="Alerts" />
                            </div>
                        </div>

                        {loading ? (
                            <div className="space-y-4">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="animate-pulse flex items-start gap-4 p-4 rounded-xl border border-slate-100">
                                        <div className="w-10 h-10 rounded-full bg-slate-200"></div>
                                        <div className="flex-1 space-y-2">
                                            <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                                            <div className="h-3 bg-slate-200 rounded w-3/4"></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : activities.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500">
                                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                    <Activity size={32} className="text-slate-400" />
                                </div>
                                <p className="font-medium">No recent activities</p>
                                <p className="text-xs mt-1">Check back later for updates.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {activities.map((activity) => (
                                    <div key={activity.id} className="flex items-start gap-4 p-4 rounded-xl hover:bg-slate-50 transition-colors border border-slate-100">
                                        <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-slate-100 text-slate-600">
                                            <Activity size={18} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <h4 className="font-semibold text-slate-900">{activity.title}</h4>
                                                <span className="text-xs text-slate-400">{activity.time}</span>
                                            </div>
                                            <p className="text-sm text-slate-600 mt-0.5">{activity.detail}</p>
                                        </div>
                                        <button className="text-slate-400 hover:text-slate-600">
                                            <MoreHorizontal size={18} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </div>

                {/* RIGHT COLUMN (Sidebar Style) */}
                <div className="xl:w-80 space-y-6">

                    {/* Live Notifications */}
                    {showNotifications && (
                        <div className="animate-in fade-in zoom-in-95 duration-200 origin-top-right relative">
                            <div className="absolute -top-2 right-6 w-4 h-4 bg-white transform rotate-45 border-t border-l border-slate-200 z-10"></div>
                            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200 p-5 relative z-0">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-bold text-slate-900 flex items-center gap-2">
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
                                        className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-full transition-colors"
                                    >
                                        &times;
                                    </button>
                                </div>
                                <div className="text-center py-6 text-slate-500">
                                    <Bell size={24} className="mx-auto mb-2 text-slate-300" />
                                    <p className="text-xs">No new notifications</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Widgets Box */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                        <h3 className="font-bold text-slate-900 mb-4">Widgets</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <WidgetButton icon={<Calendar size={20} />} label="Calendar" color="bg-indigo-50 text-indigo-600" />
                            <WidgetButton icon={<CheckCircle size={20} />} label="To-Do" color="bg-emerald-50 text-emerald-600" />
                            <WidgetButton icon={<Users size={20} />} label="Groups" color="bg-amber-50 text-amber-600" onClick={() => navigate('/groups')} />
                            <WidgetButton
                                icon={
                                    <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="lucide">
                                        <path d="M4 4v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8.342a2 2 0 0 0-.602-1.43l-4.44-4.342A2 2 0 0 0 13.56 2H6a2 2 0 0 0-2 2z" />
                                        <path d="M14 2v6h6" />
                                        <path d="M10 13h4" />
                                        <path d="M10 17h4" />
                                    </svg>
                                }
                                label="Notion"
                                color="bg-slate-100 text-slate-700"
                            />
                        </div>
                    </div>

                    {/* V-Board Card (Hidden for Librarians) */}
                    {user.role !== 'LIBRARIAN' && (
                        <div
                            onClick={() => window.open('/vboard/index.html', '_blank')}
                            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 p-6 text-white text-center shadow-lg group cursor-pointer"
                        >
                            <div className="absolute top-0 right-0 p-3 opacity-20 transform group-hover:scale-110 transition-transform">
                                <Sparkles size={60} />
                            </div>
                            <h3 className="text-xl font-bold mb-2 relative z-10">V-Board</h3>
                            <p className="text-indigo-100 text-sm mb-4 relative z-10">Collaborate with your team in real-time.</p>
                            <button className="bg-white text-indigo-700 px-4 py-2 rounded-lg font-bold text-sm hover:bg-indigo-50 transition-colors shadow-sm w-full relative z-10">
                                Launch Board
                            </button>
                        </div>
                    )}

                    {/* Library Workstation Card (Librarians Only) */}
                    {user.role === 'LIBRARIAN' && (
                        <div
                            onClick={() => navigate('/management/library-workstation')}
                            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 p-6 text-white text-center shadow-lg group cursor-pointer"
                        >
                            <div className="absolute top-0 right-0 p-3 opacity-20 transform group-hover:scale-110 transition-transform">
                                <ScanLine size={60} />
                            </div>
                            <h3 className="text-xl font-bold mb-2 relative z-10">📚 Library Workstation</h3>
                            <p className="text-amber-100 text-sm mb-4 relative z-10">Issue & Return books with mobile scanner.</p>
                            <button className="bg-white text-amber-700 px-4 py-2 rounded-lg font-bold text-sm hover:bg-amber-50 transition-colors shadow-sm w-full relative z-10">
                                Open Workstation
                            </button>
                        </div>
                    )}

                </div>
            </div>

        </div>
    );
};

// --- Helper Components ---
const StatCard = ({ icon, label, value, trend, color, loading }) => (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start mb-3">
            <div className={`p-2 rounded-lg bg-${color}-50`}>
                {icon}
            </div>
            {loading ? (
                <div className="h-4 w-12 bg-slate-200 rounded animate-pulse"></div>
            ) : (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    {trend}
                </span>
            )}
        </div>
        {loading ? (
            <div className="h-8 w-16 bg-slate-200 rounded animate-pulse mb-1"></div>
        ) : (
            <div className="text-2xl font-bold text-slate-900 mb-0.5">{value}</div>
        )}
        <div className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</div>
    </div>
);

const WidgetButton = ({ icon, label, color, onClick }) => (
    <button
        onClick={onClick}
        className={`flex flex-col items-center justify-center p-3 rounded-xl transition-transform hover:scale-105 ${color}`}
    >
        <div className="mb-1">{icon}</div>
        <span className="text-xs font-semibold">{label}</span>
    </button>
);

const TabButton = ({ active, onClick, label }) => (
    <button
        onClick={onClick}
        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
    >
        {label}
    </button>
);

export default ManagementDashboard;
