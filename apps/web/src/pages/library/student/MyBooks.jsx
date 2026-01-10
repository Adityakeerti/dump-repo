import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BookOpen, Calendar, AlertCircle, CheckCircle } from 'lucide-react';

const MyBooks = () => {
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);

    // Get logged-in user from localStorage
    const user = JSON.parse(localStorage.getItem('student_user')) || {};
    const userId = user.userId || user.id || 2;

    useEffect(() => {
        const fetchBooks = async () => {
            try {
                // Get user's borrowed books from correct endpoint
                const res = await axios.get(`/api/library/user/${userId}/books`);
                setBooks(res.data);
            } catch (error) {
                console.error("Error fetching my books:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchBooks();
    }, []);

    const getDaysDue = (dueDateStr) => {
        const due = new Date(dueDateStr);
        const today = new Date();
        const diffTime = due - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    if (loading) return <div className="p-8 text-center bg-gray-50 min-h-screen">Loading your books...</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-6 md:p-12">
            <header className="mb-10 max-w-5xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                    <BookOpen className="w-8 h-8 text-indigo-600" />
                    My Bookshelf
                </h1>
                <p className="text-gray-500 mt-2">Manage your current loans and due dates</p>
            </header>

            <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {books.length > 0 ? (
                    books.map((book, index) => {
                        const daysDue = getDaysDue(book.due_date || book.dueDate);
                        const isOverdue = daysDue < 0;
                        const isDueSoon = daysDue <= 3 && daysDue >= 0;

                        return (
                            <div key={book.transactionId || book.transaction_id || index} className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300 border border-gray-100 overflow-hidden flex flex-col">
                                <div className={`h-2 w-full ${isOverdue ? 'bg-red-500' : isDueSoon ? 'bg-orange-400' : 'bg-green-500'}`} />
                                <div className="p-6 flex-1 flex flex-col">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="bg-indigo-50 p-3 rounded-xl">
                                            <BookOpen className="w-6 h-6 text-indigo-600" />
                                        </div>
                                        {isOverdue && (
                                            <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold uppercase tracking-wider rounded-full">Overdue</span>
                                        )}
                                    </div>

                                    <h3 className="font-bold text-lg text-gray-900 mb-1">Book ID: #{book.bookId || book.book_id}</h3>
                                    <p className="text-sm text-gray-500 mb-6">Database Management Systems</p> {/* Placeholder Title since transaction only has ID in this simple model, ideally Fetch Book details */}

                                    <div className="mt-auto border-t border-gray-100 pt-4">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-500 flex items-center gap-2">
                                                <Calendar className="w-4 h-4" />
                                                Due Date
                                            </span>
                                            <span className={`font-semibold ${isOverdue ? 'text-red-600' : 'text-gray-700'}`}>
                                                {new Date(book.dueDate || book.due_date).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <div className="mt-2 text-right text-xs text-gray-400">
                                            {isOverdue ? `${Math.abs(daysDue)} days late` : `${daysDue} days remaining`}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-dashed border-gray-200">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <BookOpen className="w-8 h-8 text-gray-300" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">No books currently issued</h3>
                        <p className="text-gray-500 mt-1">Visit the library to borrow books!</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MyBooks;
