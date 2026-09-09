import React, { useState } from 'react';
import { Search, Play, Sparkles, ExternalLink, Flame, Eye, Clock, Calendar, CheckCircle2, ArrowRight } from 'lucide-react';
import { YouTubeIcon } from './YouTubeIcon';
import { ChannelScanResult, ChannelVideoItem } from '../types';
import { api } from '../api';

interface ChannelScannerProps {
  onSelectVideoToClip: (videoUrl: string) => void;
  isProcessing?: boolean;
}

export const ChannelScanner: React.FC<ChannelScannerProps> = ({
  onSelectVideoToClip,
  isProcessing,
}) => {
  const [channelInput, setChannelInput] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ChannelScanResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const presets = [
    { name: 'Huberman Lab', handle: '@hubermanlab' },
    { name: 'Alex Hormozi', handle: '@AlexHormozi' },
    { name: 'Lex Fridman', handle: '@lexfridman' },
    { name: 'MrBeast', handle: '@MrBeast' },
    { name: 'Ali Abdaal', handle: '@aliabdaal' },
  ];

  const handleScan = async (urlOrHandle?: string) => {
    const target = urlOrHandle || channelInput;
    if (!target.trim()) return;

    setIsScanning(true);
    setErrorMsg(null);
    try {
      const res = await api.scanChannel(target.trim(), 12);
      setScanResult(res);
      setChannelInput(target.trim());
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to scan channel. Please verify handle or URL.');
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 p-3 sm:p-6">
      {/* Top Banner */}
      <div className="glass-panel rounded-2xl p-4 sm:p-6 border border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-3.5">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-red-600/20 border border-red-500/30 flex items-center justify-center shrink-0">
              <YouTubeIcon className="w-5 h-5 sm:w-6 sm:h-6 text-red-500" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] font-extrabold uppercase tracking-wider">
                Channel Spy & Auto-Clipper
              </div>
              <h2 className="font-display text-lg sm:text-xl font-bold text-white mt-1">
                Scan Any YouTube Channel & Clip Latest Videos
              </h2>
            </div>
          </div>

          {/* Preset Quick Chips */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            <span className="text-[11px] sm:text-xs text-slate-400 shrink-0">Popular:</span>
            {presets.map((p) => (
              <button
                key={p.handle}
                onClick={() => handleScan(p.handle)}
                className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-semibold whitespace-nowrap transition-all cursor-pointer"
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={channelInput}
              onChange={(e) => setChannelInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleScan()}
              placeholder="Enter YouTube Channel URL or Handle (e.g. @hubermanlab or https://www.youtube.com/@AlexHormozi)"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-11 pr-4 py-3 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
            />
          </div>
          <button
            onClick={() => handleScan()}
            disabled={isScanning || !channelInput.trim()}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-red-600/30 transition-all cursor-pointer glow-youtube shrink-0"
          >
            {isScanning ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            <span>Scan Latest Videos</span>
          </button>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/40 text-xs text-red-300">
            {errorMsg}
          </div>
        )}
      </div>

      {/* Channel Header Banner (If scanned) */}
      {scanResult && (
        <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 sm:gap-4">
            <img
              src={scanResult.avatar_url}
              alt="Channel Avatar"
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl border border-red-500/40 object-cover shadow-md shrink-0"
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-display text-base sm:text-lg font-bold text-white truncate">
                  {scanResult.channel_title}
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Verified</span>
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[11px] sm:text-xs text-slate-400 mt-0.5">
                <span>{scanResult.videos.length} Videos Ready</span>
                <span>•</span>
                <a
                  href={scanResult.channel_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-400 hover:underline flex items-center gap-1"
                >
                  <span>Open Channel</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Videos Grid */}
      {scanResult && scanResult.videos.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Latest Channel Uploads (Select to Auto-Clip)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {scanResult.videos.map((vid) => (
              <div
                key={vid.video_id}
                className="glass-card rounded-2xl p-4 border flex flex-col justify-between space-y-4 group"
              >
                {/* Thumbnail Box */}
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
                </div>

                {/* Video Info */}
                <div className="space-y-1.5 flex-1">
                  <h4 className="font-display font-bold text-sm text-white line-clamp-2 group-hover:text-indigo-300 transition-colors">
                    {vid.title}
                  </h4>
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
                </div>

                {/* 1-Click Clip CTA Button */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2">
                  <button
                    onClick={() => onSelectVideoToClip(vid.url)}
                    disabled={isProcessing}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Auto-Clip This Video</span>
                    <ArrowRight className="w-3.5 h-3.5" />
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
        </div>
      )}
    </div>
  );
};
