import React from 'react';
import { Clock } from 'lucide-react';

const RecentTransactions = ({ transactions }) => {
    return (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-gray-400" />
                    Recent Activity
                </h3>
                <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">View All</button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-500">
                    <thead className="bg-gray-50 text-gray-700 uppercase text-xs">
                        <tr>
                            <th className="px-6 py-4 font-semibold">Book ID</th>
                            <th className="px-6 py-4 font-semibold">User ID</th>
                            <th className="px-6 py-4 font-semibold">Due Date</th>
                            <th className="px-6 py-4 font-semibold">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {transactions && transactions.length > 0 ? (
                            transactions.map((tx) => (
                                <tr key={tx.transaction_id} className="hover:bg-gray-50/50">
                                    <td className="px-6 py-4 font-medium text-gray-900">#{tx.book_id}</td>
                                    <td className="px-6 py-4">User #{tx.user_id}</td>
                                    <td className="px-6 py-4">{new Date(tx.due_date).toLocaleDateString()}</td>
                                    <td className="px-6 py-4">
                                        <span
                                            className={`px-3 py-1 rounded-full text-xs font-semibold ${tx.status === 'ISSUED'
                                                    ? 'bg-yellow-100 text-yellow-700'
                                                    : tx.status === 'RETURNED'
                                                        ? 'bg-green-100 text-green-700'
                                                        : 'bg-red-100 text-red-700'
                                                }`}
                                        >
                                            {tx.status}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="4" className="px-6 py-8 text-center text-gray-400">
                                    No recent transactions found
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default RecentTransactions;
