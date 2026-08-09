import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, 
  Sparkles, 
  ShieldCheck, 
  QrCode,
  X,
  CheckCircle2,
  Mic,
  Languages,
  CheckCheck
} from 'lucide-react';

interface HeroProps {
  onStartWhatsApp?: () => void;
  onLoginModalOpen?: () => void;
  onSignUpModalOpen?: () => void;
}

interface ChatBubble {
  sender: 'patient' | 'ai';
  text: string;
  time: string;
  isVoice?: boolean;
}

interface ChatThreadCard {
  id: string;
  position: string;
  maxWidth: string;
  rotate: string;
  scale: number;
  blurPx: number;
  opacityVal: number;
  floatAnim: { y: number[]; transition: object };
  messages: ChatBubble[];
}

export function Hero({ onStartWhatsApp }: HeroProps) {
  const [showQrModal, setShowQrModal] = useState(false);

  /* Authentic WhatsApp Conversation Threads spread across the entire Hero section (1px blur, 70% opacity) */
  const whatsappThreads: ChatThreadCard[] = [
    {
      id: 'thread-1',
      position: "-left-2 sm:left-4 top-4 sm:top-8",
      maxWidth: "w-[240px] sm:w-[270px]",
      rotate: "rotate-1",
      scale: 0.95,
      blurPx: 1,
      opacityVal: 0.70,
      floatAnim: { y: [0, -8, 0], transition: { duration: 12, repeat: Infinity, ease: "easeInOut" } },
      messages: [
        { sender: 'patient', text: 'Sugar 126', time: '08:02 AM' },
        { sender: 'ai', text: 'Fasting or after meal?', time: '08:02 AM' },
        { sender: 'patient', text: 'Fasting', time: '08:03 AM' },
        { sender: 'ai', text: 'Saved successfully.', time: '08:03 AM' }
      ]
    },
    {
      id: 'thread-2',
      position: "left-[20%] sm:left-[22%] top-2 sm:top-4",
      maxWidth: "w-[230px] sm:w-[260px]",
      rotate: "-rotate-2",
      scale: 0.9,
      blurPx: 1,
      opacityVal: 0.68,
      floatAnim: { y: [0, 8, 0], transition: { duration: 14, repeat: Infinity, ease: "easeInOut", delay: 0.5 } },
      messages: [
        { sender: 'patient', text: 'Weight 71 kg', time: '07:30 AM' },
        { sender: 'ai', text: 'Recorded successfully.', time: '07:30 AM' }
      ]
    },
    {
      id: 'thread-3',
      position: "right-[20%] sm:right-[22%] top-2 sm:top-4",
      maxWidth: "w-[230px] sm:w-[260px]",
      rotate: "rotate-2",
      scale: 0.9,
      blurPx: 1,
      opacityVal: 0.68,
      floatAnim: { y: [0, -8, 0], transition: { duration: 15, repeat: Infinity, ease: "easeInOut", delay: 1 } },
      messages: [
        { sender: 'patient', text: 'Pulse 74', time: '09:00 AM' },
        { sender: 'ai', text: 'Saved successfully.', time: '09:00 AM' }
      ]
    },
    {
      id: 'thread-4',
      position: "-right-2 sm:right-4 top-4 sm:top-8",
      maxWidth: "w-[240px] sm:w-[270px]",
      rotate: "-rotate-1",
      scale: 0.95,
      blurPx: 1,
      opacityVal: 0.70,
      floatAnim: { y: [0, 9, 0], transition: { duration: 11, repeat: Infinity, ease: "easeInOut", delay: 0.8 } },
      messages: [
        { sender: 'patient', text: 'BP 128/82', time: '09:15 AM' },
        { sender: 'ai', text: 'Morning or evening reading?', time: '09:15 AM' },
        { sender: 'patient', text: 'Morning', time: '09:16 AM' },
        { sender: 'ai', text: 'Blood pressure logged.', time: '09:16 AM' }
      ]
    },
    {
      id: 'thread-5',
      position: "-left-4 sm:left-2 top-1/2 -translate-y-28",
      maxWidth: "w-[250px] sm:w-[280px]",
      rotate: "-rotate-3",
      scale: 0.95,
      blurPx: 1,
      opacityVal: 0.72,
      floatAnim: { y: [0, -10, 0], transition: { duration: 13, repeat: Infinity, ease: "easeInOut", delay: 1.2 } },
      messages: [
        { sender: 'patient', text: 'Voice note (0:14)', time: '10:05 AM', isVoice: true },
        { sender: 'ai', text: 'Voice processed successfully.', time: '10:05 AM' }
      ]
    },
    {
      id: 'thread-6',
      position: "left-[16%] sm:left-[18%] top-1/2 -translate-y-12",
      maxWidth: "w-[220px] sm:w-[250px]",
      rotate: "rotate-1",
      scale: 0.88,
      blurPx: 1,
      opacityVal: 0.66,
      floatAnim: { y: [0, 8, 0], transition: { duration: 16, repeat: Infinity, ease: "easeInOut", delay: 1.8 } },
      messages: [
        { sender: 'patient', text: 'Temperature 98.4°F', time: '10:30 AM' },
        { sender: 'ai', text: 'Recorded successfully.', time: '10:30 AM' }
      ]
    },
    {
      id: 'thread-7',
      position: "right-[16%] sm:right-[18%] top-1/2 -translate-y-12",
      maxWidth: "w-[220px] sm:w-[250px]",
      rotate: "-rotate-2",
      scale: 0.88,
      blurPx: 1,
      opacityVal: 0.66,
      floatAnim: { y: [0, -8, 0], transition: { duration: 14, repeat: Infinity, ease: "easeInOut", delay: 2.2 } },
      messages: [
        { sender: 'patient', text: 'Sugar 110', time: '08:00 AM' },
        { sender: 'ai', text: 'Fasting or after meal?', time: '08:00 AM' },
        { sender: 'patient', text: 'Fasting', time: '08:01 AM' },
        { sender: 'ai', text: 'Saved successfully.', time: '08:01 AM' }
      ]
    },
    {
      id: 'thread-8',
      position: "-right-4 sm:right-2 top-1/2 -translate-y-28",
      maxWidth: "w-[250px] sm:w-[280px]",
      rotate: "rotate-3",
      scale: 0.95,
      blurPx: 1,
      opacityVal: 0.72,
      floatAnim: { y: [0, 10, 0], transition: { duration: 12, repeat: Infinity, ease: "easeInOut", delay: 1.5 } },
      messages: [
        { sender: 'patient', text: 'BP 120/80', time: '06:00 PM' },
        { sender: 'ai', text: 'Morning or evening reading?', time: '06:00 PM' },
        { sender: 'patient', text: 'Evening', time: '06:01 PM' },
        { sender: 'ai', text: 'Blood pressure logged.', time: '06:01 PM' }
      ]
    },
    {
      id: 'thread-9',
      position: "left-2 sm:left-6 bottom-16 sm:bottom-20",
      maxWidth: "w-[240px] sm:w-[270px]",
      rotate: "rotate-2",
      scale: 0.93,
      blurPx: 1,
      opacityVal: 0.70,
      floatAnim: { y: [0, -8, 0], transition: { duration: 15, repeat: Infinity, ease: "easeInOut", delay: 2.5 } },
      messages: [
        { sender: 'patient', text: 'Weight 71 kg', time: '07:45 AM' },
        { sender: 'ai', text: 'Recorded successfully.', time: '07:45 AM' }
      ]
    },
    {
      id: 'thread-10',
      position: "left-[24%] sm:left-[26%] bottom-10 sm:bottom-14",
      maxWidth: "w-[230px] sm:w-[260px]",
      rotate: "-rotate-1",
      scale: 0.88,
      blurPx: 1,
      opacityVal: 0.68,
      floatAnim: { y: [0, 7, 0], transition: { duration: 13, repeat: Infinity, ease: "easeInOut", delay: 0.3 } },
      messages: [
        { sender: 'patient', text: 'Voice note (0:18)', time: '07:15 PM', isVoice: true },
        { sender: 'ai', text: 'Voice processed successfully.', time: '07:15 PM' }
      ]
    },
    {
      id: 'thread-11',
      position: "right-[24%] sm:right-[26%] bottom-10 sm:bottom-14",
      maxWidth: "w-[230px] sm:w-[260px]",
      rotate: "rotate-2",
      scale: 0.88,
      blurPx: 1,
      opacityVal: 0.68,
      floatAnim: { y: [0, -7, 0], transition: { duration: 16, repeat: Infinity, ease: "easeInOut", delay: 2.0 } },
      messages: [
        { sender: 'patient', text: 'Pulse 72', time: '08:30 AM' },
        { sender: 'ai', text: 'Saved successfully.', time: '08:30 AM' }
      ]
    },
    {
      id: 'thread-12',
      position: "right-2 sm:right-6 bottom-16 sm:bottom-20",
      maxWidth: "w-[240px] sm:w-[270px]",
      rotate: "-rotate-2",
      scale: 0.94,
      blurPx: 1,
      opacityVal: 0.70,
      floatAnim: { y: [0, 9, 0], transition: { duration: 14, repeat: Infinity, ease: "easeInOut", delay: 2.8 } },
      messages: [
        { sender: 'patient', text: 'Sugar 126', time: '08:15 AM' },
        { sender: 'ai', text: 'Fasting or after meal?', time: '08:15 AM' },
        { sender: 'patient', text: 'Fasting', time: '08:16 AM' },
        { sender: 'ai', text: 'Saved successfully.', time: '08:16 AM' }
      ]
    }
  ];

  const handlePrimaryCta = () => {
    setShowQrModal(true);
    if (onStartWhatsApp) onStartWhatsApp();
  };

  return (
    <section className="relative w-full min-h-[calc(100vh-80px)] flex flex-col justify-between px-4 sm:px-8 lg:px-12 py-6 overflow-hidden z-10">
      
      {/* ATMOSPHERIC BACKGROUND LAYER: 6 Realistic WhatsApp Chat Threads */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 select-none">
        {whatsappThreads.map((thread) => (
          <motion.div
            key={thread.id}
            animate={thread.floatAnim}
            style={{ 
              filter: `blur(${thread.blurPx}px)`, 
              opacity: thread.opacityVal,
              transform: `scale(${thread.scale})`
            }}
            className={`absolute ${thread.position} ${thread.maxWidth} ${thread.rotate} bg-[#0b141a] border border-[#222d34] rounded-2xl p-3 shadow-2xl backdrop-blur-md pointer-events-none hidden sm:flex flex-col gap-2`}
          >
            {/* WhatsApp Chat Top Header */}
            <div className="flex items-center justify-between pb-1.5 border-b border-[#222d34]">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#25D366]"></span>
                <span className="text-[11px] font-bold text-[#e9edef] tracking-wide font-sans">
                  Doc2Me AI
                </span>
              </div>
              <span className="text-[9px] text-[#8696a0] font-mono uppercase tracking-wider bg-[#111b21] px-1.5 py-0.5 rounded border border-[#222d34]">
                WhatsApp Log
              </span>
            </div>

            {/* Chat Message Bubbles */}
            <div className="flex flex-col gap-1.5">
              {thread.messages.map((msg, idx) => {
                const isPatient = msg.sender === 'patient';
                return (
                  <div 
                    key={idx}
                    className={`flex flex-col ${isPatient ? 'items-end' : 'items-start'}`}
                  >
                    <div 
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-medium max-w-[88%] shadow-sm ${
                        isPatient 
                          ? 'bg-[#005c4b] text-[#e9edef] rounded-tr-none' 
                          : 'bg-[#202c33] text-[#e9edef] rounded-tl-none border border-[#2a3942]/50'
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        {msg.isVoice && <Mic className="w-3 h-3 text-[#25D366] shrink-0" />}
                        <span>{msg.text}</span>
                      </div>
                      <div className={`text-[9px] mt-0.5 flex items-center justify-end gap-1 ${
                        isPatient ? 'text-emerald-200/70' : 'text-[#8696a0]'
                      }`}>
                        <span>{msg.time}</span>
                        {isPatient && <CheckCheck className="w-3 h-3 text-[#53bdeb] shrink-0" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        ))}
      </div>

      {/* CENTER HERO CONTENT */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-5xl mx-auto my-auto py-8 sm:py-14 px-2">
        
        {/* Top Tagline Pill Badge Restored */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-950/60 border border-purple-500/30 backdrop-blur-xl shadow-lg mb-6 sm:mb-8"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
          <span className="text-xs font-semibold text-purple-100 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-fuchsia-400" />
            AI WhatsApp Health Companion
          </span>
          <span className="text-[11px] text-purple-300/80 font-medium border-l border-purple-500/30 pl-2.5 flex items-center gap-1">
            <Languages className="w-3 h-3 text-fuchsia-400" />
            English • हिन्दी • Hinglish
          </span>
        </motion.div>

        {/* Headline - Increased Visual Weight */}
        <motion.h1 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tight text-white leading-[1.04] font-['Plus_Jakarta_Sans']"
        >
          The WhatsApp Companion <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-fuchsia-300 to-purple-300">
            For Your Health Records
          </span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-6 sm:mt-8 text-base sm:text-xl text-purple-200/90 max-w-2xl font-normal leading-relaxed text-balance"
        >
          Just type or speak your daily vitals directly to Doc2Me on WhatsApp. No forms, no apps, no friction. Build structured clinical history automatically.
        </motion.p>

        {/* Micro Trust Indicators */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.35 }}
          className="mt-6 sm:mt-7 flex items-center justify-center gap-2 text-xs font-medium text-purple-300/80"
        >
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>End-to-End Encrypted • Instant WhatsApp AI Record Sync</span>
        </motion.div>
      </div>

      {/* FOOTER-STYLE SINGLE-SCREEN BADGE */}
      <div className="w-full max-w-7xl mx-auto flex items-center justify-between text-[11px] text-purple-300/60 pt-3 border-t border-purple-500/15 mt-auto relative z-10">
        <span className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          &copy; {new Date().getFullYear()} Doc2Me • AI WhatsApp Structured Health Records
        </span>
        <span className="hidden sm:inline text-purple-200/70 font-mono">
          WhatsApp Bot • English • हिन्दी • Hinglish
        </span>
      </div>

      {/* WHATSAPP LAUNCH MODAL */}
      <AnimatePresence>
        {showQrModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setShowQrModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#120a2a] rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-purple-500/30 relative text-center text-white"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-purple-900/40 hover:bg-purple-800/60 text-purple-200 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mx-auto flex items-center justify-center mb-3">
                <MessageSquare className="w-6 h-6" />
              </div>

              <h3 className="text-xl font-bold text-white">
                Start Logging on WhatsApp
              </h3>
              <p className="text-xs text-purple-200/80 mt-1">
                Scan or click below to launch Doc2Me on WhatsApp and start logging your vitals.
              </p>

              <div className="my-5 p-4 bg-purple-950/60 rounded-2xl border border-purple-500/30 flex justify-center">
                <div className="bg-white p-3 rounded-2xl shadow-xl border border-purple-200 relative">
                  <QrCode className="w-40 h-40 text-slate-900" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-[#25D366] text-slate-950 flex items-center justify-center shadow-lg">
                      <MessageSquare className="w-5 h-5 fill-current" />
                    </div>
                  </div>
                </div>
              </div>

              <a
                href="https://wa.me/?text=Hi%20Doc2Me"
                target="_blank"
                rel="noreferrer"
                className="w-full py-3.5 rounded-full bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                Open WhatsApp Directly
              </a>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </section>
  );
}


