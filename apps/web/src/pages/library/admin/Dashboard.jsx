import React, { useState, useEffect } from 'react';
import axios from 'axios';
import StatsCards from './components/StatsCards';
import RecentTransactions from './components/RecentTransactions';
import { PlusCircle, ArrowLeftCircle } from 'lucide-react';

const LibraryDashboard = () => {
    const [stats, setStats] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            const statsRes = await axios.get('/api/library/stats');
            setStats(statsRes.data);

            // Reusing overdue for now as 'recent' or fetch books
            // Ideally we need a /transactions/recent endpoint, but for now let's show overdue or active
            // Let's just fetch all issued books for the 'recent activity' implementation as a fallback 
            // since we didn't explicitly implement GET /transactions/recent
            const txRes = await axios.get('/api/library/admin/overdue');
            setTransactions(txRes.data);
        } catch (error) {
            console.error("Error fetching library data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleIssueBook = async () => {
        const userId = prompt("Enter User ID:");
        const bookId = prompt("Enter Book ID:");
        if (!userId || !bookId) return;

        try {
            await axios.post('/api/library/transaction/issue', {
                user_id: parseInt(userId),
                book_id: parseInt(bookId),
                days: 14
            });
            alert("Book Issued Successfully!");
            fetchData();
        } catch (error) {
            alert("Error issuing book: " + (error.response?.data?.detail || error.message));
        }
    };

    const handleReturnBook = async () => {
        const userId = prompt("Enter User ID:");
        const bookId = prompt("Enter Book ID:");
        if (!userId || !bookId) return;

        try {
            const res = await axios.post('/api/library/transaction/return', {
                user_id: parseInt(userId),
                book_id: parseInt(bookId)
            });
            alert(`Book Returned! Fine: ₹${res.data.fine_amount}`);
            fetchData();
        } catch (error) {
            alert("Error returning book: " + (error.response?.data?.detail || error.message));
        }
    };

    if (loading) return <div className="p-8 text-center">Loading Library Data...</div>;

    return (
        <div className="p-8 bg-gray-50 min-h-screen">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800">Librarian Dashboard</h1>
                <p className="text-gray-500 mt-2">Manage books, transactions, and fines</p>
            </header>

            {/* Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <button
                    onClick={handleIssueBook}
                    className="p-6 bg-white rounded-xl shadow-sm border-2 border-transparent hover:border-blue-500 transition-all flex flex-col items-center group text-center"
                >
                    <div className="bg-blue-50 p-4 rounded-full mb-3 group-hover:bg-blue-100 transition-colors">
                        <PlusCircle className="w-8 h-8 text-blue-600" />
                    </div>
                    <h3 className="font-bold text-lg text-gray-800">Issue Book</h3>
                    <p className="text-sm text-gray-500 mt-1">Assign a book to a student</p>
                </button>

                <button
                    onClick={handleReturnBook}
                    className="p-6 bg-white rounded-xl shadow-sm border-2 border-transparent hover:border-orange-500 transition-all flex flex-col items-center group text-center"
                >
                    <div className="bg-orange-50 p-4 rounded-full mb-3 group-hover:bg-orange-100 transition-colors">
                        <ArrowLeftCircle className="w-8 h-8 text-orange-600" />
                    </div>
                    <h3 className="font-bold text-lg text-gray-800">Return Book</h3>
                    <p className="text-sm text-gray-500 mt-1">Process a book return</p>
                </button>
            </div>

            <StatsCards stats={stats} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <RecentTransactions transactions={transactions} />
                </div>
                <div>
                    {/* Placeholder for future charts or notifications */}
                    <div className="bg-white p-6 rounded-xl shadow-sm">
                        <h3 className="font-semibold text-gray-800 mb-4">Quick Actions</h3>
                        <button onClick={() => alert('Add Book Feature coming soon!')} className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded-lg text-left text-sm font-medium text-gray-700 transition-colors mb-2">
                            + Add New Book
                        </button>
                        <button className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded-lg text-left text-sm font-medium text-gray-700 transition-colors">
                            View All Reports
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LibraryDashboard;
