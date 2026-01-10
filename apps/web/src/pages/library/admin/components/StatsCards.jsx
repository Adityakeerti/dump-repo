import React from 'react';
import { Book, AlertTriangle, Layers, Users } from 'lucide-react';

const StatsCard = ({ title, value, icon: Icon, color, subtext }) => (
    <div className={`bg-white rounded-xl shadow-sm p-6 border-l-4 ${color}`}>
        <div className="flex justify-between items-start">
            <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">{title}</p>
                <h3 className="text-2xl font-bold text-gray-800">{value}</h3>
                {subtext && <p className="text-xs text-gray-500 mt-1">{subtext}</p>}
            </div>
            <div className={`p-3 rounded-full bg-opacity-10 ${color.replace('border-', 'bg-').replace('500', '100')}`}>
                <Icon className={`w-6 h-6 ${color.replace('border-', 'text-')}`} />
            </div>
        </div>
    </div>
);

const StatsCards = ({ stats }) => {
    if (!stats) return null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
            <StatsCard
                title="Bytes Borrowed"
                value={stats.issued_books}
                icon={Book}
                color="border-blue-500"
                subtext="Currently Issued"
            />
            <StatsCard
                title="Overdue Books"
                value={stats.overdue_books}
                icon={AlertTriangle}
                color="border-red-500"
                subtext={`Pending Fines: ₹${stats.pending_fines}`}
            />
            <StatsCard
                title="Total Inventory"
                value={stats.total_books}
                icon={Layers}
                color="border-cyan-500"
                subtext="Books available"
            />
            <StatsCard
                title="Active Readers"
                value="--"
                icon={Users}
                color="border-green-500"
                subtext="New this week"
            />
        </div>
    );
};

export default StatsCards;
