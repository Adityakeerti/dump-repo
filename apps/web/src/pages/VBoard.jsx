import { useEffect, useState } from 'react';

const VBoard = () => {
    const [countdown, setCountdown] = useState(3);
    const vboardHttpsUrl = `https://${window.location.hostname}:9444/`;

    useEffect(() => {
        // Countdown timer
        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    window.location.href = vboardHttpsUrl;
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [vboardHttpsUrl]);

    const handleRedirectNow = () => {
        window.location.href = vboardHttpsUrl;
    };

    return (
        <div className="flex h-screen w-screen items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
            <div className="text-center max-w-lg p-8">
                <div className="w-24 h-24 mx-auto mb-6 bg-purple-600/20 rounded-full flex items-center justify-center animate-pulse">
                    <span className="text-5xl">🎨</span>
                </div>
                <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                    V-Board
                </h1>
                <p className="text-gray-300 mb-2">
                    Gesture-Controlled Virtual Whiteboard
                </p>
                <p className="text-purple-300 mb-6">
                    Camera requires HTTPS. Redirecting to secure server...
                </p>

                <div className="mb-6">
                    <div className="text-6xl font-bold text-purple-400 animate-bounce">
                        {countdown}
                    </div>
                </div>

                <button
                    onClick={handleRedirectNow}
                    className="px-8 py-3 bg-purple-600 rounded-xl font-semibold hover:bg-purple-700 transition-all transform hover:scale-105 shadow-lg shadow-purple-600/30"
                >
                    Open VBoard Now →
                </button>

                <p className="mt-6 text-sm text-gray-500">
                    ⚠️ Accept the security warning for the self-signed certificate
                </p>

                <button
                    onClick={() => window.history.back()}
                    className="mt-4 text-gray-400 hover:text-white transition-colors"
                >
                    ← Go Back
                </button>
            </div>
        </div>
    );
};

export default VBoard;

