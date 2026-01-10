import React, { useState, useEffect } from 'react';
import {
    Bell,
    Plus,
    Send,
    Users,
    GraduationCap,
    Shield,
    UserCog,
    Trash2,
    Eye,
    X,
    Clock,
    CheckCircle,
    RefreshCw,
    AlertCircle
} from 'lucide-react';
import { getAuth } from '../../utils/authStorage';

// Use proxy path - Vite routes /api/notices to backend-chat
const API_BASE = '';

const AdminNoticeManager = () => {
    const [activeTab, setActiveTab] = useState('create'); // 'create' | 'history'
    const [notices, setNotices] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    // Form state
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [targetRole, setTargetRole] = useState('ALL');
    const [sending, setSending] = useState(false);

    // Get admin user
    const auth = getAuth('management');
    const adminUser = auth.user || {};

    const targetRoleOptions = [
        { value: 'ALL', label: 'Everyone', icon: <Users size={16} />, color: 'bg-blue-50 text-blue-600 border-blue-200' },
        { value: 'STUDENT', label: 'Students Only', icon: <GraduationCap size={16} />, color: 'bg-green-50 text-green-600 border-green-200' },
        { value: 'FACULTY', label: 'Teachers Only', icon: <UserCog size={16} />, color: 'bg-purple-50 text-purple-600 border-purple-200' },
        { value: 'MODERATOR', label: 'ERP Admins Only', icon: <Shield size={16} />, color: 'bg-amber-50 text-amber-600 border-amber-200' },
    ];

    useEffect(() => {
        if (activeTab === 'history') {
            fetchNotices();
        }
    }, [activeTab]);

    const fetchNotices = async () => {
        setLoading(true);
        try {
            const adminId = adminUser.id || adminUser.userId;
            const res = await fetch(`${API_BASE}/api/notices/all`);
            const data = await res.json();
            setNotices(data || []);
        } catch (error) {
            console.error('Error fetching notices:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title.trim() || !content.trim()) {
            alert('Please fill in title and content');
            return;
        }

        setSending(true);
        try {
            const res = await fetch(`${API_BASE}/api/notices`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: title.trim(),
                    content: content.trim(),
                    targetRole,
                    groupId: null,
                    createdBy: adminUser.id || adminUser.userId,
                    createdByName: adminUser.fullName || adminUser.name || 'Admin'
                })
            });

            if (res.ok) {
                setShowSuccessModal(true);
                setTitle('');
                setContent('');
                setTargetRole('ALL');
                setTimeout(() => setShowSuccessModal(false), 3000);
            } else {
                alert('Failed to send notice');
            }
        } catch (error) {
            console.error('Error sending notice:', error);
            alert('Error sending notice. Make sure the backend is running.');
        } finally {
            setSending(false);
        }
    };

    const handleDelete = async (noticeId) => {
        if (!confirm('Are you sure you want to delete this notice?')) return;

        try {
            const adminId = adminUser.id || adminUser.userId;
            const res = await fetch(`${API_BASE}/api/notices/${noticeId}?adminId=${adminId}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                setNotices(prev => prev.filter(n => n.id !== noticeId));
            }
        } catch (error) {
            console.error('Error deleting notice:', error);
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getRoleBadge = (role) => {
        const option = targetRoleOptions.find(o => o.value === role);
        if (!option) return <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-lg">{role}</span>;
        return (
            <span className={`px-2 py-1 text-xs rounded-lg flex items-center gap-1 ${option.color}`}>
                {option.icon}
                {option.label}
            </span>
        );
    };

    return (
        <div className="max-w-[1200px] mx-auto p-6 md:p-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                        <div className="p-2 bg-amber-100 rounded-xl">
                            <Bell className="text-amber-600" size={28} />
                        </div>
                        Notice Management
                    </h1>
                    <p className="text-slate-500 mt-1">Create and manage notices for students, teachers, and staff</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
                <button
                    onClick={() => setActiveTab('create')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all ${activeTab === 'create'
                        ? 'bg-amber-500 text-white shadow-lg shadow-amber-200'
                        : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                        }`}
                >
                    <Plus size={18} />
                    Create Notice
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all ${activeTab === 'history'
                        ? 'bg-amber-500 text-white shadow-lg shadow-amber-200'
                        : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                        }`}
                >
                    <Clock size={18} />
                    Notice History
                    {notices.length > 0 && (
                        <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-sm">
                            {notices.length}
                        </span>
                    )}
                </button>
            </div>

            {/* Create Notice Form */}
            {activeTab === 'create' && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Title */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Notice Title
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g., Holiday Announcement, Exam Schedule..."
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                                required
                            />
                        </div>

                        {/* Content */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Notice Content
                            </label>
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="Write your notice content here..."
                                rows={5}
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all resize-none"
                                required
                            />
                        </div>

                        {/* Target Role Selection */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-3">
                                Who should see this notice?
                            </label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {targetRoleOptions.map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => setTargetRole(option.value)}
                                        className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${targetRole === option.value
                                            ? 'border-amber-500 bg-amber-50'
                                            : 'border-slate-200 hover:border-slate-300'
                                            }`}
                                    >
                                        <div className={`p-2 rounded-lg ${option.color.split(' ')[0]}`}>
                                            {option.icon}
                                        </div>
                                        <span className="text-sm font-medium text-slate-700">{option.label}</span>
                                        {targetRole === option.value && (
                                            <CheckCircle size={16} className="text-amber-500" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="flex justify-end pt-4">
                            <button
                                type="submit"
                                disabled={sending}
                                className="flex items-center gap-2 px-8 py-3 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-xl transition-colors shadow-lg shadow-amber-200/50 disabled:opacity-50"
                            >
                                {sending ? (
                                    <>
                                        <RefreshCw size={18} className="animate-spin" />
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <Send size={18} />
                                        Send Notice
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Notice History */}
            {activeTab === 'history' && (
                <div className="space-y-4">
                    <div className="flex justify-end">
                        <button
                            onClick={fetchNotices}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
                        >
                            <RefreshCw size={16} />
                            Refresh
                        </button>
                    </div>

                    {loading ? (
                        <div className="text-center py-16 text-slate-400">
                            <RefreshCw className="animate-spin mx-auto mb-4" size={32} />
                            Loading notices...
                        </div>
                    ) : notices.length === 0 ? (
                        <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
                            <Bell className="mx-auto mb-4 text-slate-300" size={48} />
                            <h3 className="text-lg font-semibold text-slate-700">No Notices Yet</h3>
                            <p className="text-slate-400">Create your first notice to get started</p>
                        </div>
                    ) : (
                        notices.map((notice) => (
                            <div
                                key={notice.id}
                                className="bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-lg transition-all"
                            >
                                <div className="flex justify-between items-start gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="font-semibold text-slate-800 text-lg">{notice.title}</h3>
                                            {getRoleBadge(notice.targetRole)}
                                        </div>
                                        <p className="text-slate-600 text-sm leading-relaxed mb-3">{notice.content}</p>
                                        <div className="flex items-center gap-4 text-xs text-slate-400">
                                            <span className="flex items-center gap-1">
                                                <Clock size={12} />
                                                {formatDate(notice.createdAt)}
                                            </span>
                                            <span>By: {notice.createdByName || 'Admin'}</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(notice.id)}
                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Delete Notice"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Success Modal */}
            {showSuccessModal && (
                <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
                    <div className="bg-green-500 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce">
                        <CheckCircle size={24} />
                        <span className="font-medium">Notice sent successfully!</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminNoticeManager;
