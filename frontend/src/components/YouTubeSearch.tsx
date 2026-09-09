import React, { useState, useEffect } from 'react';
import {
  Search,
  Sparkles,
  ExternalLink,
  Eye,
  Clock,
  Calendar,
  Filter,
  ArrowRight,
  Play,
  Copy,
  Check,
  X,
  Flame,
  Tv,
} from 'lucide-react';
import { YouTubeIcon } from './YouTubeIcon';
import { YouTubeSearchResultItem } from '../types';
import { api } from '../api';

interface YouTubeSearchProps {
  onSelectVideoToClip: (videoUrl: string) => void;
  isProcessing?: boolean;
}

export const YouTubeSearch: React.FC<YouTubeSearchProps> = ({
  onSelectVideoToClip,
  isProcessing,
}) => {
  const [query, setQuery] = useState('huberman motivation focus');
  const [order, setOrder] = useState('relevance');
  const [duration, setDuration] = useState('any');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<YouTubeSearchResultItem[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [previewVideoId, setPreviewVideoId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const trendingTopics = [
    { label: '🔥 Huberman Motivation', query: 'huberman lab focus motivation' },
    { label: '🚀 Alex Hormozi Business', query: 'alex hormozi business advice' },
    { label: '🧠 AI News & Tools', query: 'latest AI tools breakthrough 2026' },
    { label: '🎙️ Podcast Highlights', query: 'joe rogan best moments podcast' },
    { label: '🏆 MrBeast Challenges', query: 'mrbeast challenge moments' },
    { label: '💡 Mindset & Growth', query: 'david goggins discipline mindset' },
  ];

  const handleSearch = async (overrideQuery?: string) => {
    const q = overrideQuery !== undefined ? overrideQuery : query;
    if (!q.trim()) return;

    setIsSearching(true);
    setErrorMsg(null);
    try {
      const res = await api.searchYouTubeVideos({
        query: q.trim(),
        max_results: 15,
        order,
        video_duration: duration,
      });
      setResults(res);
      if (overrideQuery) {
        setQuery(overrideQuery);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to search YouTube. Please check network.');
    } finally {
      setIsSearching(false);
    }
  };

  // Perform initial search on mount
  useEffect(() => {
    handleSearch('huberman motivation focus');
  }, []);

  const handleCopyLink = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 p-3 sm:p-6">
      {/* Search Header Banner */}
      <div className="glass-panel rounded-2xl p-4 sm:p-6 border border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-3.5">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-red-600/20 border border-red-500/30 flex items-center justify-center shrink-0">
              <YouTubeIcon className="w-5 h-5 sm:w-6 sm:h-6 text-red-500" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] font-extrabold uppercase tracking-wider">
                Live YouTube Search
              </div>
              <h2 className="font-display text-lg sm:text-xl font-bold text-white mt-1">
                Search & Find Any Video on YouTube to Clip
              </h2>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1 text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={order}
                onChange={(e) => {
                  setOrder(e.target.value);
                  setTimeout(() => handleSearch(), 100);
                }}
                className="bg-transparent text-slate-300 focus:outline-none cursor-pointer"
              >
                <option value="relevance">Most Relevant</option>
                <option value="date">Latest Uploads</option>
                <option value="viewCount">Most Viewed</option>
                <option value="rating">Top Rated</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1 text-xs">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={duration}
                onChange={(e) => {
                  setDuration(e.target.value);
                  setTimeout(() => handleSearch(), 100);
                }}
                className="bg-transparent text-slate-300 focus:outline-none cursor-pointer"
              >
                <option value="any">All Lengths</option>
                <option value="short">Short (&lt; 4 min)</option>
                <option value="medium">Medium (4 - 20 min)</option>
                <option value="long">Long (&gt; 20 min)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Search Input Box */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search YouTube videos (e.g. podcast moments, motivation, gaming)..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-11 pr-4 py-3 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
            />
          </div>
          <button
            onClick={() => handleSearch()}
            disabled={isSearching || !query.trim()}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-red-600/30 transition-all cursor-pointer glow-youtube shrink-0"
          >
            {isSearching ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            <span>Search YouTube</span>
          </button>
        </div>

        {/* Trending Suggestions */}
        <div className="flex items-center gap-2 pt-1 overflow-x-auto no-scrollbar py-1">
          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 shrink-0">
            <Flame className="w-3 h-3 text-amber-400" />
            <span>Popular:</span>
          </span>
          {trendingTopics.map((t) => (
            <button
              key={t.query}
              onClick={() => handleSearch(t.query)}
              className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-semibold whitespace-nowrap transition-all cursor-pointer"
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/40 text-xs text-red-300">
            {errorMsg}
          </div>
        )}
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <Tv className="w-4 h-4 text-indigo-400" />
          <span>
            {results.length > 0 ? `Found ${results.length} Video Results` : 'YouTube Video Results'}
          </span>
        </h3>
      </div>

      {/* Results Grid */}
      {results.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {results.map((vid) => (
            <div
              key={vid.video_id}
              className="glass-card rounded-2xl p-4 border flex flex-col justify-between space-y-4 group transition-all hover:border-slate-700"
            >
              {/* Thumbnail Container */}
              <div className="w-full aspect-video rounded-xl bg-slate-900 overflow-hidden relative border border-slate-800">
                <img
                  src={vid.thumbnail_url}
                  alt={vid.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />

                {/* Duration Badge */}
                <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md text-[11px] font-mono font-bold text-white flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>{vid.duration_formatted}</span>
                </div>

                {/* Hover Play Preview Trigger */}
                <button
                  onClick={() => setPreviewVideoId(vid.video_id)}
                  className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                  title="Watch Preview"
                >
                  <div className="w-12 h-12 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                    <Play className="w-5 h-5 fill-white ml-0.5" />
                  </div>
                </button>
              </div>

              {/* Info Section */}
              <div className="space-y-1.5 flex-1">
                <h4 className="font-display font-bold text-sm text-white line-clamp-2 group-hover:text-indigo-300 transition-colors">
                  {vid.title}
                </h4>
                <div className="text-xs font-semibold text-slate-300 truncate">
                  {vid.channel_title}
                </div>
                <div className="flex items-center gap-3 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3 text-slate-400" />
                    <span>{vid.view_count_formatted}</span>
                  </span>
                  {vid.upload_date && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{vid.upload_date}</span>
                      </span>
                    </>
                  )}
                </div>
                {vid.description && (
                  <p className="text-[11px] text-slate-400 line-clamp-2 pt-1 leading-relaxed">
                    {vid.description}
                  </p>
                )}
              </div>

              {/* Action Bar */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2">
                <button
                  onClick={() => onSelectVideoToClip(vid.url)}
                  disabled={isProcessing}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-red-600 to-indigo-600 hover:from-red-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-red-600/20 transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Auto-Clip This Video</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => handleCopyLink(vid.url, vid.video_id)}
                  className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
                  title="Copy Video Link"
                >
                  {copiedId === vid.video_id ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>

                <a
                  href={vid.url}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-all"
                  title="Watch on YouTube"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ))}
        </div>
      ) : isSearching ? (
        <div className="h-64 flex flex-col items-center justify-center space-y-3 text-slate-400 text-xs">
          <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span>Searching YouTube via official API...</span>
        </div>
      ) : (
        <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-xs italic">
          Enter keywords above to search YouTube videos.
        </div>
      )}

      {/* Embedded Video Preview Modal */}
      {previewVideoId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-4xl rounded-2xl border border-slate-800 overflow-hidden shadow-2xl animate-scaleIn">
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <h3 className="font-display font-bold text-sm text-white flex items-center gap-2">
                <Play className="w-4 h-4 text-red-500" />
                <span>Video Preview</span>
              </h3>
              <button
                onClick={() => setPreviewVideoId(null)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="aspect-video w-full bg-black">
              <iframe
                src={`https://www.youtube.com/embed/${previewVideoId}?autoplay=1`}
                title="YouTube Preview"
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <div className="p-4 bg-slate-950 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  const url = `https://www.youtube.com/watch?v=${previewVideoId}`;
                  setPreviewVideoId(null);
                  onSelectVideoToClip(url);
                }}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-indigo-600 text-white text-xs font-bold shadow-md cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Use This Video to Generate Viral Clips</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
