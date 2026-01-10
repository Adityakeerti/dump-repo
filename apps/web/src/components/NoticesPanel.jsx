import React, { useState, useEffect } from 'react';
import { Bell, Clock, Eye, CheckCircle, RefreshCw, AlertCircle } from 'lucide-react';

// Use proxy path - Vite routes /api/notices to backend-chat
const CHAT_API_BASE = '';

const NoticesPanel = ({ groupId, user }) => {
    const [notices, setNotices] = useState([]);
    const [loading, setLoading] = useState(true);

    const userRole = user?.role || user?.managementRole || 'STUDENT';
    const userId = user?.userId || user?.id;

    useEffect(() => {
        fetchNotices();
    }, [groupId, userRole]);

    const fetchNotices = async () => {
        setLoading(true);
        try {
            let allNotices = [];

            // Fetch role-based notices (general notices for user's role)
            const roleRes = await fetch(`${CHAT_API_BASE}/api/notices?role=${userRole}`);
            if (roleRes.ok) {
                const roleNotices = await roleRes.json();
                allNotices = [...roleNotices];
            }

            // If we have a groupId, also fetch group-specific notices
            if (groupId && groupId !== 'MASTER_GROUP') {
                const groupRes = await fetch(`${CHAT_API_BASE}/api/notices/group/${groupId}`);
                if (groupRes.ok) {
                    const groupNotices = await groupRes.json();
                    // Merge and deduplicate
                    groupNotices.forEach(gn => {
                        if (!allNotices.find(n => n.id === gn.id)) {
                            allNotices.push(gn);
                        }
                    });
                }
            }

            // Sort by date (newest first)
            allNotices.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            setNotices(allNotices);
        } catch (error) {
            console.error('Error fetching notices:', error);
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (noticeId) => {
        if (!userId) return;
        try {
            await fetch(`${CHAT_API_BASE}/api/notices/${noticeId}/read?userId=${userId}`, {
                method: 'PUT'
            });
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;

        return date.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        });
    };

    const getRoleBadgeColor = (role) => {
        const colors = {
            ALL: 'bg-blue-100 text-blue-700',
            STUDENT: 'bg-green-100 text-green-700',
            FACULTY: 'bg-purple-100 text-purple-700',
            MODERATOR: 'bg-amber-100 text-amber-700',
            ADMIN: 'bg-red-100 text-red-700'
        };
        return colors[role] || 'bg-gray-100 text-gray-700';
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-slate-50">
                <div className="text-center">
                    <RefreshCw className="animate-spin mx-auto mb-3 text-slate-400" size={32} />
                    <p className="text-slate-500">Loading notices...</p>
                </div>
            </div>
        );
    }

    if (notices.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center bg-slate-50">
                <div className="text-center">
                    <Bell className="mx-auto mb-4 text-slate-300" size={48} />
                    <h3 className="text-lg font-semibold text-slate-700 mb-1">No Notices</h3>
                    <p className="text-slate-400 text-sm">You're all caught up!</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto bg-slate-50 p-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                    <Bell size={18} className="text-amber-500" />
                    Notices ({notices.length})
                </h3>
                <button
                    onClick={fetchNotices}
                    className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-200 rounded-lg transition-colors"
                >
                    <RefreshCw size={16} />
                </button>
            </div>

            <div className="space-y-3">
                {notices.map((notice) => (
                    <div
                        key={notice.id}
                        onClick={() => markAsRead(notice.id)}
                        className="bg-white rounded-xl border border-slate-100 p-4 hover:shadow-md transition-all cursor-pointer"
                    >
                        <div className="flex justify-between items-start gap-3 mb-2">
                            <h4 className="font-semibold text-slate-800">{notice.title}</h4>
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getRoleBadgeColor(notice.targetRole)}`}>
                                {notice.targetRole === 'ALL' ? 'Everyone' : notice.targetRole}
                            </span>
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed mb-3">{notice.content}</p>
                        <div className="flex items-center gap-3 text-xs text-slate-400">
                            <span className="flex items-center gap-1">
                                <Clock size={12} />
                                {formatDate(notice.createdAt)}
                            </span>
                            {notice.createdByName && (
                                <span>By: {notice.createdByName}</span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default NoticesPanel;
