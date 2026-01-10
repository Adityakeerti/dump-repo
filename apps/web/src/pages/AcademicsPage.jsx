import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    FileText,
    Award,
    BookOpen,
    TrendingUp,
    Calendar,
    ClipboardList,
    GraduationCap,
    Upload,
    ChevronRight,
    Sparkles
} from 'lucide-react';

const AcademicsPage = () => {
    const navigate = useNavigate();

    const academicModules = [
        {
            id: 'results',
            title: 'Results & Marksheets',
            description: 'Upload marksheets, view extracted grades, and track academic progress',
            icon: <Award size={28} />,
            color: 'from-purple-500 to-indigo-600',
            bgColor: 'bg-purple-50',
            textColor: 'text-purple-600',
            onClick: () => navigate('/marksheet'),
            badge: 'OCR Enabled'
        },
        {
            id: 'attendance',
            title: 'Attendance',
            description: 'Track your class attendance and view detailed reports',
            icon: <ClipboardList size={28} />,
            color: 'from-green-500 to-emerald-600',
            bgColor: 'bg-green-50',
            textColor: 'text-green-600',
            onClick: null,
            badge: null
        },
        {
            id: 'assignments',
            title: 'Assignments',
            description: 'View pending assignments and submit your work',
            icon: <FileText size={28} />,
            color: 'from-blue-500 to-cyan-600',
            bgColor: 'bg-blue-50',
            textColor: 'text-blue-600',
            onClick: null,
            badge: null
        },
        {
            id: 'courses',
            title: 'Courses',
            description: 'Browse enrolled courses and access study materials',
            icon: <BookOpen size={28} />,
            color: 'from-orange-500 to-amber-600',
            bgColor: 'bg-orange-50',
            textColor: 'text-orange-600',
            onClick: null,
            badge: null
        },
        {
            id: 'timetable',
            title: 'Timetable',
            description: 'View your class schedule and exam dates',
            icon: <Calendar size={28} />,
            color: 'from-pink-500 to-rose-600',
            bgColor: 'bg-pink-50',
            textColor: 'text-pink-600',
            onClick: null,
            badge: null
        },
        {
            id: 'performance',
            title: 'Performance Analytics',
            description: 'View CGPA trends, subject-wise analysis, and rankings',
            icon: <TrendingUp size={28} />,
            color: 'from-teal-500 to-cyan-600',
            bgColor: 'bg-teal-50',
            textColor: 'text-teal-600',
            onClick: null,
            badge: null
        }
    ];

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-6xl mx-auto px-6 py-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/student/dashboard')}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <ArrowLeft size={20} className="text-gray-600" />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <GraduationCap size={24} className="text-blue-600" />
                                Academics
                            </h1>
                            <p className="text-sm text-gray-500">Manage your academic records and progress</p>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-6xl mx-auto px-6 py-8">
                {/* Featured Section - Results */}
                <div className="mb-8">
                    <div
                        onClick={() => navigate('/marksheet')}
                        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-700 p-8 text-white cursor-pointer group hover:shadow-xl transition-all"
                    >
                        <div className="absolute top-0 right-0 opacity-10 transform group-hover:scale-110 transition-transform">
                            <Award size={150} />
                        </div>
                        <div className="absolute bottom-0 left-0 opacity-10 transform group-hover:scale-110 transition-transform">
                            <Sparkles size={100} />
                        </div>

                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="bg-white/20 backdrop-blur-sm text-white text-xs font-bold px-3 py-1 rounded-full">
                                    ✨ AI-Powered OCR
                                </span>
                            </div>
                            <h2 className="text-2xl font-bold mb-2">Upload Your Marksheets</h2>
                            <p className="text-white/80 mb-6 max-w-lg">
                                Automatically extract grades and marks from your 10th, 12th, and semester marksheets using advanced OCR technology.
                            </p>
                            <button className="bg-white text-indigo-700 px-6 py-3 rounded-xl font-bold hover:bg-indigo-50 transition-colors shadow-lg flex items-center gap-2">
                                <Upload size={18} />
                                Start Uploading
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Module Grid */}
                <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">All Academic Modules</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {academicModules.map((module) => (
                        <div
                            key={module.id}
                            onClick={module.onClick}
                            className={`bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg transition-all group ${module.onClick ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'}`}
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className={`p-3 rounded-xl ${module.bgColor} ${module.textColor}`}>
                                    {module.icon}
                                </div>
                                {module.badge && (
                                    <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-1 rounded-full">
                                        {module.badge}
                                    </span>
                                )}
                                {!module.onClick && (
                                    <span className="bg-gray-100 text-gray-500 text-xs font-medium px-2 py-1 rounded-full">
                                        Coming Soon
                                    </span>
                                )}
                            </div>
                            <h4 className="font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                                {module.title}
                            </h4>
                            <p className="text-sm text-gray-500 leading-relaxed">
                                {module.description}
                            </p>
                            {module.onClick && (
                                <div className="mt-4 flex items-center text-sm font-medium text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                    Open Module
                                    <ChevronRight size={16} className="ml-1" />
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Quick Stats */}
                <div className="mt-8 bg-white rounded-xl border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Overview</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-4 bg-gray-50 rounded-xl">
                            <div className="text-2xl font-bold text-gray-900">--</div>
                            <div className="text-xs text-gray-500 mt-1">Current CGPA</div>
                        </div>
                        <div className="text-center p-4 bg-gray-50 rounded-xl">
                            <div className="text-2xl font-bold text-gray-900">--</div>
                            <div className="text-xs text-gray-500 mt-1">Attendance %</div>
                        </div>
                        <div className="text-center p-4 bg-gray-50 rounded-xl">
                            <div className="text-2xl font-bold text-gray-900">--</div>
                            <div className="text-xs text-gray-500 mt-1">Pending Tasks</div>
                        </div>
                        <div className="text-center p-4 bg-gray-50 rounded-xl">
                            <div className="text-2xl font-bold text-gray-900">--</div>
                            <div className="text-xs text-gray-500 mt-1">Class Rank</div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AcademicsPage;
