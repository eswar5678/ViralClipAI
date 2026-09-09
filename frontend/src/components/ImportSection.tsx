import React, { useState, useRef } from 'react';
import { Upload, Play, Sparkles, Sliders, Type, Layout, Film, Clock, Globe } from 'lucide-react';
import { YouTubeIcon } from './YouTubeIcon';
import { VideoMetadata } from '../types';

interface ImportSectionProps {
  onStartProcessing: (params: {
    source_type: string;
    url_or_path: string;
    clip_count: number;
    min_duration: number;
    max_duration: number;
    subtitle_preset: string;
    layout_preset: string;
    translate_to_english?: boolean;
  }) => void;
  onImportLocalFile: (file: File) => Promise<VideoMetadata>;
  onImportYouTube: (url: string) => Promise<VideoMetadata>;
  importedVideo: VideoMetadata | null;
  isImporting: boolean;
}

export const ImportSection: React.FC<ImportSectionProps> = ({
  onStartProcessing,
  onImportLocalFile,
  onImportYouTube,
  importedVideo,
  isImporting,
}) => {
  const [activeMode, setActiveMode] = useState<'upload' | 'youtube'>('upload');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [clipCount, setClipCount] = useState(5);
  const [minDuration, setMinDuration] = useState(20);
  const [maxDuration, setMaxDuration] = useState(50);
  const [subtitlePreset, setSubtitlePreset] = useState('hormozi');
  const [layoutPreset, setLayoutPreset] = useState('active_speaker');
  const [translateToEnglish, setTranslateToEnglish] = useState(true);
  const [importError, setImportError] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setImportError(null);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      try {
        await onImportLocalFile(e.dataTransfer.files[0]);
      } catch (err: any) {
        setImportError(err.message || 'Failed to upload video');
      }
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    if (e.target.files && e.target.files[0]) {
      try {
        await onImportLocalFile(e.target.files[0]);
      } catch (err: any) {
        setImportError(err.message || 'Failed to upload video');
      }
    }
  };

  const handleFetchYouTube = async () => {
    if (youtubeUrl.trim()) {
      setImportError(null);
      setImportStatus('Fetching video information from YouTube via yt-dlp...');
      try {
        await onImportYouTube(youtubeUrl.trim());
        setImportStatus(null);
      } catch (err: any) {
        setImportStatus(null);
        setImportError(err.message || 'Failed to download YouTube video. Please check URL or video availability.');
      }
    }
  };

  const handleStart = () => {
    if (importedVideo) {
      onStartProcessing({
        source_type: 'local_file',
        url_or_path: importedVideo.file_path,
        clip_count: clipCount,
        min_duration: minDuration,
        max_duration: maxDuration,
        subtitle_preset: subtitlePreset,
        layout_preset: layoutPreset,
        translate_to_english: translateToEnglish,
      });
    } else if (activeMode === 'youtube' && youtubeUrl.trim()) {
      onStartProcessing({
        source_type: 'youtube_url',
        url_or_path: youtubeUrl.trim(),
        clip_count: clipCount,
        min_duration: minDuration,
        max_duration: maxDuration,
        subtitle_preset: subtitlePreset,
        layout_preset: layoutPreset,
        translate_to_english: translateToEnglish,
      });
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8 p-3 sm:p-6">
      {/* Top Banner */}
      <div className="text-center space-y-2 px-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Opus-Style Viral Highlight Detection</span>
        </div>
        <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Turn Long Videos Into Viral YouTube Shorts
        </h2>
        <p className="text-slate-400 text-xs sm:text-sm max-w-xl mx-auto">
          Automatically extract high-retention hooks, auto-frame active speakers to 9:16 vertical, burn in Alex Hormozi karaoke subtitles, and auto-post to YouTube.
        </p>
      </div>

      {/* Ingestion Box */}
      <div className="glass-panel rounded-2xl p-4 sm:p-6 border border-slate-800 space-y-5 sm:space-y-6">
        {/* Switch Tabs */}
        <div className="flex items-center justify-center p-1 bg-slate-900 rounded-xl max-w-sm mx-auto border border-slate-800">
          <button
            onClick={() => setActiveMode('upload')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
              activeMode === 'upload'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Upload File</span>
          </button>
          <button
            onClick={() => setActiveMode('youtube')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
              activeMode === 'youtube'
                ? 'bg-red-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <YouTubeIcon className="w-4 h-4 text-white" />
            <span>YouTube URL</span>
          </button>
        </div>

        {/* Upload Mode */}
        {activeMode === 'upload' && (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-700 hover:border-indigo-500/60 rounded-2xl p-6 sm:p-10 flex flex-col items-center justify-center gap-3 sm:gap-4 cursor-pointer bg-slate-900/40 hover:bg-slate-900/70 transition-all group text-center"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="video/mp4,video/quicktime,video/x-matroska,video/webm"
              className="hidden"
            />
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center group-hover:scale-110 transition-all group-hover:shadow-lg group-hover:shadow-indigo-500/20">
              <Upload className="w-7 h-7 sm:w-8 sm:h-8 text-indigo-400" />
            </div>
            <div className="space-y-1">
              <p className="text-sm sm:text-base font-semibold text-slate-200">
                Drag and drop your video file here, or <span className="text-indigo-400">browse</span>
              </p>
              <p className="text-[11px] sm:text-xs text-slate-400">
                Supports MP4, MOV, MKV, WebM up to 4K resolution
              </p>
            </div>
          </div>
        )}

        {/* YouTube Mode */}
        {activeMode === 'youtube' && (
          <div className="p-4 sm:p-6 bg-slate-900/50 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <YouTubeIcon className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-red-500" />
                <input
                  type="text"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="Paste YouTube video or podcast URL (e.g. https://www.youtube.com/watch?v=...)"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-11 pr-4 py-3 text-xs sm:text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <button
                onClick={handleFetchYouTube}
                disabled={!youtubeUrl.trim() || isImporting}
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs sm:text-sm font-semibold transition-all shrink-0 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isImporting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                <span>Import Video</span>
              </button>
            </div>

            {/* Live Progress or Error Messages */}
            {importStatus && (
              <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-xs text-indigo-300 flex items-center gap-2">
                <div className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin shrink-0" />
                <span>{importStatus}</span>
              </div>
            )}
            {importError && (
              <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/40 text-xs text-red-300 flex items-center gap-2">
                <span>⚠️ {importError}</span>
              </div>
            )}
          </div>
        )}

        {/* Imported Video Preview Card */}
        {importedVideo && (
          <div className="p-3 sm:p-4 bg-indigo-950/20 border border-indigo-500/30 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-16 h-10 sm:w-20 sm:h-12 bg-slate-800 rounded-lg overflow-hidden shrink-0 border border-slate-700 relative">
                {importedVideo.thumbnail_url ? (
                  <img src={importedVideo.thumbnail_url} alt="Thumb" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    <Film className="w-5 h-5" />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <h4 className="text-xs sm:text-sm font-semibold text-slate-100 truncate max-w-xs sm:max-w-md">
                  {importedVideo.title}
                </h4>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[10px] sm:text-xs text-slate-400 mt-0.5">
                  <span>{importedVideo.width}x{importedVideo.height}</span>
                  <span>•</span>
                  <span>{Math.round(importedVideo.duration)}s</span>
                  <span>•</span>
                  <span>{importedVideo.fps} fps</span>
                </div>
              </div>
            </div>
            <span className="self-start sm:self-auto text-[11px] sm:text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Ready for AI Clipping
            </span>
          </div>
        )}
      </div>

      {/* Clipping Configuration Parameters */}
      <div className="glass-panel rounded-2xl p-4 sm:p-6 border border-slate-800 space-y-5 sm:space-y-6">
        <div className="flex items-center gap-2 text-slate-200 font-semibold text-sm sm:text-base">
          <Sliders className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" />
          <span>AI Clipper Customization</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Target Clip Count */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Target Clips</span>
              <span className="font-bold text-indigo-400">{clipCount} clips</span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={clipCount}
              onChange={(e) => setClipCount(Number(e.target.value))}
              className="w-full accent-indigo-500"
            />
          </div>

          {/* Clip Duration Range */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Duration Target</span>
              <span className="font-bold text-indigo-400">{minDuration}s - {maxDuration}s</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="range"
                min="15"
                max="90"
                value={maxDuration}
                onChange={(e) => setMaxDuration(Number(e.target.value))}
                className="w-full accent-indigo-500"
              />
            </div>
          </div>

          {/* Subtitle Style Preset */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Type className="w-3.5 h-3.5" />
              <span>Animated Caption Style</span>
            </div>
            <select
              value={subtitlePreset}
              onChange={(e) => setSubtitlePreset(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="hormozi">🔥 Alex Hormozi (Gold Glow)</option>
              <option value="cyber">⚡ Cyber Neon (Cyan Glow)</option>
              <option value="beast">🚀 Beast Mode (Red/Yellow)</option>
              <option value="minimalist">✨ Clean Minimalist (Pill)</option>
            </select>
          </div>

          {/* 9:16 Video Layout */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Layout className="w-3.5 h-3.5" />
              <span>9:16 Vertical Auto-Frame</span>
            </div>
            <select
              value={layoutPreset}
              onChange={(e) => setLayoutPreset(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="active_speaker">👤 Smart Active Speaker</option>
              <option value="blur_background">🖼️ Blur Mirror Background</option>
              <option value="split_screen">👥 Split Screen Podcast</option>
              <option value="fit_center">🔲 Fit & Letterbox</option>
            </select>
          </div>
        </div>

        {/* Translation Toggle Option */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center gap-2.5">
            <Globe className="w-4 h-4 text-cyan-400 shrink-0" />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-200">Convert Foreign Speech to English Captions</span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">Groq Whisper AI</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Translates non-English audio (Hindi, Spanish, French, Japanese, etc.) into high-retention English Shorts captions
              </p>
            </div>
          </div>
          <input
            type="checkbox"
            checked={translateToEnglish}
            onChange={(e) => setTranslateToEnglish(e.target.checked)}
            className="w-4 h-4 rounded accent-indigo-500 cursor-pointer"
          />
        </div>

        {/* Generate Button */}
        <div className="pt-4 border-t border-slate-800/80 flex justify-end">
          <button
            onClick={handleStart}
            disabled={!importedVideo && !(activeMode === 'youtube' && youtubeUrl.trim())}
            className="w-full sm:w-auto flex items-center justify-center gap-3 px-6 sm:px-8 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 disabled:opacity-40 text-white font-bold text-sm sm:text-base shadow-xl shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Sparkles className="w-5 h-5 text-amber-300 animate-spin" />
            <span>Generate Viral Clips Now</span>
          </button>
        </div>
      </div>
    </div>
  );
};
