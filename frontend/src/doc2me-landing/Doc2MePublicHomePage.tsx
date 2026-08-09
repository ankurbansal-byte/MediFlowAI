// @ts-nocheck
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BackgroundSunrise } from './BackgroundSunrise';
// import patientWhatsappHeroImg from "../assets/images/patient_whatsapp_hero_1786160798231.jpg";
const patientWhatsappHeroImg = "";
import {
  Activity,
  ShieldCheck,
  Building2,
  Stethoscope,
  Users,
  Smartphone,
  ChevronDown,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Heart,
  Thermometer,
  Scale,
  Zap,
  Lock,
  MessageSquare,
  HelpCircle,
  FileText,
  BarChart3,
  Award,
  Globe,
  Plus,
  X,
  QrCode,
  Search,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  UserCheck,
  CheckCheck,
  Mic,
  Clock,
  ArrowUpRight,
  Bot,
  Brain,
  Database,
  Languages,
  FolderHeart,
  Calendar,
  Eye
} from 'lucide-react';

interface Doc2MePublicHomePageProps {
  onOpenPortalModal?: (portalType: 'hospital' | 'doctor' | 'patient' | 'founders') => void;
}

export function Doc2MePublicHomePage({ onOpenPortalModal }: Doc2MePublicHomePageProps) {
  // State for interactive elements
  const [selectedVitalTab, setSelectedVitalTab] = useState<'sugar' | 'bp' | 'temp' | 'weight' | 'pulse' | 'spo2' | 'lab'>('sugar');
  const [activeFaqIndex, setActiveFaqIndex] = useState<number | null>(0);
  const [showQrModal, setShowQrModal] = useState(false);
  const [selectedPortal, setSelectedPortal] = useState<'hospital' | 'doctor' | 'patient' | 'founders' | null>(null);
  const [workflowLang, setWorkflowLang] = useState<'en' | 'hinglish' | 'hi'>('en');
  const [isMetricsExpanded, setIsMetricsExpanded] = useState(false);
  
  // Spotlight Cursor Tracking State
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 500, y: 300 });
  const spotlightSectionRef = React.useRef<HTMLDivElement>(null);

  const handleSpotlightMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (spotlightSectionRef.current) {
      const rect = spotlightSectionRef.current.getBoundingClientRect();
      setMousePos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };
  
  // Interactive Simulator State
  const [simVitalType, setSimVitalType] = useState<'sugar' | 'bp' | 'weight' | 'pulse'>('sugar');
  const [simInputValue, setSimInputValue] = useState('Sugar 126 Fasting');
  const [simMessages, setSimMessages] = useState([
    { id: 1, sender: 'patient', text: 'Sugar 126', time: '08:02 AM' },
    { id: 2, sender: 'ai', text: 'Fasting or Post-Meal?', time: '08:02 AM' },
    { id: 3, sender: 'patient', text: 'Fasting', time: '08:03 AM' },
    { id: 4, sender: 'ai', text: 'Saved successfully ✅. Fasting Sugar 126 mg/dL logged for Doctor review.', time: '08:03 AM' }
  ]);

  const handleSimSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!simInputValue.trim()) return;
    
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newMsg = { id: Date.now(), sender: 'patient', text: simInputValue, time: now };
    
    setSimMessages(prev => [...prev, newMsg]);
    setSimInputValue('');

    setTimeout(() => {
      const aiReply = {
        id: Date.now() + 1,
        sender: 'ai',
        text: `Recorded successfully ✅. Entry logged into Patient ID #D2M-8941 for OPD Doctor review.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setSimMessages(prev => [...prev, aiReply]);
    }, 800);
  };

  // Vitals Data Array
  const vitalsData = [
    {
      id: 'sugar',
      name: 'Blood Sugar',
      sub: 'Fasting & Post-Prandial (PP)',
      unit: 'mg/dL',
      sampleVal: '110 mg/dL (Fasting)',
      icon: Activity,
      color: 'from-emerald-500 to-teal-600',
      textColor: 'text-emerald-600',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/30',
      activeTabBg: 'bg-emerald-500 text-white shadow-none',
      desc: 'Tracks daily fasting and post-meal glucose trends to help doctors evaluate treatment response effortlessly.'
    },
    {
      id: 'bp',
      name: 'Blood Pressure',
      sub: 'Systolic & Diastolic',
      unit: 'mmHg',
      sampleVal: '128 / 82 mmHg',
      icon: Heart,
      color: 'from-rose-500 to-red-600',
      textColor: 'text-rose-600',
      bgColor: 'bg-rose-500/10',
      borderColor: 'border-rose-500/30',
      activeTabBg: 'bg-rose-500 text-white shadow-none',
      desc: 'Logs systolic and diastolic readings continuously, giving doctors a clear view of blood pressure patterns during follow-ups.'
    },
    {
      id: 'temp',
      name: 'Body Temperature',
      sub: 'Fahrenheit / Celsius',
      unit: '°F',
      sampleVal: '98.6 °F',
      icon: Thermometer,
      color: 'from-amber-500 to-yellow-600',
      textColor: 'text-amber-600',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/30',
      activeTabBg: 'bg-amber-500 text-white shadow-none',
      desc: 'Captures quick temperature logs with automated timestamps for accurate clinical evaluation.'
    },
    {
      id: 'weight',
      name: 'Body Weight',
      sub: 'Kilograms (kg)',
      unit: 'kg',
      sampleVal: '71.5 kg',
      icon: Scale,
      color: 'from-indigo-500 to-blue-600',
      textColor: 'text-indigo-600',
      bgColor: 'bg-indigo-500/10',
      borderColor: 'border-indigo-500/30',
      activeTabBg: 'bg-indigo-600 text-white shadow-none',
      desc: 'Monitors weight changes over time, supporting overall wellness and routine health tracking.'
    },
    {
      id: 'pulse',
      name: 'Pulse Rate',
      sub: 'Beats Per Minute (BPM)',
      unit: 'BPM',
      sampleVal: '74 BPM',
      icon: Zap,
      color: 'from-violet-500 to-purple-600',
      textColor: 'text-violet-600',
      bgColor: 'bg-violet-500/10',
      borderColor: 'border-violet-500/30',
      activeTabBg: 'bg-violet-600 text-white shadow-none',
      desc: 'Records heart rate variations alongside vitals for comprehensive baseline reviews.'
    },
    {
      id: 'spo2',
      name: 'SpO2 Oxygen',
      sub: 'Blood Oxygen Saturation',
      unit: '%',
      sampleVal: '98%',
      icon: TrendingUp,
      color: 'from-cyan-500 to-teal-500',
      textColor: 'text-cyan-600',
      bgColor: 'bg-cyan-500/10',
      borderColor: 'border-cyan-500/30',
      activeTabBg: 'bg-cyan-500 text-white shadow-none',
      desc: 'Tracks blood oxygen saturation levels continuously for respiratory wellness.'
    },
    {
      id: 'lab',
      name: 'Lab Reports & Records',
      sub: 'OCR Photo & Voice Summary',
      unit: 'PDF / Image',
      sampleVal: 'CBC & Lipid Report',
      icon: FileText,
      color: 'from-pink-500 to-fuchsia-600',
      textColor: 'text-pink-600',
      bgColor: 'bg-pink-500/10',
      borderColor: 'border-pink-500/30',
      activeTabBg: 'bg-pink-600 text-white shadow-none',
      desc: 'Extracts key clinical values from lab photos or PDFs, attaching clean summaries to the patient timeline.'
    }
  ];

  // FAQs Data Array
  const faqs = [
    {
      question: "Can patients sign up on Doc2Me directly by themselves?",
      answer: "No. Patient access is strictly hospital-authorized. To maintain strict medical data integrity and prevent unauthorized spam entries, only registered Hospital Admins can allot Patient IDs and grant WhatsApp logging access."
    },
    {
      question: "Do patients need to download any Android or iOS mobile application?",
      answer: "Not at all. Doc2Me works 100% inside standard WhatsApp. Patients send simple messages or voice notes (e.g. 'Sugar 120') on WhatsApp, which has a 98% adoption rate across all age groups."
    },
    {
      question: "How do Doctors review patient vitals during OPD follow-ups?",
      answer: "During OPD visits, the Doctor simply enters the Patient ID into the secure Doc2Me Doctor Portal. In less than 3 seconds, a clean 15-day trend graph, min/max averages, and flagged abnormal values appear on screen."
    },
    {
      question: "Is patient medical data secure and compliant with data privacy laws?",
      answer: "Yes. All data transmissions are end-to-end encrypted. Patient records are accessible solely by the authorized hospital, treating doctors, and assigned patient ID."
    },
    {
      question: "Which 7 basic vitals does Doc2Me support?",
      answer: "Doc2Me supports Blood Sugar (Fasting & PP), Blood Pressure (Sys/Dia), Body Temperature, Body Weight, Pulse Rate, SpO2 Oxygen Saturation, and Lab Report photos/voice summary."
    },
    {
      question: "How fast can a Hospital integrate Doc2Me into its OPD system?",
      answer: "Hospital Admin setup takes under 10 minutes. Hospital staff receive dedicated Admin credentials to generate Patient IDs and start handing out WhatsApp tracking passes instantly."
    }
  ];

  /* Authentic WhatsApp Conversation Threads spread across the Hero section (3px blur for atmospheric background, 50% opacity, Hinglish texts) */
  const whatsappThreads = [
    {
      id: 'thread-1',
      position: "-left-2 sm:left-4 top-6 sm:top-10",
      maxWidth: "w-[220px] sm:w-[250px]",
      rotate: "rotate-1",
      scale: 0.92,
      blurPx: 3,
      opacityVal: 0.50,
      floatAnim: { y: [0, -8, 0], transition: { duration: 12, repeat: Infinity, ease: "easeInOut" } },
      messages: [
        { sender: 'patient', text: 'Aaj fasting sugar 126 mg/dL aayi hai', time: '08:02 AM' },
        { sender: 'ai', text: 'Sugar 126 mg/dL (Fasting) save ho gaya hai.', time: '08:02 AM' }
      ]
    },
    {
      id: 'thread-2',
      position: "left-[18%] sm:left-[20%] top-4 sm:top-6",
      maxWidth: "w-[200px] sm:w-[240px]",
      rotate: "-rotate-2",
      scale: 0.88,
      blurPx: 3,
      opacityVal: 0.48,
      floatAnim: { y: [0, 8, 0], transition: { duration: 14, repeat: Infinity, ease: "easeInOut", delay: 0.5 } },
      messages: [
        { sender: 'patient', text: 'Mera weight 71 kg hai sir', time: '07:30 AM' },
        { sender: 'ai', text: 'Vajan 71 kg log ho gaya hai.', time: '07:30 AM' }
      ]
    },
    {
      id: 'thread-3',
      position: "right-[18%] sm:right-[20%] top-4 sm:top-6",
      maxWidth: "w-[200px] sm:w-[240px]",
      rotate: "rotate-2",
      scale: 0.88,
      blurPx: 3,
      opacityVal: 0.48,
      floatAnim: { y: [0, -8, 0], transition: { duration: 15, repeat: Infinity, ease: "easeInOut", delay: 1 } },
      messages: [
        { sender: 'patient', text: 'Pulse rate 74 bpm', time: '09:00 AM' },
        { sender: 'ai', text: 'Dil ki dhadkan 74 bpm record kar li.', time: '09:00 AM' }
      ]
    },
    {
      id: 'thread-4',
      position: "-right-2 sm:right-4 top-6 sm:top-10",
      maxWidth: "w-[220px] sm:w-[250px]",
      rotate: "-rotate-1",
      scale: 0.92,
      blurPx: 3,
      opacityVal: 0.50,
      floatAnim: { y: [0, 9, 0], transition: { duration: 11, repeat: Infinity, ease: "easeInOut", delay: 0.8 } },
      messages: [
        { sender: 'patient', text: 'Aaj subah BP 128/82 tha', time: '09:15 AM' },
        { sender: 'ai', text: 'Subah ka BP 128/82 mmHg save ho gaya.', time: '09:16 AM' }
      ]
    },
    {
      id: 'thread-5',
      position: "-left-4 sm:left-2 top-1/2 -translate-y-24",
      maxWidth: "w-[220px] sm:w-[260px]",
      rotate: "-rotate-3",
      scale: 0.92,
      blurPx: 3,
      opacityVal: 0.52,
      floatAnim: { y: [0, -10, 0], transition: { duration: 13, repeat: Infinity, ease: "easeInOut", delay: 1.2 } },
      messages: [
        { sender: 'patient', text: '🎤 Aawaz Note (0:14): Kal raat thoda sir dard tha', time: '10:05 AM', isVoice: true },
        { sender: 'ai', text: 'Voice note samajh kar record kar liya gaya.', time: '10:05 AM' }
      ]
    },
    {
      id: 'thread-6',
      position: "left-[14%] sm:left-[16%] top-1/2 -translate-y-8",
      maxWidth: "w-[190px] sm:w-[230px]",
      rotate: "rotate-1",
      scale: 0.85,
      blurPx: 3,
      opacityVal: 0.46,
      floatAnim: { y: [0, 8, 0], transition: { duration: 16, repeat: Infinity, ease: "easeInOut", delay: 1.8 } },
      messages: [
        { sender: 'patient', text: 'Bukhar 98.4°F hai', time: '10:30 AM' },
        { sender: 'ai', text: 'Taapmaan 98.4°F record ho gaya.', time: '10:30 AM' }
      ]
    },
    {
      id: 'thread-7',
      position: "right-[14%] sm:right-[16%] top-1/2 -translate-y-8",
      maxWidth: "w-[190px] sm:w-[230px]",
      rotate: "-rotate-2",
      scale: 0.85,
      blurPx: 3,
      opacityVal: 0.46,
      floatAnim: { y: [0, -8, 0], transition: { duration: 14, repeat: Infinity, ease: "easeInOut", delay: 2.2 } },
      messages: [
        { sender: 'patient', text: 'Sugar 110 mg/dL khaali pet', time: '08:00 AM' },
        { sender: 'ai', text: 'Fasting Sugar 110 mg/dL save hua.', time: '08:01 AM' }
      ]
    },
    {
      id: 'thread-8',
      position: "-right-4 sm:right-2 top-1/2 -translate-y-24",
      maxWidth: "w-[220px] sm:w-[260px]",
      rotate: "rotate-3",
      scale: 0.92,
      blurPx: 3,
      opacityVal: 0.52,
      floatAnim: { y: [0, 10, 0], transition: { duration: 12, repeat: Infinity, ease: "easeInOut", delay: 1.5 } },
      messages: [
        { sender: 'patient', text: 'Shaam ko BP 120/80 aaya', time: '06:00 PM' },
        { sender: 'ai', text: 'Shaam ka BP 120/80 mmHg record hua.', time: '06:01 PM' }
      ]
    },
    {
      id: 'thread-9',
      position: "left-2 sm:left-6 bottom-10 sm:bottom-16",
      maxWidth: "w-[210px] sm:w-[250px]",
      rotate: "rotate-2",
      scale: 0.90,
      blurPx: 3,
      opacityVal: 0.50,
      floatAnim: { y: [0, -8, 0], transition: { duration: 15, repeat: Infinity, ease: "easeInOut", delay: 2.5 } },
      messages: [
        { sender: 'patient', text: 'Aaj vajan 71.5 kg', time: '07:45 AM' },
        { sender: 'ai', text: 'Vajan 71.5 kg log ho gaya.', time: '07:45 AM' }
      ]
    },
    {
      id: 'thread-10',
      position: "left-[20%] sm:left-[22%] bottom-6 sm:bottom-10",
      maxWidth: "w-[200px] sm:w-[240px]",
      rotate: "-rotate-1",
      scale: 0.85,
      blurPx: 3,
      opacityVal: 0.48,
      floatAnim: { y: [0, 7, 0], transition: { duration: 13, repeat: Infinity, ease: "easeInOut", delay: 0.3 } },
      messages: [
        { sender: 'patient', text: '🎤 Aawaz Note (0:18): Dawa time par le li hai', time: '07:15 PM', isVoice: true },
        { sender: 'ai', text: 'Note samajh kar log kar diya gaya.', time: '07:15 PM' }
      ]
    },
    {
      id: 'thread-11',
      position: "right-[20%] sm:right-[22%] bottom-6 sm:bottom-10",
      maxWidth: "w-[200px] sm:w-[240px]",
      rotate: "rotate-2",
      scale: 0.85,
      blurPx: 3,
      opacityVal: 0.48,
      floatAnim: { y: [0, -7, 0], transition: { duration: 16, repeat: Infinity, ease: "easeInOut", delay: 2.0 } },
      messages: [
        { sender: 'patient', text: 'SpO2 oxygen 98% aayi', time: '08:30 AM' },
        { sender: 'ai', text: 'Oxygen SpO2 98% record ho gaya.', time: '08:30 AM' }
      ]
    },
    {
      id: 'thread-12',
      position: "right-2 sm:right-6 bottom-10 sm:bottom-16",
      maxWidth: "w-[210px] sm:w-[250px]",
      rotate: "-rotate-2",
      scale: 0.90,
      blurPx: 3,
      opacityVal: 0.50,
      floatAnim: { y: [0, 9, 0], transition: { duration: 14, repeat: Infinity, ease: "easeInOut", delay: 2.8 } },
      messages: [
        { sender: 'patient', text: 'Sugar 126 khaali pet', time: '08:15 AM' },
        { sender: 'ai', text: 'Sugar 126 mg/dL (Fasting) saved.', time: '08:16 AM' }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-['Plus_Jakarta_Sans',sans-serif] selection:bg-blue-600 selection:text-white">
      
      {/* SECTION 1: TOP NAVIGATION BAR */}
      <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 shadow-2xl text-white">
        <div className="w-full px-4 sm:px-8 lg:px-12 h-20 flex items-center justify-between">
          
          {/* Logo & B2B Badge */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-center font-black text-lg shadow-md shadow-blue-900/40">
              D2M
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-extrabold text-white tracking-tight font-sans">
                  Doc2Me
                </span>
                <span className="bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  B2B Health-Tech
                </span>
              </div>
              <p className="text-[10px] text-purple-200/70 font-medium">Hospital & Clinic Vitals Platform</p>
            </div>
          </div>

          {/* Desktop Navigation Links - Enhanced Font & Prominence */}
          <nav className="hidden md:flex items-center gap-6 lg:gap-8 text-sm sm:text-base font-semibold tracking-wide text-purple-100">
            <a href="#value-prop" className="hover:text-amber-300 transition-colors">Who We Are</a>
            <a href="#why-doc2me" className="hover:text-amber-300 transition-colors">Why Doc2Me</a>
            <a href="#pricing" target="_blank" rel="noopener noreferrer" className="hover:text-amber-300 transition-colors flex items-center gap-1">
              <span>Pricing</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-purple-400" />
            </a>
            <a href="#faq" className="hover:text-amber-300 transition-colors">FAQ</a>
          </nav>

          {/* Action Buttons: Partner + Login + Signup + NEW Patient Point of View */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            <button
              onClick={() => setShowQrModal(true)}
              className="hidden lg:flex px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-extrabold shadow-md shadow-blue-600/30 transition-all items-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-95 border border-blue-400/30"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Book a Free Demo</span>
            </button>

            <button
              onClick={() => setSelectedPortal('hospital')}
              className="px-3 py-2 rounded-xl bg-purple-900/60 hover:bg-purple-800 text-purple-200 text-xs font-bold transition-all items-center gap-1.5 cursor-pointer border border-purple-500/30"
            >
              <span>Login</span>
            </button>

            <button
              onClick={() => setShowQrModal(true)}
              className="px-3 py-2 rounded-xl bg-purple-800/80 hover:bg-purple-700 text-white text-xs font-bold transition-all items-center gap-1.5 cursor-pointer border border-purple-400/30"
            >
              <span>Signup</span>
            </button>

            {/* NEW PATIENT POINT OF VIEW BUTTON */}
            <button
              onClick={() => {
                if (onOpenPortalModal) {
                  onOpenPortalModal('patient');
                } else {
                  setSelectedPortal('patient');
                }
              }}
              className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-extrabold shadow-md shadow-emerald-900/40 transition-all flex items-center gap-1.5 cursor-pointer hover:scale-[1.03] active:scale-95 border border-emerald-400/40 ring-2 ring-emerald-500/30"
            >
              <Eye className="w-3.5 h-3.5 text-emerald-100 animate-pulse shrink-0" />
              <span>Patient Point of View</span>
            </button>
          </div>
        </div>
      </header>

      {/* SECTION 2: HERO SECTION (Cinematic Dark Purple with 12 Floating WhatsApp Threads) */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-16 lg:pb-28 bg-[#090417] text-white border-b border-purple-500/20">
        
        {/* Background Sunrise Radial Spotlight & Glow Layer */}
        <BackgroundSunrise />

        {/* ATMOSPHERIC BACKGROUND LAYER: 12 Realistic WhatsApp Chat Threads */}
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
              className={`absolute ${thread.position} ${thread.maxWidth} ${thread.rotate} bg-[#0b141a] border border-[#222d34] rounded-2xl p-3 shadow-2xl backdrop-blur-md pointer-events-none hidden sm:flex flex-col gap-2 z-0`}
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

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Left Hero Content */}
            <div className="lg:col-span-7 text-center lg:text-left">
              
              {/* Feature Badges */}
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-flex flex-wrap items-center justify-center lg:justify-start gap-2 p-1.5 rounded-2xl bg-blue-950/80 border border-blue-500/40 backdrop-blur-xl shadow-lg mb-6 text-xs font-semibold"
              >
                <span className="flex items-center gap-1.5 bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 px-3 py-1 rounded-xl">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  Seamless English, Hinglish & हिंदी Support for Patient Messaging
                </span>
                <span className="text-blue-100 flex items-center gap-1.5 px-2 py-0.5">
                  Zero App Downloads for Patients
                </span>
              </motion.div>

              {/* Main Catchy Headline */}
              <motion.h1 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.12]"
              >
                Empower Your Hospital with <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-indigo-200 to-amber-200">WhatsApp-Based Patient Vitals Tracking</span>
              </motion.h1>

              {/* Classy English Tagline */}
              <motion.p 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="mt-6 text-base sm:text-lg text-purple-200/90 font-normal leading-relaxed max-w-2xl mx-auto lg:mx-0"
              >
                Enable smarter outpatient care management. Enhance diagnosis with clean, seamless clinical vital trends, without changing how your patients connect with you.
              </motion.p>

              {/* Single Prominent Main Hero Button */}
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="mt-8 flex items-center justify-center lg:justify-start"
              >
                <button
                  onClick={() => setShowQrModal(true)}
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-extrabold text-base sm:text-lg shadow-xl shadow-blue-600/30 flex items-center justify-center gap-3 transition-all transform hover:scale-[1.02] active:scale-95 cursor-pointer border border-blue-400/40"
                >
                  <Building2 className="w-5 h-5" />
                  <span>Schedule a Demo for Your Hospital</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </motion.div>

              {/* Key Highlights under CTA */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="mt-8 pt-6 border-t border-purple-500/20 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs font-semibold text-purple-200/80"
              >
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Hospital Authorized Access</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Automated Clinical Trend Analytics</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Voice Note Compatible</span>
                </span>
              </motion.div>
            </div>

            {/* Right Hero Interactive Visual Preview Card (WhatsApp Dark Theme Inspired) */}
            <div className="lg:col-span-5 relative z-10">
              <div className="relative mx-auto max-w-md lg:max-w-none bg-[#0b141a]/95 backdrop-blur-xl rounded-3xl p-5 sm:p-6 shadow-2xl border border-[#222d34] text-white ring-1 ring-emerald-500/20">
                
                {/* Header Switcher inside Preview */}
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#222d34]">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#25D366] animate-pulse shadow-[0_0_8px_rgba(37,211,102,0.8)]"></span>
                    <span className="text-xs font-bold text-[#e9edef] uppercase tracking-wider">Live Workflow Demo</span>
                  </div>
                  <span className="text-[10px] bg-[#075e54] text-emerald-100 font-extrabold px-2.5 py-1 rounded-md border border-emerald-500/40">
                    Doc2Me AI Engine
                  </span>
                </div>

                {/* Patient WhatsApp -> Dual Dashboards Preview */}
                <div className="space-y-4">
                  
                  {/* Step A: Patient WhatsApp Chat Snippet (Authentic Light WhatsApp Theme) */}
                  <div className="bg-[#efeae2] rounded-2xl p-3.5 border border-slate-300 shadow-md">
                    <div className="flex items-center justify-between text-[11px] font-bold text-[#075e54] mb-2.5 px-1 pb-1.5 border-b border-slate-300/70">
                      <span className="flex items-center gap-1.5 font-sans">
                        <MessageSquare className="w-3.5 h-3.5 text-[#128c7e]" /> Patient WhatsApp Message
                      </span>
                      <span className="text-slate-600 font-mono text-[10px] bg-white/80 px-2 py-0.5 rounded border border-slate-200">Patient ID: #D2M-8941</span>
                    </div>

                    <div className="space-y-2.5 font-sans text-xs">
                      {/* Patient Outgoing (Light Green WhatsApp Bubble) */}
                      <div className="flex justify-end">
                        <div className="bg-[#dcf8c6] text-[#111b21] p-2.5 rounded-xl rounded-tr-none shadow-sm max-w-[88%] border border-emerald-200">
                          <p className="font-medium text-slate-900 leading-snug">Aaj subah Fasting Sugar 126 mg/dL aur BP 128/82 tha</p>
                          <div className="flex items-center justify-end gap-1 text-[9px] text-slate-500 mt-1">
                            <span>08:15 AM</span>
                            <CheckCheck className="w-3.5 h-3.5 text-[#34B7F1] shrink-0" />
                          </div>
                        </div>
                      </div>

                      {/* AI Incoming (Authentic White WhatsApp Bubble) */}
                      <div className="flex justify-start">
                        <div className="bg-white text-[#111b21] p-2.5 rounded-xl rounded-tl-none shadow-sm max-w-[88%] border border-slate-200/90">
                          <p className="font-bold text-[#075e54] flex items-center gap-1">
                            <Bot className="w-3.5 h-3.5 text-[#128c7e]" /> Recorded Successfully ✅
                          </p>
                          <p className="text-[11px] text-slate-800 mt-0.5 leading-snug">Vitals (Blood Sugar: 126 mg/dL) have been recorded successfully.</p>
                          <span className="text-[9px] text-slate-400 block text-right mt-1 font-mono">08:15 AM</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Sync Arrow Heading */}
                  <div className="flex items-center justify-center gap-2 text-teal-300 font-extrabold text-xs bg-teal-950/60 py-1.5 px-3 rounded-xl border border-teal-500/30">
                    <TrendingUp className="w-4 h-4 text-teal-400" />
                    <span>Sync Vitals to Doctor & Patient Dashboards</span>
                  </div>

                  {/* Step B: Dual Dashboards Preview Container */}
                  <div className="space-y-3">
                    
                    {/* View 1: Doctor Dashboard View */}
                    <div className="bg-[#060c18] rounded-2xl p-3.5 text-white shadow-inner border border-teal-500/30">
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-teal-500/20">
                        <div className="flex items-center gap-2">
                          <Stethoscope className="w-3.5 h-3.5 text-teal-400" />
                          <span className="text-xs font-bold text-teal-100">Doctor Dashboard View</span>
                        </div>
                        <span className="text-[9px] text-teal-300 font-mono bg-teal-950 px-2 py-0.5 rounded border border-teal-800">
                          15-20 Days Trend Curve
                        </span>
                      </div>

                      {/* Teal Trend Curve SVG */}
                      <div className="h-20 w-full relative flex items-end justify-between px-1 pt-2">
                        <svg className="absolute inset-0 w-full h-full p-1 overflow-visible" preserveAspectRatio="none" viewBox="0 0 300 80">
                          <path
                            d="M0,55 Q50,25 100,40 T200,18 T300,22"
                            fill="none"
                            stroke="#14b8a6"
                            strokeWidth="2.5"
                          />
                          <path
                            d="M0,55 Q50,25 100,40 T200,18 T300,22 L300,80 L0,80 Z"
                            fill="url(#tealGradient)"
                            opacity="0.25"
                          />
                          <defs>
                            <linearGradient id="tealGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#14b8a6" />
                              <stop offset="100%" stopColor="#14b8a6" stopOpacity="0" />
                            </linearGradient>
                          </defs>
                        </svg>

                        <div className="relative z-10 text-[9px] text-teal-200/80 font-mono w-full flex justify-between">
                          <span>Day 1: 140 mg/dL</span>
                          <span>Day 10: 130 mg/dL</span>
                          <span className="text-emerald-300 font-bold bg-emerald-950 px-1 rounded border border-emerald-700">Latest: 126 mg/dL</span>
                        </div>
                      </div>
                    </div>

                    {/* View 2: Patient Self-Access View */}
                    <div className="bg-[#0b101d] rounded-2xl p-3 text-white border border-indigo-500/30 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold">
                          <Smartphone className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">Patient Self-Access View</p>
                          <p className="text-[10px] text-indigo-200/70">WhatsApp self-check & vital logs</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                        100% Synced
                      </span>
                    </div>

                  </div>

                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* SECTION 3: TRUST & CREDIBILITY BADGE BAR */}
      <section className="bg-white py-8 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">
            Trusted Framework Designed for Hospitals, Doctors & OPD Patients
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            
            <div className="flex items-center justify-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
              <div className="text-left">
                <p className="text-xs font-extrabold text-slate-900">100% Data Privacy</p>
                <p className="text-[10px] text-slate-500">Encrypted Clinical Logs</p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <Building2 className="w-6 h-6 text-blue-600 shrink-0" />
              <div className="text-left">
                <p className="text-xs font-extrabold text-slate-900">Hospital Authorized</p>
                <p className="text-[10px] text-slate-500">Admin Allotted Access</p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <Smartphone className="w-6 h-6 text-emerald-600 shrink-0" />
              <div className="text-left">
                <p className="text-xs font-extrabold text-slate-900">Zero App Downloads</p>
                <p className="text-[10px] text-slate-500">100% WhatsApp Based</p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <BarChart3 className="w-6 h-6 text-indigo-600 shrink-0" />
              <div className="text-left">
                <p className="text-xs font-extrabold text-slate-900">Instant Vital Analytics</p>
                <p className="text-[10px] text-slate-500">3-Sec Doctor Trend Review</p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* SECTION 4: VALUE PROPOSITION FOR HOSPITALS & CLINICS */}
      <section id="value-prop" className="py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest bg-blue-100 px-3.5 py-1.5 rounded-full border border-blue-200">
              Value Proposition for Hospitals
            </span>
            <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Transforming Post-Consultation Patient Retention & Care
            </h2>
            <p className="mt-4 text-base text-slate-600 leading-relaxed">
              When a patient visits your hospital or clinic, doctors ask them to track BP, Sugar, or Vitals at home for as many days as prescribed. Doc2Me bridges this exact gap using WhatsApp — giving your hospital higher patient compliance and instant clinical decision clarity.
            </p>
          </div>

          {/* 3 Value Pillars for Hospitals (Very Soft Subtle Pastel Fills - Borderless & Shadowless) */}
          <div className="mt-16 grid md:grid-cols-3 gap-8">
            
            {/* Pillar 1 - Soft Mint Green */}
            <div className="bg-emerald-50/90 text-slate-900 rounded-3xl p-8 border-0 outline-none shadow-none flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-3 mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                    <Building2 className="w-7 h-7 text-emerald-700" />
                  </div>
                  <span className="bg-emerald-200/80 text-emerald-900 text-xs font-extrabold px-3.5 py-1 rounded-full shadow-none">
                    3x Retention
                  </span>
                </div>
                <h3 className="text-2xl font-extrabold tracking-wide text-slate-900">1. Higher Patient Retention</h3>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 font-extrabold text-xs mt-4">
                  <Users className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Hospital Brand Loyalty</span>
                </div>
                <p className="mt-3 text-sm text-slate-700 font-medium leading-relaxed">
                  Hospital Admins assign unique Patient IDs during registration. Patients stay connected with your hospital brand through daily WhatsApp updates, boosting follow-up retention.
                </p>
              </div>
            </div>

            {/* Pillar 2 - Soft Sky Lavender */}
            <div className="bg-indigo-50/90 text-slate-900 rounded-3xl p-8 border-0 outline-none shadow-none flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-3 mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-800 flex items-center justify-center shrink-0">
                    <Stethoscope className="w-7 h-7 text-indigo-700" />
                  </div>
                  <span className="bg-indigo-200/80 text-indigo-900 text-xs font-extrabold px-3.5 py-1 rounded-full shadow-none">
                    High Accuracy
                  </span>
                </div>
                <h3 className="text-2xl font-extrabold tracking-wide text-slate-900">2. Clinical Decision Accuracy</h3>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-100 text-indigo-900 font-extrabold text-xs mt-4">
                  <BarChart3 className="w-3.5 h-3.5 text-indigo-700" />
                  <span>Instant Clinical Trends</span>
                </div>
                <p className="mt-3 text-sm text-slate-700 font-medium leading-relaxed">
                  Doctors no longer rely on single-point readings or lost paper notes. Continuous daily vitals data gives doctors high-accuracy trends to adjust treatments confidently.
                </p>
              </div>
            </div>

            {/* Pillar 3 - Cream Pastel */}
            <div className="bg-amber-50/90 text-slate-900 rounded-3xl p-8 border-0 outline-none shadow-none flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-3 mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center shrink-0">
                    <Smartphone className="w-7 h-7 text-amber-800" />
                  </div>
                  <span className="bg-amber-200/80 text-amber-950 text-xs font-extrabold px-3.5 py-1 rounded-full shadow-none">
                    Zero Friction
                  </span>
                </div>
                <h3 className="text-2xl font-extrabold tracking-wide text-slate-900">3. Zero App Download Friction</h3>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 font-extrabold text-xs mt-4">
                  <Zap className="w-3.5 h-3.5 text-amber-800" />
                  <span>98% Daily Logging Adherence</span>
                </div>
                <p className="mt-3 text-sm text-slate-700 font-medium leading-relaxed">
                  Patients log readings on WhatsApp — an app they already open daily. Zero login friction or password hassles, ensuring over 98% daily logging adherence.
                </p>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* SECTION 5: NATURAL 4-STEP VISUAL WORKFLOW */}
      <section id="how-it-works" className="py-20 bg-slate-50/60 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest bg-emerald-100/90 px-3.5 py-1.5 rounded-full border border-emerald-200">
              Exact Natural Workflow
            </span>
            <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight font-sans">
              How Doc2Me Works in 4 Natural Steps
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed text-balance font-sans">
              From initial consultation to home WhatsApp logging, patient self-check, and doctor dashboard review.
            </p>

            {/* Creative Pill-Shaped Glass Language Switcher Toggle */}
            <div className="flex justify-center mt-6">
              <div className="inline-flex items-center gap-1 sm:gap-2 p-1.5 rounded-full bg-slate-100 border border-slate-200 shadow-inner">
                <span className="text-[11px] font-extrabold text-slate-500 pl-3 pr-1 flex items-center gap-1.5">
                  <Languages className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="hidden sm:inline">Switch View Language:</span>
                </span>
                <button
                  type="button"
                  onClick={() => setWorkflowLang('en')}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    workflowLang === 'en'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  • English
                </button>
                <button
                  type="button"
                  onClick={() => setWorkflowLang('hinglish')}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    workflowLang === 'hinglish'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  • Hinglish
                </button>
                <button
                  type="button"
                  onClick={() => setWorkflowLang('hi')}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    workflowLang === 'hi'
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  • हिंदी
                </button>
              </div>
            </div>
          </div>

          <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
            
            {/* Step 1 */}
            <div className="relative bg-white rounded-3xl p-8 border-0 shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-2 transition-all duration-300 flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <span className="w-12 h-12 rounded-2xl bg-blue-600 text-white font-black text-lg flex items-center justify-center shadow-lg shadow-blue-500/30 ring-4 ring-blue-100 group-hover:scale-105 transition-transform">
                    01
                  </span>
                  <span className="text-[11px] font-extrabold text-blue-700 uppercase tracking-wider bg-blue-100/90 px-3 py-1 rounded-full border border-blue-200/80">
                    {workflowLang === 'hi' ? 'अस्पताल में' : 'In Clinic / Hospital'}
                  </span>
                </div>

                <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  {workflowLang === 'hi' ? 'डॉक्टर परामर्श (Consultation)' : 'Doctor Consultation'}
                </h3>
                <p className={`mt-3 text-xs sm:text-sm text-slate-600 leading-relaxed font-medium ${workflowLang === 'hi' ? 'font-sans' : ''}`}>
                  {workflowLang === 'en' && 'Patient visits the clinic or hospital and consults the doctor. The doctor advises logging BP, Sugar, or Vitals at home for as many days as prescribed.'}
                  {workflowLang === 'hinglish' && 'Patient hospital/clinic aata hai aur Doctor se milta hai. Doctor patient ko prescribed dino tak ghar par BP/Sugar/Vitals daily track karne ki salah dete hain.'}
                  {workflowLang === 'hi' && 'मरीज अस्पताल/क्लिनिक आकर डॉक्टर से मिलता है। डॉक्टर मरीज को निर्धारित दिनों तक घर पर बीपी/शुगर/वाइटल्स रोज ट्रैक करने की सलाह देते हैं।'}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 text-xs font-bold text-slate-600 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>
                  {workflowLang === 'hi' ? '10 सेकंड में पेशेंट आईडी जारी' : 'Patient ID assigned in 10 secs'}
                </span>
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative bg-white rounded-3xl p-8 border-0 shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-2 transition-all duration-300 flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <span className="w-12 h-12 rounded-2xl bg-emerald-600 text-white font-black text-lg flex items-center justify-center shadow-lg shadow-emerald-500/30 ring-4 ring-emerald-100 group-hover:scale-105 transition-transform">
                    02
                  </span>
                  <span className="text-[11px] font-extrabold text-emerald-700 uppercase tracking-wider bg-emerald-100/90 px-3 py-1 rounded-full border border-emerald-200/80">
                    {workflowLang === 'hi' ? 'घर पर' : 'At Home'}
                  </span>
                </div>

                <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  {workflowLang === 'hi' ? 'व्हाट्सएप वाइटल्स एंट्री' : 'Home WhatsApp Logging'}
                </h3>
                <p className={`mt-3 text-xs sm:text-sm text-slate-600 leading-relaxed font-medium ${workflowLang === 'hi' ? 'font-sans' : ''}`}>
                  {workflowLang === 'en' && 'Without downloading any new mobile app, the patient directly sends their daily readings via text or voice message on WhatsApp.'}
                  {workflowLang === 'hinglish' && 'Patient ghar baithe bina kisi naye app ke, direct WhatsApp par apni daily readings (text ya voice note) bhejta hai.'}
                  {workflowLang === 'hi' && 'बिना कोई नया ऐप डाउनलोड किए, मरीज घर बैठे सीधे व्हाट्सएप पर अपनी दैनिक रीडिंग (टेक्स्ट या वॉयस नोट) भेजता है।'}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 text-xs font-bold text-slate-600 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>
                  {workflowLang === 'hi' ? 'टेक्स्ट और वॉयस नोट समर्थित' : 'Text or Voice Note compatible'}
                </span>
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative bg-white rounded-3xl p-8 border-0 shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-2 transition-all duration-300 flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <span className="w-12 h-12 rounded-2xl bg-purple-600 text-white font-black text-lg flex items-center justify-center shadow-lg shadow-purple-500/30 ring-4 ring-purple-100 group-hover:scale-105 transition-transform">
                    03
                  </span>
                  <span className="text-[11px] font-extrabold text-purple-700 uppercase tracking-wider bg-purple-100/90 px-3 py-1 rounded-full border border-purple-200/80">
                    {workflowLang === 'hi' ? 'मरीज कंट्रोल' : 'Patient Control'}
                  </span>
                </div>

                <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  {workflowLang === 'hi' ? 'मरीज सेल्फ-चेक' : 'Patient Self-Check'}
                </h3>
                <p className={`mt-3 text-xs sm:text-sm text-slate-600 leading-relaxed font-medium ${workflowLang === 'hi' ? 'font-sans' : ''}`}>
                  {workflowLang === 'en' && 'The patient receives an instant AI acknowledgment and can view all logged readings and past health history directly on WhatsApp.'}
                  {workflowLang === 'hinglish' && 'Patient ko instant confirmation milta hai aur woh WhatsApp par apni purani saari readings aur logged history khud bhi dekh sakta hai.'}
                  {workflowLang === 'hi' && 'मरीज को तुरंत उत्तर मिलता है और वह व्हाट्सएप पर अपनी दर्ज की गई वाइटल्स हिस्ट्री कभी भी खुद देख सकता है।'}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 text-xs font-bold text-slate-600 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>
                  {workflowLang === 'hi' ? 'तुरंत रिकॉर्ड विजिबिलिटी' : 'Instant patient visibility'}
                </span>
              </div>
            </div>

            {/* Step 4 */}
            <div className="relative bg-white rounded-3xl p-8 border-0 shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-2 transition-all duration-300 flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <span className="w-12 h-12 rounded-2xl bg-indigo-600 text-white font-black text-lg flex items-center justify-center shadow-lg shadow-indigo-500/30 ring-4 ring-indigo-100 group-hover:scale-105 transition-transform">
                    04
                  </span>
                  <span className="text-[11px] font-extrabold text-indigo-700 uppercase tracking-wider bg-indigo-100/90 px-3 py-1 rounded-full border border-indigo-200/80">
                    {workflowLang === 'hi' ? 'फॉलो-अप विज़िट' : 'Follow-Up Visit'}
                  </span>
                </div>

                <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  {workflowLang === 'hi' ? 'डॉक्टर डैशबोर्ड रिव्यु' : 'Doctor Dashboard Review'}
                </h3>
                <p className={`mt-3 text-xs sm:text-sm text-slate-600 leading-relaxed font-medium ${workflowLang === 'hi' ? 'font-sans' : ''}`}>
                  {workflowLang === 'en' && 'On the next follow-up visit, the doctor opens the Doctor Dashboard and reviews complete historical trends — whether 10 days, 1 month, or custom date ranges — in just 1 second.'}
                  {workflowLang === 'hinglish' && 'Next visit par, Doctor apna Doctor Dashboard kholkar ek second mein patient ke saare historical trends (10 din, 1 mahina, ya custom range) dekh lete hain.'}
                  {workflowLang === 'hi' && 'अगली विज़िट पर, डॉक्टर अपना डैशबोर्ड खोलकर केवल 1 सेकंड में मरीज के पूरे हिस्टोरिकल ट्रेंड्स (10 दिन, 1 महीना या कस्टम रेंज) देख लेते हैं।'}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 text-xs font-bold text-slate-600 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>
                  {workflowLang === 'hi' ? '1-सेकंड में ट्रेंड ग्राफ रिव्यु' : '1-Second trend graph review'}
                </span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* SECTION 5B / SECTION 4: THE DOC2ME ADVANTAGE (Doctor & Hospital Centric Precision Intelligence - Deep Royal Indigo & Midnight Cobalt 3D ECG-AI Theme) */}
      <section className="py-20 bg-gradient-to-br from-[#0b132b] via-[#1c2541] to-[#0a0f1d] text-white border-b-0 relative overflow-hidden">
        
        {/* Radial Ambient Glows */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-40"
          style={{
            background: `
              radial-gradient(circle at 85% 10%, rgba(30, 58, 138, 0.4) 0%, transparent 50%),
              radial-gradient(circle at 15% 90%, rgba(11, 19, 43, 0.9) 0%, transparent 50%),
              radial-gradient(circle at 50% 50%, rgba(56, 189, 248, 0.12) 0%, transparent 60%)
            `
          }}
        ></div>

        {/* Dynamic 3D Diagonal Geometric Stripe Overlay (Full Height Coverage) */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-15"
          style={{
            backgroundImage: `repeating-linear-gradient(-45deg, rgba(255, 255, 255, 0.04) 0px, rgba(255, 255, 255, 0.04) 60px, rgba(11, 19, 43, 0.3) 60px, rgba(11, 19, 43, 0.3) 120px)`
          }}
        ></div>

        {/* Multi-Layered 3D Diagonal Wave Ribbons + ECG Vital Pulses + AI Nodes (Full Height Seamless Coverage) */}
        <div className="absolute inset-0 pointer-events-none opacity-30 overflow-hidden">
          <svg className="w-full h-full object-cover min-w-[1200px]" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" fill="none" viewBox="0 0 1440 2400" preserveAspectRatio="none">
            <defs>
              <linearGradient id="deepDiagGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#0b132b" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="deepDiagGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1d4ed8" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#0a0f1d" stopOpacity="0.1" />
              </linearGradient>
              <linearGradient id="deepDiagGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#1c2541" stopOpacity="0.0" />
              </linearGradient>
              <filter id="shadow3dDeep" x="-20%" y="-20%" width="150%" height="150%">
                <feDropShadow dx="-10" dy="16" stdDeviation="12" floodColor="#040711" floodOpacity="0.8" />
              </filter>
            </defs>

            {/* 3D Diagonal Geometric Waves running across the entire tall section */}
            <path d="M-200,-100 L1800,1350 L1800,1600 L-200,150 Z" fill="url(#deepDiagGrad1)" filter="url(#shadow3dDeep)" />
            <path d="M-200,450 L1800,1900 L1800,2150 L-200,700 Z" fill="url(#deepDiagGrad2)" filter="url(#shadow3dDeep)" />
            <path d="M-200,1000 L1800,2450 L1800,2700 L-200,1250 Z" fill="url(#deepDiagGrad3)" filter="url(#shadow3dDeep)" />

            {/* Intersecting 3D Diagonal Polygons */}
            <polygon points="-100,250 1400,-350 1600,-200 -100,600" fill="rgba(30, 58, 138, 0.2)" filter="url(#shadow3dDeep)" />
            <polygon points="-100,1100 1400,500 1600,650 -100,1450" fill="rgba(56, 189, 248, 0.12)" filter="url(#shadow3dDeep)" />
            <polygon points="-100,1850 1400,1250 1600,1400 -100,2200" fill="rgba(99, 102, 241, 0.12)" filter="url(#shadow3dDeep)" />

            {/* Embedded ECG Heartbeat Vital Lines along 3D Diagonal Ribbons */}
            <path 
              d="M -100,-50 L 200,250 L 225,220 L 245,310 L 265,160 L 285,280 L 305,250 L 800,745 L 825,715 L 845,805 L 865,655 L 885,775 L 905,745 L 1600,1440" 
              stroke="rgba(56, 189, 248, 0.6)" 
              strokeWidth="2.5" 
              fill="none" 
            />
            <path 
              d="M -100,550 L 300,950 L 325,920 L 345,1010 L 365,860 L 385,980 L 405,950 L 950,1495 L 975,1465 L 995,1555 L 1015,1405 L 1035,1525 L 1055,1495 L 1600,2040" 
              stroke="rgba(52, 211, 153, 0.55)" 
              strokeWidth="2.5" 
              fill="none" 
            />
            <path 
              d="M -100,1150 L 400,1650 L 425,1620 L 445,1710 L 465,1560 L 485,1680 L 505,1650 L 1050,2195 L 1075,2165 L 1095,2255 L 1115,2105 L 1135,2225 L 1155,2195 L 1600,2640" 
              stroke="rgba(168, 85, 247, 0.55)" 
              strokeWidth="2.5" 
              fill="none" 
            />

            {/* Embedded AI Neural Grid Connections & Nodes along 3D Diagonal Ribbon Edges */}
            <g stroke="rgba(56, 189, 248, 0.4)" strokeWidth="1">
              <line x1="265" y1="160" x2="380" y2="100" />
              <line x1="865" y1="655" x2="980" y2="590" />
              <line x1="365" y1="860" x2="480" y2="800" />
              <line x1="1015" y1="1405" x2="1130" y2="1345" />
              <line x1="465" y1="1560" x2="580" y2="1500" />
            </g>
            <circle cx="265" cy="160" r="4.5" fill="#38bdf8" />
            <circle cx="380" cy="100" r="3.5" fill="#34d399" />
            <circle cx="865" cy="655" r="5" fill="#a855f7" />
            <circle cx="980" cy="590" r="3.5" fill="#fbbf24" />
            <circle cx="365" cy="860" r="4.5" fill="#34d399" />
            <circle cx="480" cy="800" r="3.5" fill="#38bdf8" />
            <circle cx="1015" cy="1405" r="5" fill="#f43f5e" />
            <circle cx="1130" cy="1345" r="3.5" fill="#38bdf8" />
            <circle cx="465" cy="1560" r="4.5" fill="#a855f7" />
            <circle cx="580" cy="1500" r="3.5" fill="#34d399" />
          </svg>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            {/* Amber Badge */}
            <span className="text-xs font-mono font-extrabold text-amber-300 uppercase tracking-widest bg-slate-900/90 ring-1 ring-amber-400/50 px-4 py-1.5 rounded-full border-0 shadow-sm inline-flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              THE DOC2ME ADVANTAGE
            </span>
            <h2 className="mt-4 text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
              Empowering Doctors with <span className="text-amber-300 font-black">Precision Clinical Intelligence</span>
            </h2>
            <p className="mt-4 text-base text-slate-300 leading-relaxed font-sans">
              Doc2Me turns raw patient WhatsApp messages into clean, actionable trend graphs, helping doctors make faster and more confident diagnostic decisions during follow-ups.
            </p>
          </div>

          {/* Doctor Cabin & Tech Overlay Showcase (3-Part Layout: Large Doctor Cabin + Patient Dashboard + Bottom Clinical Table) */}
          <div className="mb-16 relative max-w-6xl mx-auto rounded-3xl overflow-hidden bg-slate-900/80 backdrop-blur-xl p-5 sm:p-8 shadow-2xl border-0">
            
            {/* Header pill over the hybrid layout */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-6 border-b-0">
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-emerald-400"></span>
                <span className="text-sm font-extrabold text-white tracking-wide font-sans">
                  Modern Consultation Suite & Live AI Dashboard
                </span>
              </div>
              <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-300 text-xs font-extrabold px-4 py-1.5 rounded-full border-0 shadow-lg backdrop-blur-md">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Direct WhatsApp Vitals → Auto-Parsed into Doctor Dashboard</span>
              </div>
            </div>

            {/* Top Grid: Part 1 (Left Image) + Part 2 (Right Dashboard) */}
            <div className="grid lg:grid-cols-12 gap-6 items-start">
              
              {/* Part 1 (Left Side): Large Doctor & Patient Cabin Photo (Shifted Up) */}
              <div className="lg:col-span-6 flex flex-col justify-start">
                <div className="relative rounded-2xl overflow-hidden shadow-2xl group">
                  <img 
                    src="/doctor-cabin.png" 
                    alt="Doctor Consultation Cabin" 
                    className="rounded-2xl shadow-2xl w-full object-cover max-h-[520px] transform group-hover:scale-[1.02] transition-transform duration-500" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-transparent to-transparent opacity-90 pointer-events-none"></div>
                  <div className="absolute bottom-4 left-4 right-4 bg-slate-900/95 backdrop-blur-md p-3.5 rounded-xl border-0 flex items-center justify-between shadow-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-600/30 text-blue-300 flex items-center justify-center font-bold shrink-0">
                        <Stethoscope className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">In-Cabin Doctor Follow-Up</h4>
                        <p className="text-[11px] text-slate-300">Human consultation enhanced with continuous data</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-extrabold text-amber-300 bg-amber-950/80 px-2.5 py-1 rounded-md">
                      Zero Paper Hassle
                    </span>
                  </div>
                </div>

                {/* Descriptive Highlight Text Below Photo */}
                <p className="text-amber-300/90 text-xs sm:text-sm leading-relaxed mt-3 px-1 font-medium">
                  Doc2Me seamlessly bridges in-cabin consultation with daily home vitals tracking. Patients log BP, Sugar, and health updates via WhatsApp without downloading any new app, allowing doctors to review auto-parsed multi-vital trend curves in just 3 seconds during OPD follow-ups.
                </p>
              </div>

              {/* Part 2 (Right Side): Patient Summary Card (Sunita Devi) with Multi-Trend Graph - Clean White Card */}
              <div className="lg:col-span-6 bg-white text-slate-900 backdrop-blur-md rounded-2xl p-5 border-0 shadow-2xl flex flex-col justify-between text-left">
                <div>
                  {/* Top Bar inside Overlay */}
                  <div className="flex items-center justify-between mb-3 pb-3 border-b-0">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                      <span className="text-xs font-mono font-extrabold text-slate-700 ml-1">PATIENT ID: PAT-8842</span>
                    </div>
                    <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
                      Multi-Vital Sync
                    </span>
                  </div>

                  {/* Patient Info Header - Sunita Devi */}
                  <div className="flex items-center justify-between gap-3 mb-3 bg-slate-50 p-3 rounded-xl border-0 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white font-black text-sm flex items-center justify-center shadow-md">
                        SD
                      </div>
                      <div>
                        <h4 className="text-sm font-extrabold text-slate-900">Sunita Devi</h4>
                        <p className="text-[11px] text-slate-600 font-medium">58 Yrs, Female • Type-2 Diabetes & HTN</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 font-mono block">Logging Rate</span>
                      <span className="text-xs font-extrabold text-emerald-600">14 / 15 Days (93%)</span>
                    </div>
                  </div>

                  {/* Vitals Multi-Trend Clinical Graph (Fasting Sugar, PP Sugar, BP Curves) */}
                  <div className="bg-slate-50 rounded-xl p-3.5 mb-3 border-0 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold text-slate-800 mb-2">
                      <span className="flex items-center gap-1.5 text-indigo-900 font-extrabold">
                        <Activity className="w-3.5 h-3.5 text-indigo-600" /> Multi-Vital Trend Curves
                      </span>
                      {/* Color-Coded Legend */}
                      <div className="flex items-center gap-3 text-[10px] font-mono">
                        <span className="flex items-center gap-1 text-emerald-700 font-bold">
                          <span className="w-2 h-2 rounded-full bg-emerald-600"></span> Fasting Sugar
                        </span>
                        <span className="flex items-center gap-1 text-amber-700 font-bold">
                          <span className="w-2 h-2 rounded-full bg-amber-500"></span> PP Sugar
                        </span>
                        <span className="flex items-center gap-1 text-indigo-700 font-bold">
                          <span className="w-2 h-2 rounded-full bg-indigo-600"></span> BP Trend
                        </span>
                      </div>
                    </div>

                    {/* SVG Multi-Vital Curve Overlay */}
                    <div className="relative h-28 w-full pt-1">
                      <svg viewBox="0 0 320 80" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                        {/* Grid lines */}
                        <line x1="0" y1="20" x2="320" y2="20" stroke="#e2e8f0" strokeWidth="1" />
                        <line x1="0" y1="40" x2="320" y2="40" stroke="#e2e8f0" strokeWidth="1" />
                        <line x1="0" y1="60" x2="320" y2="60" stroke="#e2e8f0" strokeWidth="1" />

                        {/* Curve 1: Post-Meal PP Sugar (Amber Gold Line) */}
                        <path 
                          d="M 0,18 Q 40,24 80,12 T 160,18 T 240,10 T 320,15" 
                          fill="none" 
                          stroke="#d97706" 
                          strokeWidth="2.5" 
                          strokeDasharray="4 2"
                        />
                        <circle cx="80" cy="12" r="3" fill="#d97706" />
                        <circle cx="160" cy="18" r="3" fill="#d97706" />
                        <circle cx="240" cy="10" r="3" fill="#d97706" />

                        {/* Curve 2: Fasting Sugar (Emerald Green Line + Gradient Area) */}
                        <defs>
                          <linearGradient id="fastingGradDark" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#059669" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="#059669" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>
                        <path 
                          d="M 0,50 Q 40,58 80,42 T 160,35 T 240,48 T 320,38 L 320,80 L 0,80 Z" 
                          fill="url(#fastingGradDark)" 
                        />
                        <path 
                          d="M 0,50 Q 40,58 80,42 T 160,35 T 240,48 T 320,38" 
                          fill="none" 
                          stroke="#059669" 
                          strokeWidth="3" 
                        />
                        <circle cx="0" cy="50" r="3.5" fill="#059669" />
                        <circle cx="80" cy="42" r="3.5" fill="#059669" />
                        <circle cx="160" cy="35" r="4" fill="#dc2626" /> {/* Spike dot */}
                        <circle cx="240" cy="48" r="3.5" fill="#059669" />
                        <circle cx="320" cy="38" r="4" fill="#059669" />

                        {/* Curve 3: Blood Pressure Systolic Trend (Indigo Blue Line) */}
                        <path 
                          d="M 0,35 Q 40,32 80,28 T 160,25 T 240,26 T 320,24" 
                          fill="none" 
                          stroke="#4f46e5" 
                          strokeWidth="2.5" 
                        />
                        <circle cx="80" cy="28" r="3" fill="#4f46e5" />
                        <circle cx="160" cy="25" r="3" fill="#4f46e5" />
                        <circle cx="240" cy="26" r="3" fill="#4f46e5" />
                        <circle cx="320" cy="24" r="3" fill="#4f46e5" />
                      </svg>
                    </div>

                    <div className="flex items-center justify-between mt-1 text-[9px] text-slate-500 font-mono pt-1 border-t-0">
                      <span>Day 1 (OPD Consultation)</span>
                      <span>Day 7 (Mid-Sync)</span>
                      <span>Day 14 (Follow-Up)</span>
                    </div>
                  </div>

                  {/* Vitals Quick Pill Summary */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-slate-50 p-2 rounded-xl border-0 shadow-sm">
                      <span className="text-[10px] text-slate-500 block font-mono">Latest BP</span>
                      <span className="font-extrabold text-indigo-900">122/80 mmHg</span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-xl border-0 shadow-sm">
                      <span className="text-[10px] text-slate-500 block font-mono">Fasting Sugar</span>
                      <span className="font-extrabold text-emerald-600">110 mg/dL</span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-xl border-0 shadow-sm">
                      <span className="text-[10px] text-slate-500 block font-mono">PP Sugar</span>
                      <span className="font-extrabold text-amber-600">142 mg/dL</span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t-0 flex items-center justify-between text-xs text-slate-700 font-sans">
                  <span className="flex items-center gap-1.5 font-bold text-emerald-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Auto-Parsed WhatsApp Vitals Log
                  </span>
                  <span className="text-[10px] text-indigo-900 bg-indigo-100 px-2.5 py-0.5 rounded font-mono font-bold">
                    3-Sec OPD Review
                  </span>
                </div>
              </div>

            </div>

            {/* Part 3: Full-Width Horizontal Detailed Clinical Logs & Trends Chart Table in Clean Pure White Card */}
            <div className="mt-6 bg-white text-slate-900 rounded-3xl p-6 shadow-2xl border-0">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                    <Activity className="w-4.5 h-4.5 text-indigo-600" />
                  </div>
                  <h4 className="text-xs font-mono font-extrabold text-slate-900 uppercase tracking-wider">
                    Sunita Devi — Continuous Granular Clinical Vitals Register
                  </h4>
                </div>
                <span className="text-[11px] font-mono text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border-0 font-bold">
                  100% WhatsApp Auto-Parsed
                </span>
              </div>

              <div className="overflow-x-auto rounded-2xl border-0 bg-slate-50/50">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-100 text-slate-700 border-b-0">
                    <tr>
                      <th className="py-3 px-4 font-extrabold">Date / Day</th>
                      <th className="py-3 px-4 font-extrabold text-emerald-700">Fasting Sugar (Pre-Meal)</th>
                      <th className="py-3 px-4 font-extrabold text-amber-700">PP Sugar (Post-Meal)</th>
                      <th className="py-3 px-4 font-extrabold text-purple-700">Random Sugar</th>
                      <th className="py-3 px-4 font-extrabold text-indigo-700">BP (mmHg)</th>
                      <th className="py-3 px-4 font-extrabold text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-0 text-slate-800">
                    <tr className="hover:bg-slate-100/60 transition-colors">
                      <td className="py-2.5 px-4 font-bold text-slate-900">Day 1 (01 Aug)</td>
                      <td className="py-2.5 px-4 text-emerald-700 font-extrabold">128 mg/dL</td>
                      <td className="py-2.5 px-4 text-amber-700 font-bold">162 mg/dL</td>
                      <td className="py-2.5 px-4 text-slate-600">145 mg/dL</td>
                      <td className="py-2.5 px-4 text-indigo-900 font-extrabold">138/88</td>
                      <td className="py-2.5 px-4 text-right"><span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full">OPD Baseline</span></td>
                    </tr>
                    <tr className="hover:bg-slate-100/60 transition-colors">
                      <td className="py-2.5 px-4 font-bold text-slate-900">Day 4 (04 Aug)</td>
                      <td className="py-2.5 px-4 text-emerald-700 font-extrabold">118 mg/dL</td>
                      <td className="py-2.5 px-4 text-amber-700 font-bold">148 mg/dL</td>
                      <td className="py-2.5 px-4 text-slate-600">132 mg/dL</td>
                      <td className="py-2.5 px-4 text-indigo-900 font-extrabold">130/84</td>
                      <td className="py-2.5 px-4 text-right"><span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full">Normal Sync</span></td>
                    </tr>
                    <tr className="hover:bg-slate-100/60 transition-colors">
                      <td className="py-2.5 px-4 font-bold text-slate-900">Day 7 (07 Aug)</td>
                      <td className="py-2.5 px-4 text-rose-600 font-extrabold">142 mg/dL ⚠️</td>
                      <td className="py-2.5 px-4 text-amber-700 font-bold">178 mg/dL</td>
                      <td className="py-2.5 px-4 text-slate-600">155 mg/dL</td>
                      <td className="py-2.5 px-4 text-indigo-900 font-extrabold">135/86</td>
                      <td className="py-2.5 px-4 text-right"><span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full">Diet Spike</span></td>
                    </tr>
                    <tr className="hover:bg-slate-100/60 transition-colors">
                      <td className="py-2.5 px-4 font-bold text-slate-900">Day 10 (10 Aug)</td>
                      <td className="py-2.5 px-4 text-emerald-700 font-extrabold">110 mg/dL</td>
                      <td className="py-2.5 px-4 text-amber-700 font-bold">142 mg/dL</td>
                      <td className="py-2.5 px-4 text-slate-600">128 mg/dL</td>
                      <td className="py-2.5 px-4 text-indigo-900 font-extrabold">122/80</td>
                      <td className="py-2.5 px-4 text-right"><span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full">Controlled</span></td>
                    </tr>
                    <tr className="bg-emerald-50/80 hover:bg-emerald-100/60 transition-colors">
                      <td className="py-2.5 px-4 font-bold text-emerald-950">Day 14 (14 Aug)</td>
                      <td className="py-2.5 px-4 text-emerald-700 font-extrabold">108 mg/dL</td>
                      <td className="py-2.5 px-4 text-amber-700 font-bold">138 mg/dL</td>
                      <td className="py-2.5 px-4 text-slate-600">122 mg/dL</td>
                      <td className="py-2.5 px-4 text-indigo-900 font-extrabold">120/80</td>
                      <td className="py-2.5 px-4 text-right"><span className="bg-emerald-700 text-white font-bold text-[10px] px-2.5 py-0.5 rounded-full shadow-sm">Ready for Review</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* 6 Feature Cards (Translucent Borderless Glass Cards with Soft Deep Ambient Shadow) */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Feature 1 */}
            <div className="bg-slate-900/80 backdrop-blur-xl hover:bg-slate-900/95 transition-all rounded-3xl p-6 border-0 text-white shadow-2xl shadow-black/40 group">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-300 ring-4 ring-amber-500/10 shadow-lg shadow-amber-500/10 flex items-center justify-center font-bold mb-4 group-hover:scale-110 transition-transform">
                <Brain className="w-6 h-6 text-amber-300" />
              </div>
              <h3 className="text-lg font-mono font-bold text-white mb-2">AI-Powered Parsing</h3>
              <p className="text-xs font-mono text-slate-300 leading-relaxed">
                Extracts BP, Sugar, and Vitals accurately from Hindi & English WhatsApp text or voice notes without requiring manual data entry staff.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-slate-900/80 backdrop-blur-xl hover:bg-slate-900/95 transition-all rounded-3xl p-6 border-0 text-white shadow-2xl shadow-black/40 group">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-300 ring-4 ring-emerald-500/10 shadow-lg shadow-emerald-500/10 flex items-center justify-center font-bold mb-4 group-hover:scale-110 transition-transform">
                <Database className="w-6 h-6 text-emerald-300" />
              </div>
              <h3 className="text-lg font-mono font-bold text-white mb-2">Centralized Clinical Records</h3>
              <p className="text-xs font-mono text-slate-300 leading-relaxed">
                Organized securely under Hospital Patient ID, creating unified longitudinal medical histories accessible across all hospital departments.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-slate-900/80 backdrop-blur-xl hover:bg-slate-900/95 transition-all rounded-3xl p-6 border-0 text-white shadow-2xl shadow-black/40 group">
              <div className="w-12 h-12 rounded-2xl bg-fuchsia-500/20 text-fuchsia-300 ring-4 ring-fuchsia-500/10 shadow-lg shadow-fuchsia-500/10 flex items-center justify-center font-bold mb-4 group-hover:scale-110 transition-transform">
                <Activity className="w-6 h-6 text-fuchsia-300" />
              </div>
              <h3 className="text-lg font-mono font-bold text-white mb-2">Doctor-Ready Analytics</h3>
              <p className="text-xs font-mono text-slate-300 leading-relaxed">
                Clean, continuous multi-day clinical trend graphs prepared for instant 3-second review during OPD follow-ups, revealing treatment response and patient compliance.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-slate-900/80 backdrop-blur-xl hover:bg-slate-900/95 transition-all rounded-3xl p-6 border-0 text-white shadow-2xl shadow-black/40 group">
              <div className="w-12 h-12 rounded-2xl bg-sky-500/20 text-sky-300 ring-4 ring-sky-500/10 shadow-lg shadow-sky-500/10 flex items-center justify-center font-bold mb-4 group-hover:scale-110 transition-transform">
                <TrendingUp className="w-6 h-6 text-sky-300" />
              </div>
              <h3 className="text-lg font-mono font-bold text-white mb-2">Clinical Trend Insights</h3>
              <p className="text-xs font-mono text-slate-300 leading-relaxed">
                Automatic detection of abnormal vitals spikes and out-of-range readings, highlighting critical cases before the consultation even starts.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-slate-900/80 backdrop-blur-xl hover:bg-slate-900/95 transition-all rounded-3xl p-6 border-0 text-white shadow-2xl shadow-black/40 group">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-300 ring-4 ring-purple-500/10 shadow-lg shadow-purple-500/10 flex items-center justify-center font-bold mb-4 group-hover:scale-110 transition-transform">
                <Sparkles className="w-6 h-6 text-purple-300" />
              </div>
              <h3 className="text-lg font-mono font-bold text-white mb-2">Faster Consultation Workflows</h3>
              <p className="text-xs font-mono text-slate-300 leading-relaxed">
                Saves valuable doctor time per patient visit by eliminating manual paper note searching and repetitive oral questioning.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-slate-900/80 backdrop-blur-xl hover:bg-slate-900/95 transition-all rounded-3xl p-6 border-0 text-white shadow-2xl shadow-black/40 group">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/20 text-teal-300 ring-4 ring-teal-500/10 shadow-lg shadow-teal-500/10 flex items-center justify-center font-bold mb-4 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-6 h-6 text-teal-300" />
              </div>
              <h3 className="text-lg font-mono font-bold text-white mb-2">Hospital-Grade Security</h3>
              <p className="text-xs font-mono text-slate-300 leading-relaxed">
                Private, encrypted, and HIPAA/GDPR compliant data architecture protecting hospital patient records and doctor consultation notes.
              </p>
            </div>

          </div>

          {/* Bottom Summary Banner */}
          <div className="mt-12 bg-slate-900/80 backdrop-blur-xl rounded-3xl p-8 border-0 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 text-xs font-bold text-emerald-400 bg-emerald-950/90 px-3 py-1 rounded-full border-0 mb-3">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>The Perfect Healthcare Bridge</span>
              </div>
              <h4 className="text-2xl font-bold text-white">WhatsApp Simplicity + AI Parsing + Doctor Expertise</h4>
              <p className="mt-2 text-xs text-slate-300 font-sans leading-relaxed">
                Doc2Me combines the ease of daily WhatsApp messaging, the speed of AI extraction, and the clinical authority of Hospital Doctors into one seamless ecosystem.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 shrink-0">
              <div className="text-center bg-slate-800/40 backdrop-blur-md p-3.5 rounded-2xl border-0 min-w-[105px] shadow-2xl">
                <MessageSquare className="w-6 h-6 text-emerald-400 mx-auto mb-1" />
                <span className="text-[10px] font-bold text-slate-200 block">WhatsApp</span>
              </div>
              <span className="text-lg font-black text-amber-400">+</span>
              <div className="text-center bg-slate-800/40 backdrop-blur-md p-3.5 rounded-2xl border-0 min-w-[105px] shadow-2xl">
                <Brain className="w-6 h-6 text-amber-400 mx-auto mb-1" />
                <span className="text-[10px] font-bold text-slate-200 block">AI Engine</span>
              </div>
              <span className="text-lg font-black text-amber-400">+</span>
              <div className="text-center bg-slate-800/40 backdrop-blur-md p-3.5 rounded-2xl border-0 min-w-[105px] shadow-2xl">
                <Stethoscope className="w-6 h-6 text-fuchsia-400 mx-auto mb-1" />
                <span className="text-[10px] font-bold text-slate-200 block">Doctor Portal</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* SECTION 6: VITALS COVERED (INTERACTIVE CAROUSEL & INDIVIDUAL TAB THEMES) */}
      <section id="vitals-covered" className="py-20 bg-white border-b border-slate-200 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full border border-blue-200/80">
              Complete Vitals Suite
            </span>
            <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              7 Core Vitals Covered on WhatsApp
            </h2>
            <p className="mt-3 text-sm text-slate-600 font-sans font-medium">
              Select or slide through any vital below to explore how Doc2Me processes WhatsApp entries for Doctors.
            </p>
          </div>

          {/* Vitals Filter Tabs with Individual Unique Theme Colors */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-2.5 max-w-5xl mx-auto">
            {vitalsData.map((v) => {
              const IconComp = v.icon;
              const isSelected = selectedVitalTab === v.id;
              return (
                <button
                  key={v.id}
                  onClick={() => setSelectedVitalTab(v.id as any)}
                  className={`px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all duration-200 cursor-pointer shadow-none hover:shadow-none ${
                    isSelected
                      ? v.activeTabBg
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80 border border-slate-200/80 shadow-none'
                  }`}
                >
                  <IconComp className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : v.textColor}`} />
                  <span>{v.name}</span>
                </button>
              );
            })}
          </div>

          {/* Interactive Carousel Display Area with Peek-a-Boo Effect */}
          {(() => {
            const activeIdx = vitalsData.findIndex(v => v.id === selectedVitalTab);
            const currentIdx = activeIdx >= 0 ? activeIdx : 0;
            const activeVital = vitalsData[currentIdx];

            const prevIdx = (currentIdx - 1 + vitalsData.length) % vitalsData.length;
            const nextIdx = (currentIdx + 1) % vitalsData.length;

            const prevVital = vitalsData[prevIdx];
            const nextVital = vitalsData[nextIdx];

            const ActiveIcon = activeVital.icon;
            const PrevIcon = prevVital.icon;
            const NextIcon = nextVital.icon;

            return (
              <div className="mt-12 relative max-w-6xl mx-auto px-2 sm:px-4">
                
                {/* Navigation Buttons (Left & Right Arrows) */}
                <button
                  onClick={() => setSelectedVitalTab(prevVital.id as any)}
                  className="absolute left-0 sm:-left-3 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-white text-slate-700 shadow-xl border border-slate-200/80 flex items-center justify-center hover:bg-slate-50 hover:scale-110 transition-all cursor-pointer"
                  aria-label="Previous Vital"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>

                <button
                  onClick={() => setSelectedVitalTab(nextVital.id as any)}
                  className="absolute right-0 sm:-right-3 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-white text-slate-700 shadow-xl border border-slate-200/80 flex items-center justify-center hover:bg-slate-50 hover:scale-110 transition-all cursor-pointer"
                  aria-label="Next Vital"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>

                {/* Carousel Card Track */}
                <div className="flex items-center justify-center gap-4 sm:gap-6 overflow-visible py-4">
                  
                  {/* Left Peek Card (Previous Vital) */}
                  <div
                    onClick={() => setSelectedVitalTab(prevVital.id as any)}
                    className="hidden lg:block w-72 shrink-0 opacity-40 scale-95 blur-[1px] cursor-pointer hover:opacity-75 hover:scale-98 transition-all duration-300 bg-slate-50 rounded-3xl p-6 border border-slate-200/80 shadow-md select-none"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${prevVital.color} text-white flex items-center justify-center`}>
                        <PrevIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-slate-800">{prevVital.name}</h4>
                        <span className="text-[10px] text-slate-500 block font-medium">{prevVital.sub}</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2">{prevVital.desc}</p>
                  </div>

                  {/* Active Main Card (Centered, Large, Full Focus) */}
                  <div className="w-full max-w-2xl shrink-0 scale-100 opacity-100 shadow-2xl border-0 rounded-3xl bg-white p-6 sm:p-8 relative overflow-hidden transition-all duration-300 ring-1 ring-slate-900/5 z-10">
                    
                    {/* Top Accent Gradient Bar */}
                    <div className={`absolute top-0 left-0 right-0 h-2 bg-gradient-to-r ${activeVital.color}`} />

                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
                      <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-tr ${activeVital.color} text-white flex items-center justify-center shadow-lg shadow-black/10 shrink-0`}>
                          <ActiveIcon className="w-7 h-7" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-black text-slate-900 tracking-tight">{activeVital.name}</h3>
                          <p className="text-xs text-slate-500 font-medium">{activeVital.sub}</p>
                        </div>
                      </div>

                      <div className="bg-slate-50 px-4 py-2.5 rounded-2xl border border-slate-200/80 text-right shrink-0">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block tracking-wider">Sample WhatsApp Entry</span>
                        <span className="text-sm font-extrabold text-slate-900 font-mono">{activeVital.sampleVal}</span>
                      </div>
                    </div>

                    <p className="mt-6 text-slate-700 text-sm sm:text-base leading-relaxed font-sans font-medium">
                      {activeVital.desc}
                    </p>

                    <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                      <span className="flex items-center gap-2 font-bold text-emerald-600 bg-emerald-50 px-3.5 py-1.5 rounded-full border border-emerald-200/80">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> ✨ Auto-Parsed into Doctor's Interactive Analytics Chart
                      </span>
                      <span className="font-mono text-[11px] bg-slate-100 px-3 py-1.5 rounded-lg text-slate-700 font-bold border border-slate-200/60">
                        Unit: {activeVital.unit}
                      </span>
                    </div>
                  </div>

                  {/* Right Peek Card (Next Vital - Peek-a-Boo Effect) */}
                  <div
                    onClick={() => setSelectedVitalTab(nextVital.id as any)}
                    className="hidden md:block w-64 lg:w-72 shrink-0 opacity-50 scale-95 blur-[1px] cursor-pointer hover:opacity-80 hover:scale-98 transition-all duration-300 bg-slate-50 rounded-3xl p-6 border border-slate-200/80 shadow-md select-none"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${nextVital.color} text-white flex items-center justify-center`}>
                        <NextIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-slate-800">{nextVital.name}</h4>
                        <span className="text-[10px] text-slate-500 block font-medium">{nextVital.sub}</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2">{nextVital.desc}</p>
                  </div>

                </div>

                {/* Pagination Dots */}
                <div className="mt-6 flex items-center justify-center gap-2">
                  {vitalsData.map((v, i) => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVitalTab(v.id as any)}
                      className={`h-2 rounded-full transition-all cursor-pointer ${
                        i === currentIdx
                          ? 'w-8 bg-blue-600'
                          : 'w-2 bg-slate-200 hover:bg-slate-300'
                      }`}
                      aria-label={`Go to ${v.name}`}
                    />
                  ))}
                </div>

              </div>
            );
          })()}

        </div>
      </section>

      {/* SECTION 7: WHY HOSPITALS CHOOSE DOC2ME (PASTEL LEMON CANVAS + FLUSH GOLDEN YELLOW HALF-CIRCLE) */}
      <section 
        id="why-doc2me" 
        className="py-16 sm:py-24 bg-[#fef9c3] text-slate-900 w-full relative min-h-[640px] overflow-hidden select-none border-b border-yellow-200/80 flex flex-col justify-center"
        style={{ backgroundColor: '#fef9c3' }}
      >
        
        {/* Full-Canvas Transparent Golden Yellow Bridge Illustration in Background (Opacity ~25%) */}
        <div className="absolute inset-0 w-full h-full pointer-events-none opacity-25 flex items-center justify-center overflow-hidden z-0">
          <svg className="w-full h-full object-cover min-w-[900px]" viewBox="0 0 1000 400" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Arch bridge path representing Doctor-Patient Connection */}
            <path d="M 50 340 Q 500 60 950 340" stroke="#eab308" strokeWidth="12" strokeLinecap="round" fill="none" />
            <path d="M 50 350 L 950 350" stroke="#eab308" strokeWidth="10" />
            {/* Vertical suspension cables */}
            <line x1="200" y1="250" x2="200" y2="350" stroke="#eab308" strokeWidth="4" />
            <line x1="320" y1="180" x2="320" y2="350" stroke="#eab308" strokeWidth="4" />
            <line x1="440" y1="130" x2="440" y2="350" stroke="#eab308" strokeWidth="4" />
            <line x1="560" y1="130" x2="560" y2="350" stroke="#eab308" strokeWidth="4" />
            <line x1="680" y1="180" x2="680" y2="350" stroke="#eab308" strokeWidth="4" />
            <line x1="800" y1="250" x2="800" y2="350" stroke="#eab308" strokeWidth="4" />
            {/* Bridge Towers */}
            <rect x="300" y="110" width="30" height="240" fill="#eab308" rx="6" />
            <rect x="670" y="110" width="30" height="240" fill="#eab308" rx="6" />
          </svg>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
          
          {/* Header (Top Center - Heading / Para) */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-3xl mx-auto mb-10 sm:mb-14"
          >
            <span className="text-xs font-black text-amber-950 uppercase tracking-widest bg-yellow-300/80 px-4 py-1.5 rounded-full border border-yellow-400/80 shadow-none">
              Built for Modern Hospitals
            </span>
            <h2 className="mt-4 text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
              Why Hospitals & Clinics Choose Doc2Me
            </h2>
            <p className="mt-3 text-base sm:text-lg text-slate-800 font-extrabold max-w-2xl mx-auto">
              Designed to increase patient compliance and streamline consultation times.
            </p>
          </motion.div>

          {/* Main Content Layout: Left Pillars (In Front of Bridge) | Right Golden Yellow Arc */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left Column: 3 Core Pillars in Ultra-Bold Dark Slate */}
            <div className="lg:col-span-7 space-y-7 pr-0 lg:pr-8 relative z-10">
              
              {/* Pillar 1 */}
              <motion.div 
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="flex items-start gap-4 sm:gap-5 group"
              >
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#eab308] text-slate-950 font-black flex items-center justify-center shrink-0 shadow-none group-hover:scale-105 transition-transform">
                  <Users className="w-6 h-6 sm:w-7 sm:h-7 text-slate-950" />
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    98% Patient Adherence
                  </h3>
                  <p className="mt-1.5 text-sm sm:text-base text-slate-800 font-extrabold leading-relaxed">
                    Since patients open WhatsApp 20+ times daily, compliance jumps from 12% on native apps to over 98% on Doc2Me.
                  </p>
                  <div className="mt-2 flex items-center gap-2 text-xs font-black text-slate-900">
                    <CheckCircle2 className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>Zero friction engagement</span>
                  </div>
                </div>
              </motion.div>

              {/* Pillar 2 */}
              <motion.div 
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="flex items-start gap-4 sm:gap-5 group"
              >
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#eab308] text-slate-950 font-black flex items-center justify-center shrink-0 shadow-none group-hover:scale-105 transition-transform">
                  <Clock className="w-6 h-6 sm:w-7 sm:h-7 text-slate-950" />
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    Faster OPD Consults
                  </h3>
                  <p className="mt-1.5 text-sm sm:text-base text-slate-800 font-extrabold leading-relaxed">
                    Doctors save 3–5 minutes per patient visit by reviewing instant multi-day clinical trend graphs instead of paper notes.
                  </p>
                  <div className="mt-2 flex items-center gap-2 text-xs font-black text-slate-900">
                    <CheckCircle2 className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>Instant 1-second trend charts</span>
                  </div>
                </div>
              </motion.div>

              {/* Pillar 3 */}
              <motion.div 
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="flex items-start gap-4 sm:gap-5 group"
              >
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#eab308] text-slate-950 font-black flex items-center justify-center shrink-0 shadow-none group-hover:scale-105 transition-transform">
                  <ShieldCheck className="w-6 h-6 sm:w-7 sm:h-7 text-slate-950" />
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    Zero Patient Friction
                  </h3>
                  <p className="mt-1.5 text-sm sm:text-base text-slate-800 font-extrabold leading-relaxed">
                    No passwords, no app store downloads, zero login trouble for elderly patients. Simple typing or voice notes.
                  </p>
                  <div className="mt-2 flex items-center gap-2 text-xs font-black text-slate-900">
                    <CheckCircle2 className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>100% WhatsApp native simplicity</span>
                  </div>
                </div>
              </motion.div>

            </div>

            {/* Right Column: Edge-to-Edge Golden Yellow Circle Arc with Crisp Metrics */}
            <div className="lg:col-span-5 relative min-h-[420px] flex items-center justify-end z-20">
              
              <motion.div
                initial={{ opacity: 0, x: 80 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="w-full lg:absolute lg:right-0 lg:top-0 lg:bottom-0 lg:h-full lg:w-[480px] xl:w-[540px] bg-[#eab308] text-white flex flex-col justify-center rounded-3xl lg:rounded-none lg:rounded-l-[999px] p-8 sm:p-12 shadow-none"
              >
                <div className="max-w-md mx-auto w-full space-y-6 text-center">
                  
                  {/* Metric 1 */}
                  <div className="bg-white/10 p-4 sm:p-5 rounded-2xl border border-white/20 shadow-none">
                    <p className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-none">0</p>
                    <p className="mt-2 text-sm sm:text-base font-black text-white uppercase tracking-wider">
                      App Downloads Required
                    </p>
                    <p className="text-xs font-extrabold text-amber-100 mt-0.5">
                      100% WhatsApp Native
                    </p>
                  </div>

                  {/* Metric 2 */}
                  <div className="bg-white/10 p-4 sm:p-5 rounded-2xl border border-white/20 shadow-none">
                    <p className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-none">98%</p>
                    <p className="mt-2 text-sm sm:text-base font-black text-white uppercase tracking-wider">
                      Vitals Logging Compliance
                    </p>
                    <p className="text-xs font-extrabold text-amber-100 mt-0.5">
                      Highest in Healthcare
                    </p>
                  </div>

                  {/* Grid for Metric 3 & Metric 4 */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/10 p-3.5 rounded-2xl border border-white/20 shadow-none text-center">
                      <p className="text-2xl sm:text-3xl font-black text-white tracking-tight">&lt; 3s</p>
                      <p className="text-[11px] font-black text-white uppercase tracking-tight mt-1">Graph Generation</p>
                      <p className="text-[10px] text-amber-100 font-extrabold mt-0.5">Instant OPD</p>
                    </div>

                    <div className="bg-white/10 p-3.5 rounded-2xl border border-white/20 shadow-none text-center">
                      <p className="text-2xl sm:text-3xl font-black text-white tracking-tight">7</p>
                      <p className="text-[11px] font-black text-white uppercase tracking-tight mt-1">Core Vitals</p>
                      <p className="text-[10px] text-amber-100 font-extrabold mt-0.5">BP, Sugar, etc.</p>
                    </div>
                  </div>

                </div>
              </motion.div>

            </div>

          </div>

        </div>
      </section>

      {/* SECTION 9: PATIENT & DOCTOR EXPERIENCE SHOWCASE (2-COLUMN SPLIT GLASS) */}
      <section className="py-20 bg-slate-50 border-b border-slate-200 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest bg-blue-100 px-3.5 py-1.5 rounded-full border border-blue-200">
              Dual Experience
            </span>
            <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Designed for Patients &amp; Doctors Alike
            </h2>
            <p className="mt-3 text-sm text-slate-600 font-medium">
              A frictionless experience on WhatsApp for patients, synchronized seamlessly with a powerful clinical dashboard for doctors.
            </p>
          </div>

          <div className="relative max-w-6xl mx-auto">
            
            {/* Central Pulsing Live Data Sync Connector */}
            <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30 items-center gap-2 bg-white/95 backdrop-blur-md px-4 py-2 rounded-full border border-slate-200/90 shadow-lg text-xs font-black text-slate-800 pointer-events-none">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span>Live Data Sync</span>
              <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Patient Experience Column */}
              <div className="relative overflow-hidden bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-8 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                
                {/* WhatsApp Chat Bubble SVG Background Artwork */}
                <div className="absolute -right-4 -bottom-4 opacity-30 pointer-events-none">
                  <svg className="w-56 h-56 text-emerald-600" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                  </svg>
                </div>

                <div className="flex items-center gap-3.5 mb-6 relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
                    <Smartphone className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Patient Experience (WhatsApp)</h3>
                    <p className="text-xs text-slate-500 font-medium">Zero learning curve, natural conversation</p>
                  </div>
                </div>

                <ul className="space-y-4 text-sm text-slate-600 relative z-10">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <span><strong>Voice Note Support:</strong> Elderly patients can simply send a voice note saying "Mera sugar 120 tha".</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <span><strong>Instant Confirmation:</strong> Received instant confirmation with meal-tagging (Fasting vs Post-Meal).</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <span><strong>No Login Hassle:</strong> Uses their regular WhatsApp phone number without passwords.</span>
                  </li>
                </ul>
              </div>

              {/* Doctor Experience Column */}
              <div className="relative overflow-hidden bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-8 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                
                {/* Clinical Chart Trendline SVG Background Artwork */}
                <div className="absolute -right-4 -bottom-4 opacity-30 pointer-events-none">
                  <svg className="w-60 h-60 text-indigo-600" viewBox="0 0 200 200" fill="none" stroke="currentColor">
                    <path d="M 10 150 Q 50 80 90 120 T 170 40" strokeWidth="12" strokeLinecap="round" />
                    <circle cx="170" cy="40" r="10" fill="currentColor" />
                    <circle cx="90" cy="120" r="8" fill="currentColor" />
                    <line x1="10" y1="180" x2="190" y2="180" strokeWidth="6" strokeDasharray="8 8" />
                  </svg>
                </div>

                <div className="flex items-center gap-3.5 mb-6 relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0">
                    <Stethoscope className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Doctor Experience (Doctor Portal)</h3>
                    <p className="text-xs text-slate-500 font-medium">Fast clinical insights during busy OPDs</p>
                  </div>
                </div>

                <ul className="space-y-4 text-sm text-slate-600 relative z-10">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                    <span><strong>Patient ID Lookup:</strong> Doctor enters Patient ID or phone number to instantly load multi-day comprehensive timeline graphs.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                    <span><strong>Abnormal Value Highlights:</strong> High blood sugar or elevated BP entries are auto-flagged in red/amber for rapid clinical attention.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                    <span><strong>Consultation-Ready Insights:</strong> Enables informed clinical decision-making and precise treatment evaluation based on continuous home vitals trends.</span>
                  </li>
                </ul>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* SECTION 9.5: B2B PRICING SECTION */}
      <section id="pricing" className="py-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest bg-blue-100 px-3.5 py-1.5 rounded-full border border-blue-200">
              Hospital Pricing & Plans
            </span>
            <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Flexible Plans Built for Clinics & Hospitals
            </h2>
            <p className="mt-3 text-sm text-slate-600">
              Zero upfront setup fees for doctors. Scalable plans as your hospital grows.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Plan 1 */}
            <div className="bg-slate-50 rounded-3xl p-8 border border-slate-200 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider bg-blue-100 px-3 py-1 rounded-md">
                  Individual Clinic / Doctor
                </span>
                <h3 className="text-xl font-bold text-slate-900 mt-4">Clinic Essentials</h3>
                <p className="text-3xl font-black text-slate-900 mt-2">Free Trial <span className="text-xs font-normal text-slate-500">/ 30 Days</span></p>
                <p className="text-xs text-slate-600 mt-3 leading-relaxed">Ideal for single-physician OPDs and specialty clinics testing WhatsApp vitals logging.</p>
                <ul className="mt-6 space-y-3 text-xs text-slate-600">
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Up to 100 Active Patients</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Doctor Portal Vitals Dashboard</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> English & Hindi Voice/Text AI</li>
                </ul>
              </div>
              <button onClick={() => setShowQrModal(true)} className="mt-8 w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all cursor-pointer">
                Start Free Demo
              </button>
            </div>

            {/* Plan 2 */}
            <div className="bg-slate-900 text-white rounded-3xl p-8 border border-blue-500/40 flex flex-col justify-between shadow-xl relative">
              <span className="absolute -top-3.5 right-6 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full shadow-md">
                Most Popular
              </span>
              <div>
                <span className="text-xs font-bold text-blue-300 uppercase tracking-wider bg-blue-950 px-3 py-1 rounded-md border border-blue-800">
                  Polyclinic & Nursing Home
                </span>
                <h3 className="text-xl font-bold text-white mt-4">Hospital Pro</h3>
                <p className="text-3xl font-black text-white mt-2">Custom Partner Pricing</p>
                <p className="text-xs text-slate-300 mt-3 leading-relaxed">Designed for multi-doctor OPD centers, specialty hospitals, and nursing homes.</p>
                <ul className="mt-6 space-y-3 text-xs text-slate-300">
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> Unlimited Patient Accounts</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> Hospital Admin Dashboard & Multi-Doctor Access</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> Custom Hospital WhatsApp Branding</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> Dedicated Onboarding Support</li>
                </ul>
              </div>
              <button onClick={() => setShowQrModal(true)} className="mt-8 w-full py-3 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white font-bold text-xs transition-all cursor-pointer shadow-lg shadow-blue-500/30">
                Book a Free Hospital Demo
              </button>
            </div>

            {/* Plan 3 */}
            <div className="bg-slate-50 rounded-3xl p-8 border border-slate-200 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider bg-indigo-100 px-3 py-1 rounded-md">
                  Large Hospital Chains
                </span>
                <h3 className="text-xl font-bold text-slate-900 mt-4">Enterprise Care</h3>
                <p className="text-3xl font-black text-slate-900 mt-2">Tailored Deployment</p>
                <p className="text-xs text-slate-600 mt-3 leading-relaxed">Full API integration with existing Hospital Information Management Systems (HIMS).</p>
                <ul className="mt-6 space-y-3 text-xs text-slate-600">
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> HIMS / EMR API Synchronization</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> On-Premise / Private Cloud Setup</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> 24/7 SLA & Dedicated Account Manager</li>
                </ul>
              </div>
              <button onClick={() => setShowQrModal(true)} className="mt-8 w-full py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all cursor-pointer">
                Contact Enterprise Sales
              </button>
            </div>
          </div>

        </div>
      </section>

      {/* SECTION 10: COMPREHENSIVE FAQ ACCORDION SECTION (INTERACTIVE WHATSAPP CHAT BUBBLE INTERFACE) */}
      <section id="faq" className="py-20 bg-slate-50 relative border-b border-slate-200">
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          
          <div className="text-center mb-16">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-widest bg-emerald-100 px-3.5 py-1.5 rounded-full border border-emerald-300/80 inline-flex items-center gap-1.5 shadow-xs">
              <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
              <span>Got Questions? Chat with Doc2Me AI</span>
            </span>
            <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="mt-3 text-sm text-slate-600">
              Everything Hospitals, Doctors & Patients need to know about Doc2Me.
            </p>
          </div>

          <div className="space-y-6">
            {faqs.map((faq, index) => {
              const isOpen = activeFaqIndex === index;
              return (
                <div key={index} className="flex flex-col space-y-2">
                  
                  {/* QUESTION: Incoming WhatsApp Chat Bubble (Left Aligned) */}
                  <div
                    onClick={() => setActiveFaqIndex(isOpen ? null : index)}
                    className="bg-slate-100 text-slate-900 border border-slate-200 rounded-2xl rounded-tl-none p-4 cursor-pointer font-semibold shadow-sm hover:bg-slate-200/80 transition-all flex items-center justify-between gap-4 max-w-3xl"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 font-bold text-xs shadow-xs">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <span className="text-base sm:text-lg font-bold text-slate-900">{faq.question}</span>
                    </div>
                    <ChevronDown className={`w-5 h-5 text-slate-500 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-emerald-600' : ''}`} />
                  </div>

                  {/* ANSWER: Outgoing WhatsApp Reply Bubble (Right Aligned, Light-Green Accent) */}
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.98 }}
                        transition={{ duration: 0.25 }}
                        className="bg-[#dcf8c6] text-slate-900 border border-emerald-300/60 rounded-2xl rounded-tr-none p-5 mt-2 shadow-md max-w-3xl ml-4 sm:ml-10 relative"
                      >
                        <div className="text-sm sm:text-base text-slate-800 leading-relaxed font-medium">
                          {faq.answer}
                        </div>

                        {/* WhatsApp Timestamp & Blue Double-Ticks */}
                        <div className="mt-3 flex items-center justify-end gap-1.5 text-[11px] font-bold text-emerald-800/80">
                          <span>Doc2Me AI • Just now</span>
                          <CheckCheck className="w-4 h-4 text-blue-600 shrink-0" />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* SECTION 11: HIGH-CONVERTING B2B CTA BANNER */}
      <section className="py-20 bg-gradient-to-tr from-blue-900 via-indigo-900 to-slate-900 text-white relative overflow-hidden border-t border-blue-500/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          
          <span className="text-xs font-bold text-blue-300 uppercase tracking-widest bg-blue-950/80 px-3.5 py-1.5 rounded-full border border-blue-500/40">
            Partner With Doc2Me
          </span>

          <h2 className="mt-5 text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            Transform Post-Consultation Patient Care at Your Hospital
          </h2>
          <p className="mt-4 text-base sm:text-lg text-blue-100/90 max-w-2xl mx-auto">
            Empower your doctors with instant longitudinal multi-period vitals trend graphs and give your patients a 100% WhatsApp-native logging experience with zero app friction.
          </p>

          <div className="mt-8 flex items-center justify-center">
            <button
              onClick={() => setShowQrModal(true)}
              className="border-0 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white font-bold text-lg px-10 py-5 rounded-2xl shadow-xl hover:shadow-emerald-500/40 hover:scale-105 transition-all duration-300 cursor-pointer flex items-center gap-3"
            >
              <Calendar className="w-6 h-6 text-white" />
              <span>Schedule a Live Hospital Demo</span>
              <ArrowRight className="w-5 h-5 text-white/90" />
            </button>
          </div>

        </div>
      </section>

      {/* SECTION 12: LARGE PROFESSIONAL FOOTER */}
      <footer className="bg-slate-950 text-slate-400 py-16 border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 pb-12 border-b border-slate-800/80">
            
            {/* Column 1: Brand Info */}
            <div className="col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center font-black text-base">
                  D2M
                </div>
                <span className="text-xl font-black text-white tracking-tight">
                  Doc2Me
                </span>
              </div>
              <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                Doc2Me is a B2B Health-Tech Platform bridging Hospitals, Clinics, Doctors, and Patients. Enables continuous post-consultation vitals tracking on WhatsApp without requiring app downloads.
              </p>
              <p className="mt-4 text-[11px] text-slate-500">
                © {new Date().getFullYear()} Doc2Me Health Systems. All rights reserved.
              </p>
            </div>

            {/* Column 2: Product Links */}
            <div>
              <p className="text-xs font-bold text-white uppercase tracking-wider mb-4">Product</p>
              <ul className="space-y-2.5 text-xs">
                <li><a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
                <li><a href="#vitals-covered" className="hover:text-white transition-colors">7 Core Vitals</a></li>
                <li><a href="#for-hospitals" className="hover:text-white transition-colors">For Hospitals</a></li>
                <li><a href="#faq" className="hover:text-white transition-colors">FAQ</a></li>
              </ul>
            </div>

            {/* Column 3: Portals Access */}
            <div>
              <p className="text-xs font-bold text-white uppercase tracking-wider mb-4">Access Portals</p>
              <ul className="space-y-2.5 text-xs">
                <li>
                  <button onClick={() => setSelectedPortal('hospital')} className="hover:text-blue-400 transition-colors text-left cursor-pointer">
                    Hospital Admin Portal
                  </button>
                </li>
                <li>
                  <button onClick={() => setSelectedPortal('doctor')} className="hover:text-indigo-400 transition-colors text-left cursor-pointer">
                    Doctor Portal
                  </button>
                </li>
                <li>
                  <button onClick={() => setSelectedPortal('patient')} className="hover:text-emerald-400 transition-colors text-left cursor-pointer">
                    Patient Info & Access
                  </button>
                </li>
                <li>
                  <button onClick={() => setSelectedPortal('founders')} className="hover:text-amber-400 transition-colors text-left cursor-pointer">
                    Founders Internal Portal
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 4: Legal & Security */}
            <div>
              <p className="text-xs font-bold text-white uppercase tracking-wider mb-4">Legal & Ethics</p>
              <ul className="space-y-2.5 text-xs">
                <li><a href="#" className="hover:text-white transition-colors">Data Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Encrypted Clinical Standard</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact Support</a></li>
              </ul>
            </div>

          </div>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
            <p>Designed for OPD Hospitals, Doctors & WhatsApp Patients across India.</p>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> End-to-End Encrypted</span>
            </div>
          </div>

        </div>
      </footer>

      {/* QR CODE WHATSAPP MODAL */}
      <AnimatePresence>
        {showQrModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setShowQrModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl border border-slate-200 relative text-slate-900"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-[#25D366] flex items-center justify-center font-bold mx-auto mb-3">
                <MessageSquare className="w-6 h-6 fill-current" />
              </div>

              <h3 className="text-xl font-extrabold text-slate-900">Doc2Me WhatsApp Bot</h3>
              <p className="text-xs text-slate-500 mt-1">Scan QR Code or Click to Launch WhatsApp Chat</p>

              <div className="my-6 p-4 bg-slate-50 rounded-2xl border border-slate-200 inline-block">
                {/* SVG Mock QR Code */}
                <div className="w-40 h-40 bg-white p-2 rounded-xl flex items-center justify-center border border-slate-200 shadow-xs mx-auto">
                  <QrCode className="w-32 h-32 text-slate-800" />
                </div>
              </div>

              <p className="text-xs font-mono text-slate-600 bg-emerald-50 py-2 rounded-xl border border-emerald-200 font-bold text-emerald-800">
                WhatsApp: +91 98765 DOC2ME
              </p>

              <a
                href="https://wa.me/?text=Sugar%20126"
                target="_blank"
                rel="noreferrer"
                className="mt-4 w-full py-3.5 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-extrabold text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <span>Launch WhatsApp Directly</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PORTAL MODAL OVERLAY FOR (HOSPITAL ADMIN, DOCTOR, PATIENT, FOUNDERS) */}
      <AnimatePresence>
        {selectedPortal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setSelectedPortal(null)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 10 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 relative text-slate-900"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setSelectedPortal(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Header depending on role */}
              <div className="flex items-center gap-3 mb-4">
                {selectedPortal === 'hospital' && (
                  <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                    <Building2 className="w-5 h-5" />
                  </div>
                )}
                {selectedPortal === 'doctor' && (
                  <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                    <Stethoscope className="w-5 h-5" />
                  </div>
                )}
                {selectedPortal === 'patient' && (
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                    <Users className="w-5 h-5" />
                  </div>
                )}
                {selectedPortal === 'founders' && (
                  <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold">
                    <Award className="w-5 h-5" />
                  </div>
                )}

                <div>
                  <h3 className="text-xl font-extrabold text-slate-900">
                    {selectedPortal === 'hospital' && 'Hospital Admin Portal'}
                    {selectedPortal === 'doctor' && 'Doctor Vitals Review Portal'}
                    {selectedPortal === 'patient' && 'Patient WhatsApp Access Info'}
                    {selectedPortal === 'founders' && 'Founders Internal Dashboard'}
                  </h3>
                  <p className="text-xs text-slate-500">Doc2Me Secure Access Portal</p>
                </div>
              </div>

              {selectedPortal === 'patient' ? (
                <div className="space-y-4 my-6 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-600">
                  <p className="font-semibold text-slate-900">Notice for Patients:</p>
                  <p>Patients cannot register directly on this website. Access is granted exclusively by registered Hospital Admins during OPD registration.</p>
                  <p>If your hospital has already allotted you a Patient Access ID, simply open WhatsApp and message your readings to the hospital Doc2Me WhatsApp number!</p>
                </div>
              ) : (
                <form onSubmit={(e) => { e.preventDefault(); setSelectedPortal(null); alert(`${selectedPortal.toUpperCase()} Portal login authorized successfully.`); }} className="space-y-4 my-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {selectedPortal === 'hospital' ? 'Hospital Admin ID / Email' : selectedPortal === 'doctor' ? 'Doctor Registration ID' : 'Founders Key'}
                    </label>
                    <input
                      type="text"
                      placeholder={selectedPortal === 'hospital' ? 'admin@cityhospital.com' : 'DOC-REG-8921'}
                      required
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-slate-50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Password / Passcode</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      required
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-slate-50"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm shadow-md cursor-pointer transition-all"
                  >
                    Enter {selectedPortal === 'hospital' ? 'Hospital Admin' : selectedPortal === 'doctor' ? 'Doctor Portal' : 'Founders Dashboard'}
                  </button>
                </form>
              )}

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-400">Switch Portal:</span>
                <div className="flex gap-2">
                  <button onClick={() => setSelectedPortal('hospital')} className="text-blue-600 font-bold hover:underline">Hospital</button>
                  <button onClick={() => setSelectedPortal('doctor')} className="text-indigo-600 font-bold hover:underline">Doctor</button>
                  <button onClick={() => setSelectedPortal('founders')} className="text-amber-600 font-bold hover:underline">Founders</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
