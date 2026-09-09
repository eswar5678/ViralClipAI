import React from 'react';
import { Download, Mic, Sparkles, Scissors, CheckCircle, AlertTriangle, Terminal, Video } from 'lucide-react';
import { WSProgressMessage } from '../types';

interface ProgressTrackerProps {
  progress: WSProgressMessage | null;
  logs: string[];
  onViewClips: () => void;
}

export const ProgressTracker: React.FC<ProgressTrackerProps> = ({
  progress,
  logs,
  onViewClips,
}) => {
  const currentStage = progress?.stage || 'transcribing';
  const percent = progress?.percent || 0;
  const isFinished = currentStage === 'clipping' && percent >= 100;

  const stages = [
    { id: 'downloading', label: '1. Ingestion', desc: 'Download / verify video file', icon: Download },
    { id: 'transcribing', label: '2. Whisper AI', desc: 'Word-level timestamp extraction', icon: Mic },
    { id: 'analyzing', label: '3. Virality Engine', desc: 'Hook & retention analysis', icon: Sparkles },
    { id: 'clipping', label: '4. Clip Generation', desc: 'Auto-reframing & highlights', icon: Scissors },
  ];

  const getStageStatus = (stageId: string) => {
    const stageOrder = ['downloading', 'transcribing', 'analyzing', 'clipping'];
    const curIdx = stageOrder.indexOf(currentStage);
    const thisIdx = stageOrder.indexOf(stageId);

    if (isFinished) return 'completed';
    if (thisIdx < curIdx) return 'completed';
    if (thisIdx === curIdx) return 'active';
    return 'pending';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 p-3 sm:p-6">
      {/* Central Progress Card */}
      <div className="glass-panel rounded-2xl p-4 sm:p-8 border border-slate-800 space-y-6 sm:space-y-8 relative overflow-hidden">
        {/* Luminous Glow Top Bar */}
        <div
          className="absolute top-0 left-0 h-1 bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400 transition-all duration-300"
          style={{ width: `${percent}%` }}
        />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <span className="text-xs uppercase font-extrabold tracking-wider text-indigo-400">
              AI Clipper Pipeline
            </span>
            <h3 className="font-display text-xl sm:text-2xl font-bold text-white mt-1">
              {isFinished ? 'Viral Highlights Ready! 🎉' : progress?.message || 'Processing Video...'}
            </h3>
          </div>
          <div className="flex items-center gap-3 self-end sm:self-auto">
            <span className="text-2xl sm:text-3xl font-black font-display text-indigo-400">
              {percent}%
            </span>
          </div>
        </div>

        {/* Multi-Stage Visual Stepper */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
          {stages.map((st) => {
            const status = getStageStatus(st.id);
            const Icon = st.icon;
            return (
              <div
                key={st.id}
                className={`p-3 sm:p-4 rounded-xl border transition-all ${
                  status === 'active'
                    ? 'bg-indigo-600/15 border-indigo-500/50 shadow-lg shadow-indigo-500/10'
                    : status === 'completed'
                    ? 'bg-emerald-950/20 border-emerald-500/30 text-slate-200'
                    : 'bg-slate-900/40 border-slate-800/80 opacity-50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center ${
                      status === 'active'
                        ? 'bg-indigo-500 text-white animate-bounce-subtle'
                        : status === 'completed'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                  {status === 'completed' && <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />}
                  {status === 'active' && (
                    <div className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                  )}
                </div>
                <h4 className="text-[11px] sm:text-xs font-bold text-slate-100">{st.label}</h4>
                <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 line-clamp-1 sm:line-clamp-none">{st.desc}</p>
              </div>
            );
          })}
        </div>

        {/* Finish CTA */}
        {isFinished && (
          <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs text-emerald-400 font-medium">
              Viral hooks extracted, transcribed, and scored. Ready for review and YouTube scheduling!
            </p>
            <button
              onClick={onViewClips}
              className="w-full sm:w-auto text-center px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
            >
              Explore Viral Clips Studio →
            </button>
          </div>
        )}
      </div>

      {/* Real-time Activity Terminal */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-800/80 space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 border-b border-slate-800/80 pb-2">
          <Terminal className="w-4 h-4 text-indigo-400" />
          <span>Real-time Engine Logs</span>
        </div>
        <div className="h-44 overflow-y-auto font-mono text-xs text-slate-300 space-y-1.5 p-2 bg-slate-950/80 rounded-xl border border-slate-900">
          {logs.length === 0 && (
            <div className="text-slate-400 italic">Waiting for processing pipeline to initiate...</div>
          )}
          {logs.map((log, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <span className="text-slate-400 select-none">&gt;</span>
              <span className="leading-relaxed">{log}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
