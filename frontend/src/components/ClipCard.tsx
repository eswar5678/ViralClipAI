import React from 'react';
import { Play, Sparkles, Edit3, Clock, CheckCircle2, Flame, TrendingUp } from 'lucide-react';
import { YouTubeIcon } from './YouTubeIcon';
import { ClipSuggestion } from '../types';

interface ClipCardProps {
  clip: ClipSuggestion;
  onPreview: (clip: ClipSuggestion) => void;
  onEdit: (clip: ClipSuggestion) => void;
  onPostYouTube: (clip: ClipSuggestion) => void;
  onQuickRender: (clip: ClipSuggestion) => void;
  isRendering?: boolean;
}

export const ClipCard: React.FC<ClipCardProps> = ({
  clip,
  onPreview,
  onEdit,
  onPostYouTube,
  onQuickRender,
  isRendering,
}) => {
  const virality = clip.virality;
  const score = virality.overall_score;

  const getScoreBadgeColor = (s: number) => {
    if (s >= 90) return 'text-emerald-400 bg-emerald-950/40 border-emerald-500/40 glow-emerald';
    if (s >= 80) return 'text-amber-400 bg-amber-950/40 border-amber-500/40';
    return 'text-indigo-400 bg-indigo-950/40 border-indigo-500/40';
  };

  const formatSec = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="glass-card rounded-2xl p-4 sm:p-5 border flex flex-col justify-between space-y-3 sm:space-y-4 group">
      {/* Top Header: Virality Badge & Duration */}
      <div className="flex items-center justify-between gap-2">
        <div className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl border flex items-center gap-1.5 ${getScoreBadgeColor(score)}`}>
          <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 animate-bounce-subtle shrink-0" />
          <span className="font-display font-black text-xs sm:text-sm tracking-tight">{score}</span>
          <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400">/ 100 Score</span>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5 px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] sm:text-xs text-slate-300">
          <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400 shrink-0" />
          <span>{formatSec(clip.start_time)}-{formatSec(clip.end_time)}</span>
          <span className="text-indigo-400 font-bold">({Math.round(clip.duration)}s)</span>
        </div>
      </div>

      {/* Main Content: Headline & Hook */}
      <div className="space-y-2">
        <h4 className="font-display font-bold text-sm sm:text-base text-white group-hover:text-indigo-300 transition-colors line-clamp-2">
          {clip.headline}
        </h4>

        {/* Hook Box */}
        <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-1">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-400">
            <Sparkles className="w-3 h-3 shrink-0" />
            <span>Opening 3-Second Hook</span>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-300 italic line-clamp-2">
            "{clip.hook_sentence || clip.transcript_sentences[0]?.text || 'Compelling opening hook...'}"
          </p>
        </div>
      </div>

      {/* Virality Metrics Pills */}
      <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-800/60 text-center">
        <div className="p-1.5 rounded-lg bg-slate-900/80 border border-slate-800">
          <span className="block text-[9px] sm:text-[10px] text-slate-400">Hook</span>
          <span className="text-[11px] sm:text-xs font-bold text-emerald-400">{virality.hook_strength}%</span>
        </div>
        <div className="p-1.5 rounded-lg bg-slate-900/80 border border-slate-800">
          <span className="block text-[9px] sm:text-[10px] text-slate-400">Retention</span>
          <span className="text-[11px] sm:text-xs font-bold text-indigo-400">{virality.retention_estimate}</span>
        </div>
        <div className="p-1.5 rounded-lg bg-slate-900/80 border border-slate-800">
          <span className="block text-[9px] sm:text-[10px] text-slate-400">Flow</span>
          <span className="text-[11px] sm:text-xs font-bold text-cyan-400">{virality.engagement_flow}%</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-2 flex flex-col sm:flex-row items-stretch gap-2">
        <button
          onClick={() => onEdit(clip)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-white text-xs font-semibold transition-all cursor-pointer"
        >
          <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
          <span>Edit & Subtitles</span>
        </button>

        {clip.status === 'rendered' ? (
          <button
            onClick={() => onPostYouTube(clip)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md shadow-red-600/20 transition-all cursor-pointer glow-youtube"
          >
            <YouTubeIcon className="w-3.5 h-3.5 text-white" />
            <span>Post to YouTube</span>
          </button>
        ) : (
          <button
            onClick={() => onQuickRender(clip)}
            disabled={isRendering}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 disabled:opacity-50 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
          >
            {isRendering ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
            <span>Render 9:16</span>
          </button>
        )}
      </div>
    </div>
  );
};
