import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Home,
    FileText,
    Users,
    BookOpen,
    Settings,
    LogOut,
    BarChart3,
    UserCog,
    GraduationCap,
    Library,
    ClipboardList,
    MessageSquare,
    Sparkles
} from 'lucide-react';

// Role hierarchy for permission checks
const ROLE_HIERARCHY = {
    ADMIN: 4,      // Registrar - all permissions
    MODERATOR: 3,  // ERP Admin
    FACULTY: 2,    // Teacher
    LIBRARIAN: 1,  // Librarian
    STUDENT: 0     // Not allowed in management
};

// Sidebar items configuration per role - matching student layout
const SIDEBAR_CONFIG = {
    ADMIN: [
        { id: 'dashboard', label: 'Dashboard', icon: Home, path: '/management/dashboard' },
        { id: 'work', label: 'Work', icon: BookOpen, path: '/management/work' },
        { id: 'groups', label: 'Groups', icon: Users, path: '/groups' },
        { id: 'library', label: 'Library', icon: Library, path: '/library/admin' },
        { id: 'meetings', label: 'Meetings', icon: ClipboardList, path: '/meeting' },
        { id: 'messages', label: 'Messages', icon: MessageSquare, path: '/messages' },
    ],
    MODERATOR: [
        { id: 'dashboard', label: 'Dashboard', icon: Home, path: '/management/dashboard' },
        { id: 'work', label: 'Work', icon: BookOpen, path: '/management/work' },
        { id: 'groups', label: 'Groups', icon: Users, path: '/groups' },
        { id: 'library', label: 'Library', icon: Library, path: '/student/library' },
        { id: 'meetings', label: 'Meetings', icon: ClipboardList, path: '/meeting' },
        { id: 'messages', label: 'Messages', icon: MessageSquare, path: '/messages' },
    ],
    FACULTY: [
        { id: 'dashboard', label: 'Dashboard', icon: Home, path: '/management/dashboard' },
        { id: 'work', label: 'Work', icon: BookOpen, path: '/management/work' },
        { id: 'groups', label: 'Groups', icon: Users, path: '/groups' },
        { id: 'library', label: 'Library', icon: Library, path: '/student/library' },
        { id: 'meetings', label: 'Meetings', icon: ClipboardList, path: '/meeting' },
        { id: 'messages', label: 'Messages', icon: MessageSquare, path: '/messages' },
    ],
    LIBRARIAN: [
        { id: 'dashboard', label: 'Dashboard', icon: Home, path: '/management/dashboard' },
        { id: 'work', label: 'Work', icon: BookOpen, path: '/management/work' },
        { id: 'groups', label: 'Groups', icon: Users, path: '/groups' },
        { id: 'library', label: 'Library', icon: Library, path: '/library/admin' },
        { id: 'meetings', label: 'Meetings', icon: ClipboardList, path: '/meeting' },
        { id: 'messages', label: 'Messages', icon: MessageSquare, path: '/messages' },
    ]
};

const ManagementLayout = ({ children }) => {
    const navigate = useNavigate();
    const location = useLocation();

    // Get user data from localStorage (management-specific key)
    const getUserData = () => {
        try {
            const userData = localStorage.getItem('management_user');
            return userData ? JSON.parse(userData) : null;
        } catch {
            return null;
        }
    };

    const user = getUserData();
    // Use managementRole (from UI selection/DB) for role-based access
    const userRole = user?.managementRole || user?.role || 'FACULTY';
    const sidebarItems = SIDEBAR_CONFIG[userRole] || SIDEBAR_CONFIG.FACULTY;

    const handleLogout = () => {
        localStorage.removeItem('management_token');
        localStorage.removeItem('management_user');
        localStorage.removeItem('management_sessionId');
        navigate('/management/login');
    };

    const getRoleDisplayName = (role) => {
        const roleNames = {
            ADMIN: 'Registrar',
            MODERATOR: 'ERP Admin',
            FACULTY: 'Teacher',
            LIBRARIAN: 'Librarian'
        };
        return roleNames[role] || role;
    };

    return (
        <div className="flex h-screen bg-slate-50 font-sans text-slate-800">
            {/* Sidebar */}
            <aside className="w-64 bg-slate-900 text-white flex flex-col hidden md:flex shrink-0">
                {/* Logo Section */}
                <div className="p-6 border-b border-slate-700">
                    <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
                        <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center text-slate-900">
                            <Settings size={18} />
                        </div>
                        <span className="text-white">Management</span>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="p-4 space-y-1 flex-1 overflow-y-auto">
                    {sidebarItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;

                        return (
                            <button
                                key={item.id}
                                onClick={() => navigate(item.path)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all mb-1
                                    ${isActive
                                        ? 'bg-amber-500/20 text-amber-400 font-semibold'
                                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
                            >
                                <Icon size={20} />
                                <span className="text-sm">{item.label}</span>
                            </button>
                        );
                    })}
                </nav>

                {/* User Profile & Logout */}
                <div className="p-4 border-t border-slate-700">
                    <div className="bg-slate-800 rounded-xl p-4 mb-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center text-slate-900 font-bold text-lg">
                                {user?.fullName?.charAt(0) || user?.username?.charAt(0) || 'U'}
                            </div>
                            <div className="overflow-hidden flex-1">
                                <h4 className="font-semibold text-sm truncate text-white">
                                    {user?.fullName || user?.username || 'User'}
                                </h4>
                                <p className="text-xs text-amber-400 truncate">
                                    {getRoleDisplayName(userRole)}
                                </p>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl 
                            bg-slate-800 text-slate-300 hover:bg-red-500/20 hover:text-red-400 transition-all"
                    >
                        <LogOut size={18} />
                        <span className="text-sm font-medium">Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto">
                {children}
            </main>
        </div>
    );
};

export default ManagementLayout;
