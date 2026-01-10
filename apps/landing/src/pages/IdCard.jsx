import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Linkedin, Github, Fingerprint, RefreshCcw } from 'lucide-react';
import AdityaImg from "../assets/images/AdityaBhardwaj.jpg";
import TLImg from "../assets/images/Adityakeerti.png";
import MeghaImg from "../assets/images/MeghaSingh.png";
import ArpanImg from "../assets/images/arpan.jpeg";
import squadImg from "../assets/images/squad.png";

// Team members data
const initialTeamMembers = [
  {
    id: "m2",
    idNumber: "EMP-002-MC",
    name: "Adityakeerti",
    role: "Team Lead",
    bio: "Systems architect ensuring our tech stack remains cutting-edge and scalable for global users.",
    image: TLImg,
    socials: { github: "https://github.com/Adityakeerti", linkedin: "https://www.linkedin.com/in/adityakeerti" }
  },
  {
    id: "m3",
    idNumber: "EMP-003-ER",
    name: "Megha Singh",
    role: "Product Strategist",
    bio: "Bridges complex data and user delight, driving roadmap toward meaningful innovation.",
    image: MeghaImg,
    socials: { github: "https://github.com/megha-singh38", linkedin: "https://www.linkedin.com/in/meghasingh2004" }
  },
  {
    id: "m1",
    idNumber: "EMP-001-SJ",
    name: "Arpan Singh",
    role: "Chief Design Officer",
    bio: "Focusing on human-centric interfaces and visual storytelling with 12 years of industry leadership.",
    image: ArpanImg,
    socials: { github: "https://github.com/Arpan010", linkedin: "https://www.linkedin.com/in/arpan-singh-105995318" }
  },
  {
    id: "m4",
    idNumber: "EMP-004-JW",
    name: "Aditya Kumar Bhardwaj",
    role: "Lead Motion Designer",
    bio: "Believes animation is the heartbeat of UX. Specializes in fluid, physics-based interactions.",
    image: AdityaImg,
    socials: { github: "https://github.com/099Aditya", linkedin: "https://www.linkedin.com/in/aditya-bhardwaj-b89381297/" }
  }
];

const cardEntranceVariants = {
  hidden: { y: 150, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", damping: 15, stiffness: 100, duration: 0.8 }
  },
  exit: { opacity: 0, scale: 0.8, transition: { duration: 0.3 } }
};

const IDCard = ({ member }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [hasBeenHovered, setHasBeenHovered] = useState(false);

  // FIXED: Defined missing handler
  const handleSocialClick = (e) => {
    e.stopPropagation();
  };

  return (
    <motion.div
      layout
      variants={cardEntranceVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="relative w-[280px] h-[480px] group cursor-pointer shrink-0"
      style={{ perspective: "1000px" }}
      onMouseEnter={() => { setIsFlipped(true); setHasBeenHovered(true); }}
      onMouseLeave={() => setIsFlipped(false)}
    >
      <motion.div
        className="relative w-full h-full text-left"
        style={{ transformStyle: "preserve-3d" }}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ type: "spring", stiffness: 40, damping: 15, mass: 1 }}
      >
        {/* FRONT SIDE */}
        <div
          className="absolute inset-0 w-full h-full rounded-[2rem] shadow-[0_0_30px_-5px_rgba(0,0,0,0.5)] overflow-hidden bg-black border border-jake-blue/30 flex flex-col backdrop-blur-3xl"
          style={{ backfaceVisibility: "hidden" }}
        >
          {/* Decorative Glow */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-jake-blue/10 rounded-full blur-[40px] pointer-events-none" />

          <div className="h-16 bg-jake-blue/5 flex items-center justify-between px-6 shrink-0 border-b border-jake-blue/10 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-jake-blue/0 via-jake-blue/10 to-jake-blue/0 animate-shimmer" />

            <div className="w-9 h-9 rounded-full bg-jake-dark border border-jake-blue/20 p-1.5 flex items-center justify-center z-10 shadow-lg">
              <img
                src="https://www.angrybirds.com/wp-content/uploads/2022/05/optimized-ABCOM_202203_1000x1000_CharacterDimensio_Hatclings_Movie.png"
                alt="Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="text-right z-10">
              <p className="text-[10px] text-jake-blue font-black tracking-widest uppercase glow-text">404 Founders</p>
              <p className="text-[7px] text-white/50 font-mono mt-0.5">ID VERIFIED</p>
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
            <div className="relative w-32 h-40 overflow-hidden rounded-2xl border border-jake-blue/40 shadow-[0_0_20px_-5px_rgba(41,182,246,0.3)] bg-jake-dark group-hover:border-jake-blue/80 transition-colors duration-500">
              <img
                src={member.image}
                alt={member.name}
                className={`w-full h-full object-cover transition-all duration-700 ${hasBeenHovered ? 'grayscale-0 scale-105' : 'grayscale group-hover:grayscale-0 group-hover:scale-105'}`}
              />
              <div className="absolute inset-0 ring-1 ring-inset ring-black/20" />
            </div>

            <div className="mt-6 text-center w-full relative z-10">
              <h3 className="text-lg font-black text-white tracking-tight uppercase drop-shadow-md">
                {member.name}
              </h3>
              <div className="flex items-center justify-center gap-2 mt-2">
                <div className="h-[1px] w-4 bg-jake-blue/50" />
                <p className="text-jake-blue font-bold text-[9px] uppercase tracking-[0.25em] shadow-jake-blue/50">
                  {member.role}
                </p>
                <div className="h-[1px] w-4 bg-jake-blue/50" />
              </div>
            </div>
          </div>

          <div className="h-24 border-t border-jake-blue/10 flex flex-col items-center justify-center px-6 bg-jake-blue/[0.02] shrink-0 relative overflow-hidden">
            <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-jake-blue/30 to-transparent" />

            <div className="flex items-center justify-center h-10 w-full mb-2 opacity-80 group-hover:opacity-100 transition-opacity">
              <img
                src={squadImg}
                alt="Squad"
                className={`h-full w-auto object-contain transition-all duration-500 ${hasBeenHovered ? 'brightness-110' : 'brightness-90 group-hover:brightness-110'}`}
              />
            </div>
            <p className="text-[9px] font-mono text-white/40 font-bold tracking-widest uppercase">
              {member.idNumber}
            </p>
          </div>
        </div>

        {/* BACK SIDE */}
        <div
          className="absolute inset-0 w-full h-full rounded-[2rem] shadow-[0_0_40px_-10px_rgba(41,182,246,0.4)] bg-jake-dark border border-jake-blue/50 p-8 text-white flex flex-col justify-between overflow-hidden"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-jake-blue/10 via-transparent to-transparent opacity-50" />

          <div className="flex justify-between items-start border-b border-jake-blue/20 pb-5 relative z-10">
            <Fingerprint className="text-jake-blue w-10 h-10 opacity-80" />
            <div className="text-right">
              <p className="text-2xl text-white font-black italic tracking-widest leading-none">404</p>
              <p className="text-[7px] text-jake-blue uppercase tracking-widest mt-1">Classified</p>
            </div>
          </div>

          <div className="text-center py-2 relative z-10">
            <h4 className="text-[9px] font-bold text-jake-blue uppercase tracking-[0.3em] mb-4 flex items-center justify-center gap-2">
              <span className="w-1 h-1 rounded-full bg-jake-blue" />
              Dossier Fragment
              <span className="w-1 h-1 rounded-full bg-jake-blue" />
            </h4>
            <p className="text-sm leading-relaxed text-zinc-300 font-medium px-1 font-mono border-l-2 border-jake-blue/30 pl-3 text-left">
              "{member.bio}"
            </p>
          </div>

          <div className="space-y-5 relative z-10">
            <div className="flex justify-center gap-4">
              {member.socials.github && member.socials.github !== "#" && (
                <a
                  href={member.socials.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleSocialClick}
                  className="p-3 rounded-xl bg-jake-blue/10 hover:bg-jake-blue/20 border border-jake-blue/20 hover:border-jake-blue/50 transition-all group/link hover:shadow-[0_0_15px_-5px_rgba(41,182,246,0.5)]"
                >
                  <Github className="w-5 h-5 text-jake-blue group-hover/link:text-white transition-colors" />
                </a>
              )}
              {member.socials.linkedin && member.socials.linkedin !== "#" && (
                <a
                  href={member.socials.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleSocialClick}
                  className="p-3 rounded-xl bg-jake-blue/10 hover:bg-jake-blue/20 border border-jake-blue/20 hover:border-jake-blue/50 transition-all group/link hover:shadow-[0_0_15px_-5px_rgba(41,182,246,0.5)]"
                >
                  <Linkedin className="w-5 h-5 text-jake-blue group-hover/link:text-white transition-colors" />
                </a>
              )}
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-jake-blue/20 to-transparent" />
              <p className="text-[7px] text-center text-white/30 uppercase tracking-[0.4em] font-bold pt-2">
                Property of 404 Founders
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Work & Achievement Data
const works = [
  {
    title: "DOC OC – Automated Marksheet Extraction System",
    date: "Sept 2025 – Oct 2025",
    points: [
      "Engineered a multi-board extraction pipeline using YOLO and Table Transformers, achieving 99.98% accuracy.",
      "Developed scalable REST APIs using FastAPI and MySQL with a React frontend for structured data parsing.",
      "Optimized administrative workflows to reduce processing time by 30x (10 mins to ∼30s) per marksheet; developed under the guidance of Dr. Prof. Ashish Garg.",
      "Implemented automated noise removal and face verification, eliminating manual data entry errors."
    ],
    tech: "Python, FastAPI, React, TypeScript, YOLO, MySQL, Microservices"
  },
  {
    title: "Cargo Laytime – SOF Document Processing & Laytime Calculator",
    date: "Dec 2024 – Present",
    points: [
      "Built an end-to-end maritime document processing system to extract and analyze Statement of Facts (SOF) PDFs with industry-grade accuracy.",
      "Designed an AI-powered pipeline using Google Document AI and Generative AI to extract vessel, cargo, voyage, and event timelines from unstructured documents.",
      "Developed high-performance REST APIs with FastAPI to handle PDF uploads, OCR processing, data extraction, and professional laytime calculations (demurrage/dispatch).",
      "Implemented real-time laytime computation with cumulative tracking, visual status indicators, and editable event timelines for maritime workflows.",
      "Deployed and maintained a production-ready system on Render with cloud-based credentials, secure configuration, and responsive HTML/CSS/JS frontend."
    ],
    tech: "Python, FastAPI, Google Document AI, Google Generative AI, OCR, HTML, CSS, JavaScript, REST APIs, Cloud Deployment"
  }
];

const achievements = [
  {
    title: "Winner, MariTHON (National Hackathon)",
    desc: "Built a commercialized SOF event extraction tool using Gen AI."
  }
];

export default function App() {
  const [members] = useState(initialTeamMembers);

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center p-6 overflow-x-hidden relative">
      <div className="fixed inset-0 pointer-events-none z-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-jake-blue/5 via-transparent to-transparent opacity-40 mix-blend-screen" />
      <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.03]" style={{ backgroundImage: `linear-gradient(to right, #29B6F6 1px, transparent 1px), linear-gradient(to bottom, #29B6F6 1px, transparent 1px)`, backgroundSize: '40px 40px' }} />

      <div className="w-full max-w-7xl z-10 pt-10">
        <header className="mb-20 text-center relative">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter mb-4 drop-shadow-[0_0_25px_rgba(41,182,246,0.5)]">
              CORE <span className="text-jake-blue">TEAM</span>
            </h1>
            <div className="flex items-center justify-center gap-3">
              <div className="h-[1px] w-12 bg-jake-blue/50" />
              <p className="text-zinc-500 uppercase tracking-[0.5em] text-[10px] font-bold">
                [ 404 Verified Internal Records ]
              </p>
              <div className="h-[1px] w-12 bg-jake-blue/50" />
            </div>
          </motion.div>
        </header>

        {/* Team Grid */}
        <div className="flex justify-center w-full mb-32">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              visible: { transition: { staggerChildren: 0.1 } }
            }}
            className="flex flex-row flex-wrap justify-center items-center gap-8 md:gap-12"
          >
            {members.map((member) => (
              <IDCard key={member.id} member={member} />
            ))}
          </motion.div>
        </div>

        {/* Works Section */}
        <section className="mb-24 w-full">
          <div className="flex items-center gap-4 mb-12">
            <div className="w-12 h-1 bg-jake-blue" />
            <h2 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter shadow-jake-blue">Selected Works</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {works.map((work, idx) => (
              <div key={idx} className="bg-jake-dark/50 border border-jake-blue/20 rounded-3xl p-8 backdrop-blur-sm hover:border-jake-blue/50 transition-colors group">
                <div className="flex flex-col h-full justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-xl font-bold text-white uppercase tracking-tight group-hover:text-jake-blue transition-colors max-w-[80%]">{work.title}</h3>
                      {work.date && <span className="text-[10px] font-mono text-zinc-500 border border-zinc-800 px-2 py-1 rounded">{work.date}</span>}
                    </div>
                    <ul className="space-y-3 mb-6">
                      {work.points.map((point, i) => (
                        <li key={i} className="text-sm text-zinc-400 leading-relaxed pl-4 border-l border-jake-blue/30">
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {work.tech && (
                    <div className="pt-6 border-t border-white/5">
                      <p className="text-[10px] text-jake-blue font-mono uppercase tracking-wider">{work.tech}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Achievements Section */}
        <section className="mb-24 w-full">
          <div className="flex items-center gap-4 mb-12">
            <div className="w-12 h-1 bg-jake-blue" />
            <h2 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter">Achievements</h2>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {achievements.map((ach, idx) => (
              <div key={idx} className="bg-gradient-to-r from-jake-blue/10 to-transparent border-l-4 border-jake-blue p-8 rounded-r-3xl flex flex-col md:flex-row md:items-center justify-between gap-4 backdrop-blur-md">
                <div>
                  <h3 className="text-xl font-bold text-white uppercase tracking-tight mb-2">{ach.title}</h3>
                  <p className="text-zinc-400 text-sm font-medium">{ach.desc}</p>
                </div>
                <div className="shrink-0">
                  <div className="w-12 h-12 bg-jake-blue/20 rounded-full flex items-center justify-center text-jake-blue">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trophy"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" /></svg>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}