import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Play, Pause, Volume2, Shield, Zap, Globe, Cpu, ChevronDown, ExternalLink, Box, Layers, HardDrive, X } from 'lucide-react';
import squadImg from '../assets/images/squad.png';
import infoSquadImg from '../assets/images/6.png';
import heroVideoSrc from '../assets/videos/landing.mp4';
import videoSrc3 from '../assets/videos/3.mp4';
import videoSrc4 from '../assets/videos/4.mp4';
import videoSrc5 from '../assets/videos/5.mp4';
import managementImg from '../assets/images/management.png';
import studentImg from '../assets/images/student.png';

/**
 * ScrollReveal - Optimized with GPU acceleration and memoization
 */
const ScrollReveal = memo(({ children, delay = 0 }) => {
  const [isVisible, setIsVisible] = useState(false);
  const domRef = useRef();

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    const current = domRef.current;
    if (current) observer.observe(current);
    return () => { if (current) observer.unobserve(current); };
  }, []);

  return (
    <div
      ref={domRef}
      className={`will-change-transform transition-all duration-[800ms] ease-out transform ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
});

/**
 * TimelineVideo - Memoized to prevent re-renders during scroll
 */
const TimelineVideo = memo(({ src }) => (
  <div className="relative aspect-video w-full bg-[#0a0a0a] rounded-xl border border-white/5 overflow-hidden shadow-lg group contain-strict">
    <video
      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500 will-change-opacity"
      autoPlay
      muted
      loop
      playsInline
      src={src}
    />
    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
  </div>
));

/**
 * InfoCard - Enhanced performance with active scaling optimizations
 */
const InfoCard = memo(({ icon: Icon, title, desc, delay, onExpand, index }) => (
  <ScrollReveal delay={delay}>
    <div
      onClick={() => onExpand(index, 'info')}
      className="relative group p-8 bg-jake-dark/10 border border-white/10 rounded-3xl overflow-hidden transition-all duration-500 hover:border-jake-blue/30 hover:bg-white/[0.02] h-full cursor-pointer active:scale-[0.97] will-change-transform"
    >
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-jake-blue to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="mb-6 p-4 w-fit bg-jake-blue/10 rounded-2xl text-jake-blue group-hover:scale-110 transition-transform duration-500 will-change-transform">
        <Icon size={28} />
      </div>
      <h4 className="text-xl font-bold uppercase mb-3 tracking-tighter text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{title}</h4>
      <p className="text-white/40 font-light text-sm leading-relaxed group-hover:text-white/60 transition-colors line-clamp-3">{desc}</p>

      <div className="mt-6 text-[10px] font-bold text-jake-blue opacity-0 group-hover:opacity-100 tracking-widest uppercase transition-opacity">
        Analyze Data +
      </div>
    </div>
  </ScrollReveal>
));

const App = () => {
  const navigate = useNavigate();
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [activeModal, setActiveModal] = useState({ index: null, type: null });
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const videoRef = useRef(null);
  const heroRef = useRef(null);
  const contentRef = useRef(null);
  const infoRef = useRef(null);
  const isTransitioning = useRef(false);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  const heroVideo = heroVideoSrc;

  // Ensure video plays on mount and unmute on first click
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(err => {
        console.log('Autoplay prevented:', err);
      });
    }

    // Unmute on first user interaction anywhere on the page
    const handleFirstInteraction = () => {
      if (videoRef.current && isMuted) {
        videoRef.current.muted = false;
        setIsMuted(false);
        document.removeEventListener('click', handleFirstInteraction);
        document.removeEventListener('touchstart', handleFirstInteraction);
      }
    };

    document.addEventListener('click', handleFirstInteraction);
    document.addEventListener('touchstart', handleFirstInteraction);

    return () => {
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('touchstart', handleFirstInteraction);
    };
  }, []);

  // Scroll Opacity Logic
  useEffect(() => {
    const handleScroll = () => {
      if (heroRef.current) {
        const scrollY = window.scrollY;
        const opacity = Math.max(0, 1 - scrollY / 1400);
        heroRef.current.style.opacity = opacity;
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const aboutData = [
    {
      id: "M01",
      icon: Box,
      title: "Smart Library System",
      desc: "Intelligent book management with real-time tracking and AI-powered recommendations.",
      fullInfo: "Our library module features barcode-based book management, automated fine calculations, and smart book recommendations. Students can search, reserve, and track books in real-time. The system includes overdue notifications, transaction history, and comprehensive analytics for library administrators.",
      video: videoSrc3,
      primaryColor: "#29B6F6",
      colorClass: "text-jake-blue",
      hoverBorder: "hover:border-jake-blue/30",
      lineColor: "via-jake-blue",
    },
    {
      id: "M02",
      icon: Layers,
      title: "AI Chat Assistant",
      desc: "Context-aware AI chatbot powered by RAG for instant campus information access.",
      fullInfo: "Built with FAISS vector database and LangChain, our AI assistant provides instant answers about campus resources, subject information, and notices. It uses Retrieval-Augmented Generation to fetch accurate, context-aware responses from the campus database in real-time.",
      video: videoSrc4,
      primaryColor: "#039BE5",
      colorClass: "text-[#039BE5]",
      hoverBorder: "hover:border-[#039BE5]/30",
      lineColor: "via-[#039BE5]",
    },
    {
      id: "M03",
      icon: HardDrive,
      title: "Smart Communication",
      desc: "Unified messaging platform with real-time chat, video meetings, and group collaboration.",
      fullInfo: "Connect with peers through private messaging, campus-wide groups, and HD video meetings. The system includes friend requests, group management, real-time WebSocket communication, and integrated meeting scheduler. Students and faculty can collaborate seamlessly across the platform.",
      video: videoSrc5,
      primaryColor: "#0288D1",
      colorClass: "text-[#0288D1]",
      hoverBorder: "hover:border-[#0288D1]/30",
      lineColor: "via-[#0288D1]",
    },
    {
      id: "M04",
      icon: Cpu,
      title: "OCR Marksheet Analyzer",
      desc: "Advanced document processing with AI-powered marksheet extraction and validation.",
      fullInfo: "Intelligent OCR system that automatically extracts grades and student data from uploaded marksheets. Uses computer vision and deep learning to process CBSE, ICSE, and custom formats. Features include automatic error correction, data validation, and seamless integration with the academic database.",
      video: videoSrc5, // Using videoSrc5 as placeholder - you can add a new video
      primaryColor: "#0277BD",
      colorClass: "text-[#0277BD]",
      hoverBorder: "hover:border-[#0277BD]/30",
      lineColor: "via-[#0277BD]",
    }
  ];

  const infoData = [
    { id: 1, icon: Shield, title: "Secure Core", desc: "Military grade encryption layer protecting every data node.", fullInfo: "Humara security system multi-layer architecture par based hai. AES-256 encryption aur secure tunneling ke saath aapka data hamesha safe rehta hai. Har entry point ko individually monitor kiya jata hai taaki zero-day vulnerabilities ko mitigate kiya ja sake." },
    { id: 2, icon: Zap, title: "Hyper Fast", desc: "Sub-millisecond processing power for real-time demands.", fullInfo: "Next-gen processing pipelines jo 10GB/s se zyada data handle sakti hain. Hum compute optimize karte hain performance ke liye, ensuring ki complex calculations bhi instant result dein." },
    { id: 3, icon: Globe, title: "Global Reach", desc: "Distributed edge network ensuring zero-latency access.", fullInfo: "Duniya bhar mein faila hua humari CDN network ensure karta hai ki aapka content user tak bina kisi delay ke pahunche. Hamari edge nodes 150+ locations par active hain." },
    { id: 4, icon: Cpu, title: "Neural Mesh", desc: "Self-learning architecture that adapts to user patterns.", fullInfo: "Humara system AI-driven hai. Ye traffic patterns ko analyse karta hai aur resources ko proactively allocate karta hai, jisse system efficiency 40% tak badh jati hai." }
  ];

  const activeContent = activeModal.type === 'info'
    ? infoData[activeModal.index]
    : activeModal.type === 'about'
      ? aboutData[activeModal.index]
      : null;

  const handleNavClick = useCallback((item) => {
    isTransitioning.current = true;
    if (item === 'Team') { navigate('/team'); return; }
    if (item === 'Visit') { window.open('https://yourmainwebsite.com', '_blank'); return; }
    if (item === 'About') contentRef.current?.scrollIntoView({ behavior: 'smooth' });
    else if (item === 'Info') infoRef.current?.scrollIntoView({ behavior: 'smooth' });
    else if (item === 'Home') window.scrollTo({ top: 0, behavior: 'smooth' });

    setTimeout(() => {
      isTransitioning.current = false;
      lastScrollY.current = window.scrollY;
    }, 1000);
  }, [navigate]);

  useEffect(() => {
    window.scrollTo(0, 0);

    const handleAutoScroll = () => {
      if (!ticking.current) {
        window.requestAnimationFrame(() => {
          if (!isTransitioning.current) {
            const currentScroll = window.scrollY;
            if (currentScroll > 50 && currentScroll < 300 && lastScrollY.current < 50) {
              handleNavClick('About');
            }
            lastScrollY.current = currentScroll;
          }
          ticking.current = false;
        });
        ticking.current = true;
      }
    };

    window.addEventListener('scroll', handleAutoScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleAutoScroll);
  }, [handleNavClick]);

  const openModal = useCallback((index, type) => {
    setActiveModal({ index, type });
  }, []);

  const getModalPositionClass = () => {
    if (activeModal.type === 'about') {
      return activeModal.index % 2 !== 0 ? 'justify-start md:pl-32' : 'justify-end md:pr-32';
    }
    return 'justify-center';
  };

  const togglePlay = (e) => {
    e.stopPropagation();
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = (e) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-black text-white relative font-sans flex flex-col pt-20 overflow-x-hidden selection:bg-[#4f46e5]/30">

      {/* Modal Section */}
      {activeContent && (
        <div
          className={`fixed inset-0 z-[100] flex p-6 bg-black/60 backdrop-blur-sm transition-all duration-300 items-center ${getModalPositionClass()}`}
          onClick={() => setActiveModal({ index: null, type: null })}
        >
          <div
            className="relative w-full max-w-[380px] h-auto min-h-fit bg-[#0a0a0a] border border-white/10 rounded-3xl p-8 shadow-[0_30px_100px_rgba(0,0,0,0.9)] animate-modal-entry overflow-hidden transition-all duration-300 will-change-transform"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#7c3aed] to-transparent"
              style={{
                backgroundColor: activeModal.type === 'about' ? activeContent.primaryColor : '#7c3aed',
                backgroundImage: `linear-gradient(to right, transparent, ${activeModal.type === 'about' ? activeContent.primaryColor : '#7c3aed'}, transparent)`
              }}
            />

            <button onClick={() => setActiveModal({ index: null, type: null })} className="absolute top-6 right-6 p-2 bg-white/5 rounded-full hover:bg-white/10 text-white/30 transition-all">
              <X size={16} />
            </button>

            <div className="mb-6 flex items-center gap-4">
              <div
                className="p-3 bg-white/5 rounded-xl border border-white/10 shrink-0"
                style={{ color: activeModal.type === 'about' ? activeContent.primaryColor : '#7c3aed' }}
              >
                <activeContent.icon size={22} />
              </div>
              <div className="overflow-hidden">
                <span className="text-[9px] font-bold tracking-widest text-white/20 uppercase block truncate">
                  {activeModal.type === 'about' ? `${activeContent.id} Deployment` : `System Node 0${activeContent.id}`}
                </span>
                <h2 className="text-xl font-black uppercase tracking-tighter text-white truncate" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {activeContent.title}
                </h2>
              </div>
            </div>

            <div className="relative mb-8 h-auto">
              <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
                <p className="text-white/60 text-sm leading-relaxed font-light whitespace-normal">
                  {activeContent.fullInfo}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-white/5">
              <button
                onClick={() => setActiveModal({ index: null, type: null })}
                className="px-6 py-2.5 rounded-xl text-white text-[10px] font-bold uppercase tracking-widest transition-all hover:brightness-110 active:scale-95 shadow-lg shadow-black/40"
                style={{ backgroundColor: activeModal.type === 'about' ? activeContent.primaryColor : '#7c3aed' }}
              >
                {activeModal.type === 'about' ? 'Acknowledge' : 'Dismiss Node'}
              </button>
              <div className="flex flex-col items-end shrink-0 opacity-20">
                <span className="text-[8px] font-mono">STATUS: STABLE</span>
                <span className="text-[8px] font-mono">ENCRYPTED</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grid Background */}
      {/* Grid Background & Blue Tint Overlay */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.04] will-change-contents" style={{ backgroundImage: `linear-gradient(to right, #29B6F6 1px, transparent 1px), linear-gradient(to bottom, #29B6F6 1px, transparent 1px)`, backgroundSize: '45px 45px' }} />
      <div className="fixed inset-0 pointer-events-none z-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-jake-blue/10 via-transparent to-transparent opacity-40 mix-blend-screen" />

      <header className="fixed top-0 left-0 w-full z-50 bg-jake-dark/60 backdrop-blur-xl h-20 border-b border-jake-blue/10 px-8 flex items-center justify-between contain-layout shadow-[0_0_30px_-10px_rgba(41,182,246,0.2)]">
        <h1 className="text-3xl font-black uppercase tracking-tighter text-white cursor-pointer" style={{ fontFamily: "'Space Grotesk', sans-serif" }} onClick={() => handleNavClick('Home')}>4<span className="text-jake-blue">0</span>4</h1>
        <nav className="flex items-center gap-1">
          {['Home', 'About', 'Team', 'Info'].map(item => (
            <button key={item} onClick={() => handleNavClick(item)} className="px-5 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-white/50 hover:text-white transition-all">{item}</button>
          ))}

          {/* Boundary-Animated Glass Visit Button */}
          <div className="relative ml-4 p-[1px] overflow-hidden rounded-full group">
            {/* Animated Boundary Light */}
            <div className="absolute inset-[-1000%] animate-spin-slow bg-[conic-gradient(from_90deg_at_50%_50%,#29B6F6_0%,#039BE5_50%,#29B6F6_100%)] group-hover:animate-spin-fast" />

            <button
              onClick={() => handleNavClick('Visit')}
              className="relative px-6 py-2.5 text-[11px] font-black uppercase tracking-[0.15em] rounded-full flex items-center gap-2 bg-jake-dark/90 backdrop-blur-xl hover:bg-black/40 transition-all"
            >
              <span className="relative z-10 text-white/90">Main Website</span>
              <ExternalLink size={14} className="relative z-10 text-jake-blue group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </button>
          </div>
        </nav>
      </header>

      {/* Immersive Hero Video */}
      <section className="h-screen w-full relative overflow-hidden z-10">
        <div ref={heroRef} className="absolute inset-0 w-full h-full will-change-opacity">
          <video
            className="absolute inset-0 w-full h-full object-cover"
            ref={videoRef}
            autoPlay
            muted={isMuted}
            loop
            playsInline
            src={heroVideo}
          />
          <div className="absolute inset-0 bg-black/30" />

          {/* Blue radial gradient overlay for tint effect */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-jake-blue/10 via-transparent to-transparent opacity-40 mix-blend-screen" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-jake-dark to-transparent" />

          {/* Unmute Button Overlay */}
          {/* {isMuted && (
            <div className="absolute bottom-10 right-10 z-50 animate-fade-in-up">
              <button
                onClick={toggleMute}
                className="group flex items-center gap-3 px-6 py-3 rounded-full bg-black/40 backdrop-blur-md border border-jake-blue/30 text-white hover:bg-black/60 hover:border-jake-blue/60 transition-all shadow-[0_0_20px_-5px_rgba(41,182,246,0.3)]"
              >
                <div className="relative flex items-center justify-center w-5 h-5">
                   {/* Sound Wave Animation */}
          {/* <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-jake-blue opacity-75"></span>
                   <Volume2 size={18} className="relative z-10 text-jake-blue" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] group-hover:text-jake-blue transition-colors">Initialize Audio</span>
              </button>
            </div>
          )} */}
        </div>

        <div className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none">
          {/* Text Removed as per request */}
        </div>
      </section>

      {/* About Section */}
      <section ref={contentRef} className="w-full pt-2 pb-10 px-6 md:px-12 relative z-10 flex flex-col items-center scroll-mt-20">
        <ScrollReveal><h3 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-white mb-20" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>CAMPUS <span className="text-jake-blue">INTELLIGENCE</span></h3></ScrollReveal>

        <ScrollReveal delay={200}>
          <div className="mb-24 relative">
            <img src={squadImg} alt="Squad" className="w-36 h-36 md:w-52 md:h-52 object-contain filter drop-shadow-[0_0_30px_rgba(79,70,229,0.3)] transition-transform duration-700 hover:scale-110" onError={(e) => { e.target.src = "https://via.placeholder.com/200/4f46e5/FFFFFF?text=Squad"; }} />
          </div>
        </ScrollReveal>

        <div className="max-w-5xl w-full relative">
          <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-gradient-to-b from-jake-blue via-[#039BE5] to-[#0288D1] opacity-20 -translate-x-1/2 hidden md:block" />

          {aboutData.map((module, idx) => (
            <div
              key={module.id}
              className="relative mb-32 flex flex-col md:flex-row items-center justify-between group"
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <div className={`w-full md:w-[45%] ${idx % 2 !== 0 ? 'md:order-2' : 'md:order-1'} contain-content`}>
                <ScrollReveal delay={100}><TimelineVideo src={module.video} /></ScrollReveal>
              </div>

              <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center justify-center z-20">
                <div
                  className={`w-3 h-3 rounded-full transition-all duration-500 bg-white/20 will-change-transform 
                               ${hoveredIdx === idx ? 'scale-[1.8] shadow-[0_0_15px]' : 'scale-100'}`}
                  style={{ backgroundColor: hoveredIdx === idx ? module.primaryColor : 'rgba(255,255,255,0.15)', boxShadow: hoveredIdx === idx ? `0 0 15px ${module.primaryColor}` : 'none' }}
                />
              </div>

              <div className={`w-full md:w-[45%] mb-8 md:mb-0 ${idx % 2 !== 0 ? 'md:order-1 text-right' : 'md:order-2 text-left'}`}>
                <ScrollReveal delay={200}>
                  <div
                    onClick={() => openModal(idx, 'about')}
                    className={`p-10 bg-white/[0.005] border border-white/15 rounded-[2.5rem] transition-all duration-500 cursor-pointer shadow-xl backdrop-blur-sm relative overflow-hidden group/card ${module.hoverBorder} hover:bg-white/[0.015] active:scale-95 will-change-transform`}
                  >
                    <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent ${module.lineColor} to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-500`} />
                    <span className={`font-bold text-[10px] tracking-[0.4em] uppercase block mb-6 transition-colors duration-500 ${module.colorClass}`}>{module.id} // SYSTEM</span>
                    <h4 className="text-3xl font-bold uppercase mb-4 tracking-tighter text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{module.title}</h4>
                    <p className="text-white/40 font-light text-sm leading-relaxed mb-6 group-hover/card:text-white/70 transition-colors duration-500">{module.desc}</p>
                    <div className={`text-[10px] font-bold uppercase tracking-widest transition-all duration-500 opacity-0 group-hover/card:opacity-100 flex items-center gap-2 ${idx % 2 !== 0 ? 'justify-end' : 'justify-start'}`} style={{ color: module.primaryColor }}>Access Node <span className="text-lg">→</span></div>
                  </div>
                </ScrollReveal>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Info Section */}
      <section ref={infoRef} className="w-full pt-12 pb-24 px-6 md:px-12 relative z-10 flex flex-col items-center min-h-screen scroll-mt-20 overflow-hidden">
        <ScrollReveal>
          <h3 className="text-4xl md:text-5xl font-black uppercase tracking-tighter mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            <span className="text-white">INFO</span> <span className="text-jake-blue">SYSTEMS</span>
          </h3>
        </ScrollReveal>

        <ScrollReveal delay={200}>
          <div className="m-0 p-0 relative z-10 flex justify-center">
            <img
              src={infoSquadImg}
              alt="Info Squad"
              className="w-48 h-48 md:w-64 md:h-64 object-contain filter drop-shadow-[0_0_40px_rgba(124,58,237,0.4)] transition-transform duration-700 hover:scale-105"
              onError={(e) => { e.target.src = "https://via.placeholder.com/300/7c3aed/FFFFFF?text=Info"; }}
            />
          </div>
        </ScrollReveal>
        <div className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
          {infoData.map((data, idx) => (
            <InfoCard key={data.id} index={idx} icon={data.icon} title={data.title} desc={data.desc} delay={idx * 50} onExpand={openModal} />
          ))}
        </div>
      </section>

      {/* Management & Student Section */}
      <section className="w-full relative z-10 scroll-mt-20">
        <ScrollReveal>
          <div className="w-full flex items-end justify-between">

            {/* Left Side: Student */}
            <div className="group relative">
              <a href="http://10.122.52.59:3000/student" className="block cursor-pointer">
                <img
                  src={studentImg}
                  alt="Student"
                  className="w-[325px] md:w-[425px] h-auto object-contain transform transition-transform duration-700 ease-out group-hover:scale-110 origin-bottom-left"
                />
              </a>
            </div>

            {/* Right Side: Management */}
            <div className="group relative">
              <a href="http://10.122.52.59:3000/management" className="block cursor-pointer">
                <img
                  src={managementImg}
                  alt="Management"
                  className="w-[450px] md:w-[550px] h-auto object-contain transform transition-transform duration-700 ease-out group-hover:scale-110 origin-bottom-right"
                />
              </a>
            </div>

          </div>
        </ScrollReveal>
      </section>

      <footer className="w-full py-16 bg-black border-t border-white/5 flex flex-col items-center">
        <span className="text-[9px] font-mono tracking-[0.4em] text-white/20 uppercase">© 2024 404 FOUNDERS // EST 404</span>
      </footer>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700;900&display=swap');
        html { scrollbar-width: none; scroll-behavior: smooth; background: #000; }
        body { background: #000; overflow-x: hidden; margin: 0; -webkit-font-smoothing: antialiased; }
        body::-webkit-scrollbar { display: none; }
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        
        /* Boundary Rotation Animations */
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes spin-fast {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow { animation: spin-slow 8s linear infinite; }
        .animate-spin-fast { animation: spin-slow 3s linear infinite; }

        .line-clamp-3 { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
        @keyframes modalEntry { 0% { opacity: 0; transform: scale(0.97) translateY(10px); } 100% { opacity: 1; transform: scale(1) translateY(0); } }
        .animate-modal-entry { animation: modalEntry 0.3s cubic-bezier(0.25, 1, 0.5, 1) forwards; }
        .will-change-transform { will-change: transform; }
        .will-change-opacity { will-change: opacity; }
        .contain-layout { contain: layout; }
        .contain-paint { contain: paint; }
        .contain-strict { contain: strict; }
      `}</style>
    </div>
  );
};

export default App;