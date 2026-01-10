import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ScanLine,
    BookOpen,
    ArrowLeftRight,
    Users,
    CheckCircle,
    XCircle,
    Loader,
    RefreshCw,
    Smartphone,
    Monitor,
    ArrowLeft
} from 'lucide-react';

const LibrarianWorkstation = () => {
    const navigate = useNavigate();
    const [mode, setMode] = useState(null); // 'issue' or 'return'
    const [isPolling, setIsPolling] = useState(false);
    const [scanData, setScanData] = useState(null);
    const [users, setUsers] = useState([]);
    const [selectedUserId, setSelectedUserId] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [lastScanTimestamp, setLastScanTimestamp] = useState(0);

    // Get backend URL - use relative path for Vite proxy
    const getBackendUrl = () => {
        return ''; // Empty - use relative URLs, Vite proxy handles routing
    };

    // Poll for latest scan
    const pollForScan = useCallback(async () => {
        try {
            const response = await fetch(`${getBackendUrl()}/api/library/latest-scan`);
            if (response.ok) {
                const data = await response.json();
                if (data && data.timestamp > lastScanTimestamp) {
                    setLastScanTimestamp(data.timestamp);
                    setScanData(data);
                    setIsPolling(false);
                    showMessage('success', '✅ Book scanned successfully!');
                }
            }
        } catch (error) {
            console.error('Polling error:', error);
        }
    }, [lastScanTimestamp]);

    // Start polling when mode is set
    useEffect(() => {
        let intervalId;
        if (isPolling) {
            intervalId = setInterval(pollForScan, 2000);
        }
        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [isPolling, pollForScan]);

    // Load users when needed for issue
    useEffect(() => {
        if (mode === 'issue' && scanData) {
            loadUsers();
        }
    }, [mode, scanData]);

    const loadUsers = async () => {
        try {
            const response = await fetch(`${getBackendUrl()}/api/users`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                setUsers(data);
            }
        } catch (error) {
            console.error('Error loading users:', error);
        }
    };

    const showMessage = (type, text) => {
        setMessage({ type, text });
        setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    };

    const startIssueProcess = () => {
        setMode('issue');
        setScanData(null);
        setSelectedUserId('');
        setLastScanTimestamp(Date.now());
        setIsPolling(true);
        showMessage('info', '📱 Waiting for barcode scan from mobile device...');
    };

    const startReturnProcess = () => {
        setMode('return');
        setScanData(null);
        setLastScanTimestamp(Date.now());
        setIsPolling(true);
        showMessage('info', '📱 Waiting for barcode scan from mobile device...');
    };

    const completeIssue = async () => {
        if (!selectedUserId || !scanData?.book_info) {
            showMessage('error', 'Please select a user');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`${getBackendUrl()}/api/library/issue`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    userId: parseInt(selectedUserId),
                    barcodeId: scanData.book_info.barcode_id
                })
            });

            const result = await response.json();
            if (result.success) {
                showMessage('success', '✅ Book issued successfully!');
                setTimeout(() => resetProcess(), 2000);
            } else {
                showMessage('error', result.error || 'Failed to issue book');
            }
        } catch (error) {
            showMessage('error', 'Error: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const completeReturn = async () => {
        if (!scanData?.book_info) {
            showMessage('error', 'No book scanned');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`${getBackendUrl()}/api/library/return`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    barcodeId: scanData.book_info.barcode_id
                })
            });

            const result = await response.json();
            if (result.success) {
                showMessage('success', '✅ Book returned successfully!');
                setTimeout(() => resetProcess(), 2000);
            } else {
                showMessage('error', result.error || 'Failed to return book');
            }
        } catch (error) {
            showMessage('error', 'Error: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const resetProcess = () => {
        setMode(null);
        setScanData(null);
        setSelectedUserId('');
        setIsPolling(false);
    };

    const getScannerUrl = () => {
        return `${window.location.origin}/library-scanner.html`;
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-6xl mx-auto">

                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/management/dashboard')}
                            className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">📚 Librarian Workstation</h1>
                            <p className="text-slate-500">Scan books with your mobile to issue or return</p>
                        </div>
                    </div>
                    <a
                        href={getScannerUrl()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition-colors"
                    >
                        <Smartphone size={18} />
                        Open Mobile Scanner
                    </a>
                </div>

                {/* Message Banner */}
                {message.text && (
                    <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${message.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' :
                        message.type === 'error' ? 'bg-red-100 text-red-800 border border-red-200' :
                            'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}>
                        {message.type === 'success' ? <CheckCircle size={20} /> :
                            message.type === 'error' ? <XCircle size={20} /> :
                                <Loader size={20} className="animate-spin" />}
                        <span className="font-medium">{message.text}</span>
                    </div>
                )}

                {/* Mode Selection */}
                {!mode && (
                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Issue Book Card */}
                        <div
                            onClick={startIssueProcess}
                            className="bg-white rounded-2xl border-2 border-green-200 p-8 cursor-pointer hover:shadow-lg hover:border-green-400 transition-all group"
                        >
                            <div className="text-center">
                                <div className="w-20 h-20 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <BookOpen size={40} className="text-green-600" />
                                </div>
                                <h2 className="text-2xl font-bold text-green-700 mb-2">Issue Book</h2>
                                <p className="text-slate-500 mb-6">Scan book barcode and assign to a user</p>
                                <button className="w-full py-3 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition-colors">
                                    <ScanLine size={20} className="inline mr-2" />
                                    Start Issue Process
                                </button>
                            </div>
                        </div>

                        {/* Return Book Card */}
                        <div
                            onClick={startReturnProcess}
                            className="bg-white rounded-2xl border-2 border-amber-200 p-8 cursor-pointer hover:shadow-lg hover:border-amber-400 transition-all group"
                        >
                            <div className="text-center">
                                <div className="w-20 h-20 mx-auto mb-4 bg-amber-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <ArrowLeftRight size={40} className="text-amber-600" />
                                </div>
                                <h2 className="text-2xl font-bold text-amber-700 mb-2">Return Book</h2>
                                <p className="text-slate-500 mb-6">Scan book barcode to process return</p>
                                <button className="w-full py-3 bg-amber-500 text-white rounded-xl font-semibold hover:bg-amber-600 transition-colors">
                                    <ScanLine size={20} className="inline mr-2" />
                                    Start Return Process
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Active Process View */}
                {mode && (
                    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-slate-900">
                                {mode === 'issue' ? '📗 Issue Book' : '📕 Return Book'}
                            </h2>
                            <button
                                onClick={resetProcess}
                                className="px-4 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                ← Back
                            </button>
                        </div>

                        {/* Waiting for Scan */}
                        {isPolling && !scanData && (
                            <div className="text-center py-12">
                                <div className="w-24 h-24 mx-auto mb-6 bg-amber-100 rounded-full flex items-center justify-center animate-pulse">
                                    <Smartphone size={48} className="text-amber-600" />
                                </div>
                                <h3 className="text-lg font-semibold text-slate-700 mb-2">Waiting for barcode scan...</h3>
                                <p className="text-slate-500 mb-4">Open the mobile scanner on your phone and scan a book barcode</p>
                                <div className="flex items-center justify-center gap-2 text-amber-600">
                                    <RefreshCw size={18} className="animate-spin" />
                                    <span>Listening for scans every 2 seconds</span>
                                </div>

                                <div className="mt-6 p-4 bg-slate-50 rounded-xl inline-block">
                                    <div className="flex items-center gap-3">
                                        <Monitor size={20} className="text-slate-400" />
                                        <span className="text-slate-600">Scanner URL:</span>
                                        <code className="bg-white px-3 py-1 rounded border text-sm">{getScannerUrl()}</code>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Book Scanned */}
                        {scanData && (
                            <div className="space-y-6">
                                {/* Book Info Card */}
                                <div className={`p-6 rounded-xl border-2 ${scanData.found ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                                    }`}>
                                    {scanData.found && scanData.book_info ? (
                                        <>
                                            <div className="flex items-start gap-4">
                                                <div className="w-16 h-20 bg-slate-200 rounded-lg flex items-center justify-center">
                                                    <BookOpen size={32} className="text-slate-400" />
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className="text-xl font-bold text-slate-900">{scanData.book_info.title}</h3>
                                                    <p className="text-slate-600">by {scanData.book_info.author}</p>
                                                    <div className="mt-2 flex flex-wrap gap-2">
                                                        <span className="px-3 py-1 bg-white rounded-full text-sm border">
                                                            Barcode: {scanData.book_info.barcode_id}
                                                        </span>
                                                        <span className={`px-3 py-1 rounded-full text-sm ${scanData.book_info.is_available
                                                            ? 'bg-green-100 text-green-700'
                                                            : 'bg-red-100 text-red-700'
                                                            }`}>
                                                            {scanData.book_info.is_available ? '✓ Available' : '✗ Checked Out'}
                                                        </span>
                                                        <span className="px-3 py-1 bg-slate-100 rounded-full text-sm">
                                                            {scanData.book_info.available_copies} copies available
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Transaction Info (for returns) */}
                                            {scanData.transaction_info && (
                                                <div className="mt-4 p-4 bg-white rounded-lg border">
                                                    <h4 className="font-semibold text-slate-700 mb-2">Current Transaction</h4>
                                                    <p><strong>Issued to:</strong> {scanData.transaction_info.user_name}</p>
                                                    <p><strong>Issue Date:</strong> {new Date(scanData.transaction_info.issue_date).toLocaleDateString()}</p>
                                                    <p><strong>Due Date:</strong> {new Date(scanData.transaction_info.due_date).toLocaleDateString()}</p>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="text-center py-4">
                                            <XCircle size={48} className="mx-auto text-red-400 mb-2" />
                                            <p className="text-red-700 font-semibold">Book not found in system</p>
                                        </div>
                                    )}
                                </div>

                                {/* Issue: User Selection */}
                                {mode === 'issue' && scanData.found && scanData.book_info?.is_available && (
                                    <div className="p-6 bg-slate-50 rounded-xl">
                                        <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                            <Users size={20} />
                                            Select User to Issue Book
                                        </h4>
                                        <select
                                            value={selectedUserId}
                                            onChange={(e) => setSelectedUserId(e.target.value)}
                                            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                        >
                                            <option value="">-- Select a user --</option>
                                            {users.map(user => (
                                                <option key={user.userId || user.id} value={user.userId || user.id}>
                                                    {user.fullName || user.name} ({user.email})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="flex gap-4">
                                    {mode === 'issue' && scanData.found && scanData.book_info?.is_available && (
                                        <button
                                            onClick={completeIssue}
                                            disabled={!selectedUserId || loading}
                                            className="flex-1 py-4 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                                        >
                                            {loading ? <Loader className="animate-spin" size={20} /> : <CheckCircle size={20} />}
                                            Complete Issue
                                        </button>
                                    )}

                                    {mode === 'return' && scanData.found && scanData.transaction_info && (
                                        <button
                                            onClick={completeReturn}
                                            disabled={loading}
                                            className="flex-1 py-4 bg-amber-500 text-white rounded-xl font-semibold hover:bg-amber-600 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                                        >
                                            {loading ? <Loader className="animate-spin" size={20} /> : <ArrowLeftRight size={20} />}
                                            Complete Return
                                        </button>
                                    )}

                                    <button
                                        onClick={() => {
                                            setScanData(null);
                                            setLastScanTimestamp(Date.now());
                                            setIsPolling(true);
                                        }}
                                        className="px-6 py-4 bg-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-300 transition-colors flex items-center gap-2"
                                    >
                                        <RefreshCw size={20} />
                                        Scan Another
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default LibrarianWorkstation;
