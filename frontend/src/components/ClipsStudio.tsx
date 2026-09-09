import React, { useState } from 'react';
import { Sparkles, SlidersHorizontal, Play, Flame, Film, ArrowUpDown } from 'lucide-react';
import { ClipSuggestion, VideoMetadata } from '../types';
import { ClipCard } from './ClipCard';

interface ClipsStudioProps {
  clips: ClipSuggestion[];
  videoMeta: VideoMetadata | null;
  onPreviewClip: (clip: ClipSuggestion) => void;
  onEditClip: (clip: ClipSuggestion) => void;
  onPostYouTube: (clip: ClipSuggestion) => void;
  onRenderClip: (clip: ClipSuggestion) => void;
  renderingClipId: string | null;
  onBatchRenderAll: () => void;
}

export const ClipsStudio: React.FC<ClipsStudioProps> = ({
  clips,
  videoMeta,
  onPreviewClip,
  onEditClip,
  onPostYouTube,
  onRenderClip,
  renderingClipId,
  onBatchRenderAll,
}) => {
  const [sortBy, setSortBy] = useState<'virality' | 'duration_asc' | 'duration_desc'>('virality');
  const [filterScore, setFilterScore] = useState<number>(0);

  const filteredClips = [...clips]
    .filter((c) => c.virality.overall_score >= filterScore)
    .sort((a, b) => {
      if (sortBy === 'virality') {
        return b.virality.overall_score - a.virality.overall_score;
      }
      if (sortBy === 'duration_asc') {
        return a.duration - b.duration;
      }
      return b.duration - a.duration;
    });

  return (
    <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 p-3 sm:p-6">
      {/* Top Banner & Video Summary */}
      <div className="glass-panel rounded-2xl p-4 sm:p-6 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
            <Film className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] sm:text-xs uppercase font-extrabold tracking-wider text-emerald-400">
                AI Slicing Completed
              </span>
              <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                {clips.length} Clips
              </span>
            </div>
            <h3 className="font-display text-lg sm:text-xl font-bold text-white mt-1 truncate">
              {videoMeta?.title || 'Imported Video Slices'}
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 line-clamp-1">
              Ranked by Virality AI. Review, customize subtitles, and publish to YouTube.
            </p>
          </div>
        </div>

        {/* Batch Render Action */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={onBatchRenderAll}
            className="w-full md:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <Play className="w-4 h-4" />
            <span>Render All {clips.length} Clips</span>
          </button>
        </div>
      </div>

      {/* Filter & Sort Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Score Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          <button
            onClick={() => setFilterScore(0)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              filterScore === 0
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            All Clips ({clips.length})
          </button>
          <button
            onClick={() => setFilterScore(90)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              filterScore === 90
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>Top Viral (&gt;90)</span>
          </button>
          <button
            onClick={() => setFilterScore(80)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              filterScore === 80
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            High (&gt;80)
          </button>
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center justify-between sm:justify-end gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>Sort:</span>
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="virality">Highest Virality Score</option>
            <option value="duration_asc">Duration: Short to Long</option>
            <option value="duration_desc">Duration: Long to Short</option>
          </select>
        </div>
      </div>

      {/* Clips Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {filteredClips.map((clip) => (
          <ClipCard
            key={clip.clip_id}
            clip={clip}
            onPreview={onPreviewClip}
            onEdit={onEditClip}
            onPostYouTube={onPostYouTube}
            onQuickRender={onRenderClip}
            isRendering={renderingClipId === clip.clip_id}
          />
        ))}
      </div>
    </div>
  );
};
