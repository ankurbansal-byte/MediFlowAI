import { useState } from 'react';
import { 
  CheckCheck, 
  Play, 
  Pause, 
  Sparkles, 
  FileText, 
  Activity, 
  Heart, 
  Scale, 
  Droplet,
  Thermometer,
  CheckCircle2,
  Clock,
  Mic,
  Languages
} from 'lucide-react';
import { ChatMessageCard, HealthMetric } from '../types';

interface FloatingCardProps {
  card: ChatMessageCard | HealthMetric;
  cardCategory: 'chat' | 'health';
  className?: string;
  animationClass?: string;
}

export function FloatingCard({ card, cardCategory, className = '', animationClass = '' }: FloatingCardProps) {
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);

  if (cardCategory === 'health') {
    const metric = card as HealthMetric;
    const getMetricIcon = (type: string) => {
      switch (type) {
        case 'sugar':
          return <Droplet className="w-4 h-4 text-fuchsia-400" />;
        case 'bp':
          return <Heart className="w-4 h-4 text-rose-400" />;
        case 'weight':
          return <Scale className="w-4 h-4 text-amber-400" />;
        case 'pulse':
          return <Activity className="w-4 h-4 text-emerald-400" />;
        case 'temp':
          return <Thermometer className="w-4 h-4 text-cyan-400" />;
        default:
          return <Activity className="w-4 h-4 text-purple-400" />;
      }
    };

    return (
      <div 
        id={`health-card-${metric.id}`}
        className={`purple-glass purple-glass-hover rounded-2xl p-3.5 sm:p-4 shadow-xl shadow-purple-950/40 select-none ${animationClass} ${className}`}
      >
        <div className="flex items-center justify-between gap-3 mb-1.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-900/40 border border-purple-500/30 flex items-center justify-center shrink-0">
              {getMetricIcon(metric.type)}
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-200/90">
              {metric.title}
            </span>
          </div>
          <span className="text-[10px] font-medium text-purple-300/60">
            {metric.time}
          </span>
        </div>

        <div className="flex items-baseline gap-1.5 mt-1">
          <span className="text-xl sm:text-2xl font-extrabold text-white font-['Plus_Jakarta_Sans'] tracking-tight">
            {metric.value}
          </span>
          <span className="text-xs font-semibold text-purple-300/80">
            {metric.unit}
          </span>
        </div>

        <div className="mt-2 flex items-center justify-between pt-2 border-t border-purple-500/15">
          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            {metric.status}
          </span>
          {metric.subText && (
            <span className="text-[10px] font-medium text-purple-300/70 bg-purple-900/30 px-2 py-0.5 rounded-md border border-purple-500/20">
              {metric.subText}
            </span>
          )}
        </div>
      </div>
    );
  }

  // Chat message card renderer
  const chat = card as ChatMessageCard;

  // 1. Voice Note Card
  if (chat.type === 'voice_note') {
    return (
      <div 
        id={`chat-card-${chat.id}`}
        className={`bg-[#0F2018]/90 backdrop-blur-xl border border-emerald-500/30 rounded-2xl p-3.5 sm:p-4 shadow-xl shadow-emerald-950/50 max-w-[280px] sm:max-w-[320px] transition-all duration-300 hover:border-emerald-400/50 ${animationClass} ${className}`}
      >
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-950/80 border border-emerald-500/30 px-2 py-0.5 rounded-md flex items-center gap-1">
              <Mic className="w-3 h-3 text-emerald-400" />
              Voice Note ({chat.language || 'Voice'})
            </span>
          </div>
          <span className="text-[10px] font-medium text-emerald-300/60">
            {chat.time}
          </span>
        </div>

        <div className="flex items-center gap-3 mt-2 bg-emerald-950/60 p-2.5 rounded-xl border border-emerald-500/20">
          <button 
            type="button"
            onClick={() => setIsPlayingVoice(!isPlayingVoice)}
            className="w-9 h-9 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/30 transition-transform active:scale-95 cursor-pointer font-bold"
            title={isPlayingVoice ? "Pause voice note" : "Play voice note"}
          >
            {isPlayingVoice ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
          </button>

          <div className="flex-1">
            <div className="flex items-center gap-0.5 h-6">
              {[40, 75, 25, 90, 60, 30, 80, 100, 45, 65, 85, 30, 70, 50, 90, 40].map((h, i) => (
                <span 
                  key={i} 
                  className={`w-1 rounded-full transition-all duration-300 ${
                    isPlayingVoice 
                      ? 'bg-emerald-400 animate-pulse' 
                      : i < 6 ? 'bg-emerald-400' : 'bg-emerald-800'
                  }`}
                  style={{ 
                    height: `${isPlayingVoice ? Math.max(20, (h * Math.random()) % 100) : h}%`,
                    animationDelay: `${i * 60}ms`
                  }}
                />
              ))}
            </div>
            <div className="flex justify-between text-[10px] font-semibold text-emerald-300/80 mt-1">
              <span>{isPlayingVoice ? "0:12" : "0:00"}</span>
              <span>{chat.audioDuration || "0:24"}</span>
            </div>
          </div>
        </div>

        <p className="text-xs text-emerald-100 mt-2 italic bg-emerald-950/40 p-2 rounded-lg border border-emerald-500/20">
          &ldquo;{chat.content}&rdquo;
        </p>

        <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-emerald-500/20">
          <span className="text-[10px] font-medium text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            Voice Note Received
          </span>
          <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
        </div>
      </div>
    );
  }

  // 2. AI Reply Card
  if (chat.type === 'ai_reply') {
    return (
      <div 
        id={`chat-card-${chat.id}`}
        className={`purple-glass purple-glass-hover rounded-2xl p-3.5 sm:p-4 shadow-xl shadow-purple-950/50 max-w-[290px] sm:max-w-[340px] ${animationClass} ${className}`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-500 flex items-center justify-center text-white shadow-sm">
              <Sparkles className="w-3 h-3" />
            </div>
            <span className="text-xs font-bold text-purple-200">
              Doc2Me AI
            </span>
            <span className="text-[10px] bg-purple-500/20 border border-purple-400/30 text-purple-200 px-1.5 py-0.2 rounded font-semibold">
              Instant
            </span>
          </div>
          <span className="text-[10px] font-medium text-purple-300/50">
            {chat.time}
          </span>
        </div>

        <p className="text-xs sm:text-sm text-slate-100 font-medium leading-relaxed">
          {chat.content}
        </p>

        {chat.statusBadge && (
          <div className="mt-2.5 pt-2 border-t border-purple-500/20 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-emerald-300 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              {chat.statusBadge}
            </span>
            <span className="text-[10px] text-purple-300/60 font-mono">WhatsApp Sync</span>
          </div>
        )}
      </div>
    );
  }

  // 3. Image Received / Lab Report Card
  if (chat.type === 'image_received') {
    return (
      <div 
        id={`chat-card-${chat.id}`}
        className={`bg-[#0F1E28]/90 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-3 sm:p-3.5 shadow-xl shadow-cyan-950/50 max-w-[270px] sm:max-w-[310px] hover:border-cyan-400/50 transition-all ${animationClass} ${className}`}
      >
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-bold text-cyan-300 bg-cyan-950/80 border border-cyan-500/30 px-2 py-0.5 rounded-md">
            Lab Report Uploaded
          </span>
          <span className="text-[10px] font-medium text-cyan-300/60">
            {chat.time}
          </span>
        </div>

        {/* Lab Report Container */}
        <div className="relative rounded-xl overflow-hidden bg-slate-900/60 border border-cyan-500/20 p-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-12 bg-cyan-950 rounded-lg border border-cyan-500/40 flex flex-col items-center justify-center p-1 relative shrink-0">
              <FileText className="w-5 h-5 text-cyan-400" />
              <div className="w-full h-1 bg-cyan-400 rounded-full mt-1"></div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-100 truncate">
                {chat.imageCaption || "Blood_Panel_OCR.pdf"}
              </p>
              <p className="text-[10px] text-cyan-300/70">
                Values extracted automatically
              </p>
              <span className="text-[10px] font-semibold text-emerald-400 block mt-0.5">
                OCR Complete ✓
              </span>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-200 mt-2 font-medium">
          {chat.content}
        </p>

        {chat.aiAnalysis && (
          <div className="mt-2 bg-cyan-950/50 p-2 rounded-lg text-[11px] font-medium text-cyan-200 border border-cyan-500/20 flex items-start gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-fuchsia-400 shrink-0 mt-0.5" />
            <span>{chat.aiAnalysis}</span>
          </div>
        )}

        <div className="flex justify-between items-center mt-2 pt-1.5 border-t border-cyan-500/20 text-[10px] text-cyan-300/70">
          <span className="font-semibold text-emerald-300">Timeline Updated</span>
          <CheckCheck className="w-3.5 h-3.5 text-cyan-400" />
        </div>
      </div>
    );
  }

  // 4. Patient Text Messages (English, हिन्दी, Hinglish)
  const isHindi = (chat.language as string) === 'हिन्दी' || (chat.language as string) === 'Hindi';
  return (
    <div 
      id={`chat-card-${chat.id}`}
      className={`bg-[#14211A]/90 backdrop-blur-xl border border-emerald-500/30 rounded-2xl p-3 sm:p-3.5 shadow-xl shadow-emerald-950/40 max-w-[260px] sm:max-w-[310px] hover:border-emerald-400/50 transition-all ${animationClass} ${className}`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950/90 border border-emerald-500/30 px-2 py-0.5 rounded-md flex items-center gap-1">
          {chat.language && <Languages className="w-3 h-3 text-emerald-400" />}
          {chat.language || 'Patient'}
        </span>
        <span className="text-[10px] font-medium text-emerald-300/60">
          {chat.time}
        </span>
      </div>

      <p className={`text-xs sm:text-sm text-emerald-50 font-medium leading-snug mt-1.5 ${isHindi ? 'font-hindi font-medium' : ''}`}>
        {chat.content}
      </p>

      <div className="flex justify-end items-center gap-1 mt-1 text-emerald-400">
        <CheckCheck className="w-3.5 h-3.5" />
      </div>
    </div>
  );
}
