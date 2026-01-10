import React, { useState, useEffect } from 'react';
import {
    FileText,
    CheckCircle,
    XCircle,
    Clock,
    Eye,
    X,
    AlertCircle,
    User,
    Calendar,
    GraduationCap,
    ChevronRight,
    Filter,
    RefreshCw,
    Bell
} from 'lucide-react';
import { getAuth } from '../../utils/authStorage';
import AdminNoticeManager from '../../components/management/AdminNoticeManager';

// Use dynamic hostname for OCR backend
const API_BASE = `http://${window.location.hostname}:8000`;

const Work = () => {
    // Get user from localStorage to check role
    const auth = getAuth('management');
    const adminUser = auth.user || {};
    const userRole = adminUser.managementRole || adminUser.role || 'FACULTY';

    // If ADMIN (Registrar), show notice management instead of marksheet verification
    if (userRole === 'ADMIN') {
        return <AdminNoticeManager />;
    }

    // For FACULTY role, show "no work tasks" message
    if (userRole === 'FACULTY') {
        return (
            <div className="max-w-[1400px] mx-auto p-6 md:p-8">
                <div className="text-center py-20 bg-white rounded-2xl border border-slate-100">
                    <Bell className="mx-auto mb-4 text-slate-300" size={64} />
                    <h3 className="text-2xl font-semibold text-slate-700 mb-2">No Pending Work Tasks</h3>
                    <p className="text-slate-400">Check back later for assignments or visit the Groups section to view notices.</p>
                </div>
            </div>
        );
    }

    // MODERATOR and others continue with marksheet verification below
    const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'history'
    const [pendingMarksheets, setPendingMarksheets] = useState([]);
    const [verifiedMarksheets, setVerifiedMarksheets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedMarksheet, setSelectedMarksheet] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [adminComment, setAdminComment] = useState('');
    const [actionLoading, setActionLoading] = useState(false);


    // Fetch pending marksheets
    const fetchPendingMarksheets = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/admin/marksheets/pending`);
            const data = await res.json();
            setPendingMarksheets(data.pending_marksheets || []);
        } catch (error) {
            console.error('Error fetching pending marksheets:', error);
        } finally {
            setLoading(false);
        }
    };

    // Fetch verification history
    const fetchHistory = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/admin/marksheets/history`);
            const data = await res.json();
            setVerifiedMarksheets(data.history || []);
        } catch (error) {
            console.error('Error fetching history:', error);
        }
    };

    useEffect(() => {
        fetchPendingMarksheets();
        fetchHistory();
    }, []);

    // Handle verification action
    const handleVerify = async (status) => {
        if (!selectedMarksheet) return;

        if (status === 'REJECTED' && !adminComment.trim()) {
            alert('Please provide a comment for rejection');
            return;
        }

        setActionLoading(true);
        try {
            const adminId = adminUser.id || adminUser.userId || 1;
            const url = `${API_BASE}/api/admin/marksheets/${selectedMarksheet.upload_id}/verify?status=${status}&admin_id=${adminId}&comment=${encodeURIComponent(adminComment)}`;

            const res = await fetch(url, { method: 'POST' });
            if (res.ok) {
                // Remove from pending list
                setPendingMarksheets(prev =>
                    prev.filter(m => m.upload_id !== selectedMarksheet.upload_id)
                );
                setShowModal(false);
                setSelectedMarksheet(null);
                setAdminComment('');
            } else {
                alert('Failed to verify marksheet');
            }
        } catch (error) {
            console.error('Error verifying marksheet:', error);
            alert('Error verifying marksheet');
        } finally {
            setActionLoading(false);
        }
    };

    // Open verification modal
    const openModal = (marksheet) => {
        setSelectedMarksheet(marksheet);
        setAdminComment('');
        setShowModal(true);
    };

    // Get marksheet type display name
    const getTypeDisplay = (ms) => {
        if (ms.marksheet_type === '10TH') return '10th Class';
        if (ms.marksheet_type === '12TH') return '12th Class';
        if (ms.marksheet_type === 'SEMESTER') return `Semester ${ms.semester}`;
        return ms.marksheet_type || 'Unknown';
    };

    // Get board display name
    const getBoardDisplay = (board) => {
        const boards = {
            CBSE: 'CBSE',
            ICSE: 'ICSE',
            UTTARAKHAND: 'UK Board',
            COLLEGE: 'College',
            OTHER: 'Other'
        };
        return boards[board] || board || 'Unknown';
    };

    // Format date
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

    return (
        <div className="max-w-[1400px] mx-auto p-6 md:p-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <FileText className="text-amber-600" size={28} />
                        Marksheet Verification
                    </h1>
                    <p className="text-slate-500 mt-1">Review and verify student marksheet uploads</p>
                </div>
                <button
                    onClick={fetchPendingMarksheets}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
                >
                    <RefreshCw size={16} />
                    Refresh
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
                <button
                    onClick={() => setActiveTab('pending')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all ${activeTab === 'pending'
                        ? 'bg-amber-500 text-white shadow-lg shadow-amber-200'
                        : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                        }`}
                >
                    <Clock size={18} />
                    Pending Queue
                    {pendingMarksheets.length > 0 && (
                        <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-sm">
                            {pendingMarksheets.length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all ${activeTab === 'history'
                        ? 'bg-amber-500 text-white shadow-lg shadow-amber-200'
                        : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                        }`}
                >
                    <CheckCircle size={18} />
                    Verification History
                </button>
            </div>

            {/* Pending Queue */}
            {activeTab === 'pending' && (
                <div className="space-y-4">
                    {loading ? (
                        <div className="text-center py-16 text-slate-400">
                            <RefreshCw className="animate-spin mx-auto mb-4" size={32} />
                            Loading pending marksheets...
                        </div>
                    ) : pendingMarksheets.length === 0 ? (
                        <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
                            <CheckCircle className="mx-auto mb-4 text-green-400" size={48} />
                            <h3 className="text-lg font-semibold text-slate-700">All caught up!</h3>
                            <p className="text-slate-400">No marksheets pending verification</p>
                        </div>
                    ) : (
                        pendingMarksheets.map((ms) => (
                            <div
                                key={ms.upload_id}
                                className="bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-lg transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
                                        <User className="text-amber-600" size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-slate-800">
                                            {ms.full_name || ms.student_name_extracted || 'Unknown Student'}
                                        </h3>
                                        <p className="text-sm text-slate-500">{ms.email}</p>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {/* Student Request Badge */}
                                            {ms.admin_comment && ms.admin_comment.includes('[STUDENT REQUEST:') && (
                                                <span className="px-2 py-1 bg-red-100 text-red-600 text-xs font-bold rounded-lg animate-pulse">
                                                    📩 {ms.admin_comment.includes('REUPLOAD') ? 'Re-upload Request' : 'Correction Request'}
                                                </span>
                                            )}
                                            <span className="px-2 py-1 bg-blue-50 text-blue-600 text-xs font-medium rounded-lg">
                                                {getTypeDisplay(ms)}
                                            </span>
                                            <span className="px-2 py-1 bg-purple-50 text-purple-600 text-xs font-medium rounded-lg">
                                                {getBoardDisplay(ms.board_type)}
                                            </span>
                                            <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-lg flex items-center gap-1">
                                                <Calendar size={12} />
                                                {formatDate(ms.uploaded_at)}
                                            </span>
                                        </div>
                                        {/* Student Request Message */}
                                        {ms.admin_comment && ms.admin_comment.includes('[STUDENT REQUEST:') && (
                                            <div className="mt-2 p-2 bg-red-50 border-l-3 border-red-400 rounded text-xs text-red-700">
                                                <strong>Student Message:</strong> {ms.admin_comment.replace(/\[STUDENT REQUEST: ?(REUPLOAD|CORRECTION)\] ?/, '')}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={() => openModal(ms)}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-xl transition-colors shadow-lg shadow-amber-200/50"
                                >
                                    <Eye size={18} />
                                    Review
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
                <div className="space-y-4">
                    {verifiedMarksheets.length === 0 ? (
                        <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
                            <FileText className="mx-auto mb-4 text-slate-300" size={48} />
                            <h3 className="text-lg font-semibold text-slate-700">No Verification History</h3>
                            <p className="text-slate-400">Verified marksheets will appear here</p>
                        </div>
                    ) : (
                        verifiedMarksheets.map((ms) => (
                            <div
                                key={ms.upload_id}
                                className="bg-white rounded-2xl border border-slate-100 p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                            >
                                <div className="flex items-start gap-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${ms.status === 'APPROVED' ? 'bg-green-50' : 'bg-red-50'}`}>
                                        {ms.status === 'APPROVED' ? (
                                            <CheckCircle className="text-green-600" size={24} />
                                        ) : (
                                            <XCircle className="text-red-600" size={24} />
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-slate-800">
                                            {ms.full_name || ms.student_name_extracted || 'Unknown Student'}
                                        </h3>
                                        <p className="text-sm text-slate-500">{ms.email}</p>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            <span className={`px-2 py-1 text-xs font-bold rounded-lg ${ms.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {ms.status === 'APPROVED' ? '✓ Approved' : '✗ Rejected'}
                                            </span>
                                            <span className="px-2 py-1 bg-blue-50 text-blue-600 text-xs font-medium rounded-lg">
                                                {getTypeDisplay(ms)}
                                            </span>
                                            <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-lg flex items-center gap-1">
                                                <Calendar size={12} />
                                                {formatDate(ms.verified_at)}
                                            </span>
                                        </div>
                                        {ms.admin_comment && !ms.admin_comment.startsWith('[STUDENT REQUEST:') && (
                                            <p className="text-xs text-slate-500 mt-2 italic">Comment: {ms.admin_comment}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="text-right text-sm text-slate-400">
                                    By: {ms.verifier_name || 'Unknown'}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Verification Modal */}
            {showModal && selectedMarksheet && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl">
                        {/* Modal Header */}
                        <div className="flex justify-between items-center p-6 border-b border-slate-100">
                            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <Eye className="text-amber-600" size={24} />
                                Review Marksheet
                            </h2>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                            >
                                <X size={20} className="text-slate-400" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Left: Marksheet Image */}
                                <div>
                                    <h3 className="font-semibold text-slate-700 mb-3">Uploaded Document</h3>
                                    <div className="bg-slate-100 rounded-xl p-4 min-h-[300px] flex items-center justify-center">
                                        {selectedMarksheet.image_url ? (
                                            <img
                                                src={`${API_BASE}/uploads/${selectedMarksheet.image_url}`}
                                                alt="Marksheet"
                                                className="max-w-full max-h-[400px] object-contain rounded-lg"
                                                onError={(e) => {
                                                    e.target.src = '';
                                                    e.target.parentElement.innerHTML = '<p class="text-slate-400">Image not available</p>';
                                                }}
                                            />
                                        ) : (
                                            <p className="text-slate-400">No image available</p>
                                        )}
                                    </div>
                                </div>

                                {/* Right: Details */}
                                <div className="space-y-6">
                                    {/* Student Info */}
                                    <div>
                                        <h3 className="font-semibold text-slate-700 mb-3">Student Information</h3>
                                        <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">Name:</span>
                                                <span className="font-medium">{selectedMarksheet.full_name || selectedMarksheet.student_name_extracted || 'N/A'}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">Email:</span>
                                                <span className="font-medium">{selectedMarksheet.email || 'N/A'}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">Roll No:</span>
                                                <span className="font-medium">{selectedMarksheet.roll_number || 'N/A'}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">Type:</span>
                                                <span className="font-medium">{getTypeDisplay(selectedMarksheet)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">Board:</span>
                                                <span className="font-medium">{getBoardDisplay(selectedMarksheet.board_type)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">Uploaded:</span>
                                                <span className="font-medium">{formatDate(selectedMarksheet.uploaded_at)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Correction Request Comparison View */}
                                    {selectedMarksheet.admin_comment && selectedMarksheet.admin_comment.includes('[STUDENT REQUEST: CORRECTION]') && selectedMarksheet.raw_json_data && (() => {
                                        let correctionData;
                                        try {
                                            correctionData = typeof selectedMarksheet.raw_json_data === 'string'
                                                ? JSON.parse(selectedMarksheet.raw_json_data)
                                                : selectedMarksheet.raw_json_data;
                                        } catch { correctionData = null; }

                                        if (!correctionData || !correctionData.marks) return null;

                                        const originalMarks = selectedMarksheet.marks || [];
                                        const requestedMarks = correctionData.marks || [];

                                        return (
                                            <div>
                                                <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                                    <AlertCircle className="text-amber-500" size={18} />
                                                    Correction Request Comparison
                                                </h3>
                                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3 text-sm text-amber-700">
                                                    <strong>Student requested corrections:</strong> Green = New Value, Red strikethrough = Old Value
                                                </div>
                                                <div className="bg-slate-50 rounded-xl overflow-hidden">
                                                    <table className="w-full text-sm">
                                                        <thead className="bg-slate-100">
                                                            <tr>
                                                                <th className="text-left p-3 font-medium text-slate-600">Subject</th>
                                                                <th className="text-center p-3 font-medium text-slate-600">Marks</th>
                                                                <th className="text-center p-3 font-medium text-slate-600">Grade</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {requestedMarks.map((newMark, idx) => {
                                                                const oldMark = originalMarks[idx] || {};
                                                                const marksChanged = oldMark.marks_obtained !== newMark.marks_obtained;
                                                                const gradeChanged = oldMark.grade !== newMark.grade;

                                                                return (
                                                                    <tr key={idx} className="border-t border-slate-100">
                                                                        <td className="p-3 text-slate-700">{newMark.subject_name_raw || 'Unknown'}</td>
                                                                        <td className="p-3 text-center">
                                                                            {marksChanged ? (
                                                                                <div>
                                                                                    <span className="text-green-600 font-bold">{newMark.marks_obtained || '-'}</span>
                                                                                    <span className="text-slate-400">/{newMark.marks_total || '-'}</span>
                                                                                    <div className="text-red-500 line-through text-xs">{oldMark.marks_obtained || '-'}</div>
                                                                                </div>
                                                                            ) : (
                                                                                <span className="text-slate-700">{newMark.marks_obtained || '-'}/{newMark.marks_total || '-'}</span>
                                                                            )}
                                                                        </td>
                                                                        <td className="p-3 text-center">
                                                                            {gradeChanged ? (
                                                                                <div>
                                                                                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-bold">{newMark.grade || '-'}</span>
                                                                                    <div className="text-red-500 line-through text-xs mt-1">{oldMark.grade || '-'}</div>
                                                                                </div>
                                                                            ) : (
                                                                                <span className="px-2 py-1 bg-green-50 text-green-600 rounded-lg text-xs font-medium">{newMark.grade || '-'}</span>
                                                                            )}
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* Regular Extracted Marks (show only if NOT a correction request) */}
                                    {selectedMarksheet.marks && selectedMarksheet.marks.length > 0 &&
                                        !(selectedMarksheet.admin_comment && selectedMarksheet.admin_comment.includes('[STUDENT REQUEST: CORRECTION]')) && (
                                            <div>
                                                <h3 className="font-semibold text-slate-700 mb-3">Extracted Subjects</h3>
                                                <div className="bg-slate-50 rounded-xl overflow-hidden">
                                                    <table className="w-full text-sm">
                                                        <thead className="bg-slate-100">
                                                            <tr>
                                                                <th className="text-left p-3 font-medium text-slate-600">Subject</th>
                                                                <th className="text-center p-3 font-medium text-slate-600">Marks</th>
                                                                <th className="text-center p-3 font-medium text-slate-600">Grade</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {selectedMarksheet.marks.map((mark, idx) => (
                                                                <tr key={idx} className="border-t border-slate-100">
                                                                    <td className="p-3 text-slate-700">{mark.subject_name_raw || 'Unknown'}</td>
                                                                    <td className="p-3 text-center text-slate-700">
                                                                        {mark.marks_obtained || '-'}/{mark.marks_total || '-'}
                                                                    </td>
                                                                    <td className="p-3 text-center">
                                                                        <span className="px-2 py-1 bg-green-50 text-green-600 rounded-lg text-xs font-medium">
                                                                            {mark.grade || '-'}
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}

                                    {/* Admin Comment */}
                                    <div>
                                        <h3 className="font-semibold text-slate-700 mb-3">
                                            Admin Comment
                                            <span className="text-slate-400 font-normal text-sm ml-2">(required for rejection)</span>
                                        </h3>
                                        <textarea
                                            value={adminComment}
                                            onChange={(e) => setAdminComment(e.target.value)}
                                            placeholder="Enter feedback for student (e.g., image unclear, wrong document, etc.)"
                                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none h-24"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Modal Actions */}
                        <div className="flex justify-end gap-3 p-6 border-t border-slate-100 bg-slate-50">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-6 py-3 text-slate-600 hover:bg-slate-200 rounded-xl transition-colors font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleVerify('REJECTED')}
                                disabled={actionLoading}
                                className="flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors font-medium shadow-lg shadow-red-200/50 disabled:opacity-50"
                            >
                                <XCircle size={18} />
                                Reject
                            </button>
                            <button
                                onClick={() => handleVerify('APPROVED')}
                                disabled={actionLoading}
                                className="flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl transition-colors font-medium shadow-lg shadow-green-200/50 disabled:opacity-50"
                            >
                                <CheckCircle size={18} />
                                Approve
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Work;
