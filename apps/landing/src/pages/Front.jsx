import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, Cpu, CheckCircle2, Smile } from 'lucide-react';
import angryBirdImg from '../assets/images/22.png';
import audioSrc from '../assets/audio/1.mp3';

const App = () => {
  const navigate = useNavigate();
  const [isLoaded, setIsLoaded] = useState(false);
  const [authStep, setAuthStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [audio] = useState(new Audio(audioSrc));

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 50);
    audio.load();
    return () => clearTimeout(timer);
  }, [audio]);

  useEffect(() => {
    if (authStep === 2) {
      // Smile dikhane ke liye thoda extra time (0.8s) taaki user dekh sake
      const redirectTimer = setTimeout(() => {
        navigate('/landing');
      }, 800);
      return () => clearTimeout(redirectTimer);
    }
  }, [authStep, navigate]);

  const startAuth = () => {
    if (authStep > 0) return;
    audio.play().catch(e => console.log("Audio play blocked:", e));
    setAuthStep(1);

    // 1.5 SECOND TOTAL LOADING
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setAuthStep(2);
          return 100;
        }
        return prev + 10;
      });
    }, 150);
  };

  return (
    <div className={`relative h-screen w-screen flex flex-col items-center justify-center overflow-hidden transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`} style={{ background: 'radial-gradient(circle at center, #151515 0%, #0a0a0a 100%)', backgroundColor: '#0a0a0a' }}>

      {/* Background Grid */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '35px 35px' }}></div>
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-lg px-6 text-center">

        {/* Bird Image */}
        <div className="relative mb-6 flex items-center justify-center">
          <div className="absolute w-40 h-40 md:w-72 md:h-72 bg-red-600/5 blur-[80px] rounded-full animate-pulse-slow"></div>
          <img src={angryBirdImg} alt="Angry Bird" className="w-48 h-48 md:w-72 md:h-72 object-contain filter drop-shadow-[0_10px_35px_rgba(0,0,0,0.8)] animate-calmBreath-slow" />
        </div>

        {/* Branding */}
        <div className="mb-8">
          <h1 className="text-white font-black text-2xl md:text-4xl tracking-tighter mb-1 uppercase">
            PROJECT <span className="text-red-600">PADH LE</span>
          </h1>
          <p className="text-gray-600 text-[8px] md:text-[10px] tracking-[0.4em] uppercase font-semibold">Abhi Nhi Toh Kabhi nhi</p>
        </div>

        {/* Controls Container */}
        <div className="w-full max-w-[240px] md:max-w-[280px] h-32 flex flex-col items-center justify-start">
          {authStep === 0 && (
            <button onClick={startAuth} className="group flex flex-col items-center gap-3 w-full outline-none">
              <div className="p-3 md:p-4 rounded-xl bg-white/5 border border-white/10 group-hover:bg-red-600/10 transition-all duration-200">
                <Cpu className="text-gray-500 group-hover:text-red-600 w-5 h-5 md:w-6 md:h-6" />
              </div>
              <span className="text-[8px] md:text-[9px] font-bold text-gray-500 tracking-[0.2em] uppercase">Initialize System</span>
            </button>
          )}

          {authStep === 1 && (
            <div className="w-full space-y-3 animate-in fade-in duration-200">
              <div className="flex justify-between items-end mb-1">
                <div className="flex items-center gap-2 text-red-600/80">
                  <Target size={12} className="animate-spin" />
                  <span className="text-[8px] md:text-[10px] font-bold tracking-[0.1em] uppercase">Syncing...</span>
                </div>
                <span className="text-[8px] md:text-[10px] text-gray-600 font-mono">{progress}%</span>
              </div>
              <div className="h-[2px] w-full bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.8)] transition-all duration-150 ease-linear" style={{ width: `${progress}%` }}></div>
              </div>
            </div>
          )}

          {authStep === 2 && (
            <div className="flex flex-col items-center gap-3 animate-in zoom-in-95 duration-300">
              <div className="flex items-center gap-2 text-green-600/80">
                <CheckCircle2 size={14} />
                <span className="text-[8px] md:text-[10px] font-bold tracking-[0.2em] uppercase">Authorized</span>
              </div>
              {/* SMILE ICON BACK AGAIN */}
              <div className="p-3 rounded-full bg-red-600/10 border border-red-600/20">
                <Smile className="text-white w-6 h-6 md:w-7 md:h-7 animate-bounce" />
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .animate-calmBreath-slow { animation: calmBreath 8s ease-in-out infinite; }
        @keyframes calmBreath { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.03); } }
        .animate-pulse-slow { animation: pulse 6s ease-in-out infinite; }
        @keyframes pulse { 0%, 100% { opacity: 0.1; } 50% { opacity: 0.2; } }
      `}</style>
    </div>
  );
};

export default App;