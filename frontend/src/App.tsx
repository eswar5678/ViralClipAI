import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar, TabType } from './components/Sidebar';
import { ImportSection } from './components/ImportSection';
import { ProgressTracker } from './components/ProgressTracker';
import { ClipsStudio } from './components/ClipsStudio';
import { VideoPlayerPreview } from './components/VideoPlayerPreview';
import { SubtitleCustomizer } from './components/SubtitleCustomizer';
import { YouTubePublisherModal } from './components/YouTubePublisherModal';
import { YouTubeQueue } from './components/YouTubeQueue';
import { SettingsModal } from './components/SettingsModal';
import { ChannelScanner } from './components/ChannelScanner';
import { AIGrowthTools } from './components/AIGrowthTools';
import { YouTubeSearch } from './components/YouTubeSearch';
import { AIChatModal } from './components/AIChatModal';
import { AutoPilotModal } from './components/AutoPilotModal';

import { api } from './api';
import {
  VideoMetadata,
  ClipSuggestion,
  SystemStatus,
  AppSettings,
  YouTubeQueueItem,
  WSProgressMessage,
  YouTubeUploadRequest,
  StyleSegment,
  SubtitleSentence,
} from './types';
import { ArrowLeft, Play, CheckCircle2, Sparkles, Scissors, Film, Video, Search, Globe, Bot } from 'lucide-react';
import { YouTubeIcon } from './components/YouTubeIcon';

export const App: React.FC = () => {
  // Navigation & Modal States
  const [currentTab, setCurrentTab] = useState<TabType>('import');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isYouTubeModalOpen, setIsYouTubeModalOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isAutoPilotOpen, setIsAutoPilotOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // App Data States
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [channelInfo, setChannelInfo] = useState<any>(null);
  const [settings, setSettings] = useState<AppSettings>({});
  const [importedVideo, setImportedVideo] = useState<VideoMetadata | null>(null);
  const [clips, setClips] = useState<ClipSuggestion[]>([]);
  const [selectedClip, setSelectedClip] = useState<ClipSuggestion | null>(null);
  const [youtubeQueue, setYoutubeQueue] = useState<YouTubeQueueItem[]>([]);

  // Pipeline Execution States
  const [isImporting, setIsImporting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMsg, setProgressMsg] = useState<WSProgressMessage | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [renderingClipId, setRenderingClipId] = useState<string | null>(null);

  // Subtitle Customizer States (Hormozi defaults)
  const [subtitlePreset, setSubtitlePreset] = useState('hormozi');
  const [layoutPreset, setLayoutPreset] = useState('active_speaker');
  const [fontFamily, setFontFamily] = useState('Montserrat ExtraBold');
  const [fontSize, setFontSize] = useState(24);
  const [primaryColor, setPrimaryColor] = useState('#FFFFFF');
  const [highlightColor, setHighlightColor] = useState('#FFD700');
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [showEmojis, setShowEmojis] = useState(true);

  // Fetch initial state & connect WebSocket
  useEffect(() => {
    loadSystemStatus();
    loadSettings();
    loadQueue();
    loadChannelInfo();

    // WebSocket connection for live progress broadcasting
    const ws = api.createWebSocket((msg) => {
      setProgressMsg(msg);
      setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg.message}`, ...prev.slice(0, 50)]);

      if (msg.stage === 'clipping' && msg.percent >= 100 && msg.details?.video_id) {
        setIsProcessing(false);
        api.getClips(msg.details.video_id).then((fetched) => {
          setClips(fetched);
          if (fetched.length > 0 && !selectedClip) {
            setSelectedClip(fetched[0]);
          }
        });
      }
    });

    return () => ws.close();
  }, []);

  const loadSystemStatus = async () => {
    try {
      const status = await api.getSystemStatus();
      setSystemStatus(status);
    } catch (e) {
      console.error('Failed to load system status', e);
    }
  };

  const loadChannelInfo = async () => {
    try {
      const ch = await api.getYouTubeChannelInfo();
      setChannelInfo(ch);
    } catch (e) {
      console.error('Failed to load channel info', e);
    }
  };

  const loadSettings = async () => {
    try {
      const s = await api.getSettings();
      setSettings(s);
    } catch (e) {
      console.error('Failed to load settings', e);
    }
  };

  const loadQueue = async () => {
    try {
      const q = await api.getYouTubeQueue();
      setYoutubeQueue(q);
    } catch (e) {
      console.error('Failed to load queue', e);
    }
  };

  const loadClips = async (videoId: string) => {
    try {
      const fetched = await api.getClips(videoId);
      setClips(fetched);
      if (fetched.length > 0 && !selectedClip) {
        setSelectedClip(fetched[0]);
      }
    } catch (e) {
      console.error('Failed to load clips', e);
    }
  };

  const handleSaveSettings = async (newSettings: AppSettings) => {
    await api.updateSettings(newSettings);
    setSettings(newSettings);
    await loadSystemStatus();
    await loadChannelInfo();
  };

  // Video Import Handlers
  const handleImportLocalFile = async (file: File): Promise<VideoMetadata> => {
    setIsImporting(true);
    try {
      const meta = await api.importVideoFile(file);
      setImportedVideo(meta);
      return meta;
    } finally {
      setIsImporting(false);
    }
  };

  const handleImportYouTube = async (url: string): Promise<VideoMetadata> => {
    setIsImporting(true);
    try {
      const meta = await api.importYouTubeVideo(url);
      setImportedVideo(meta);
      return meta;
    } finally {
      setIsImporting(false);
    }
  };

  // Start AI Processing Pipeline
  const handleStartProcessing = async (params: any) => {
    setIsProcessing(true);
    setCurrentTab('progress');
    setLogs([`[${new Date().toLocaleTimeString()}] Starting AI analysis pipeline...`]);
    try {
      if (params.source_type === 'youtube_url' && params.url_or_path.startsWith('http')) {
        setLogs((prev) => [`[${new Date().toLocaleTimeString()}] Fetching and downloading video from YouTube...`, ...prev]);
        const meta = await api.importYouTubeVideo(params.url_or_path);
        setImportedVideo(meta);
        params.url_or_path = meta.file_path;
      }
      await api.processVideo(params);
    } catch (err: any) {
      setIsProcessing(false);
      setLogs((prev) => [`[${new Date().toLocaleTimeString()}] Error: ${err.message}`, ...prev]);
    }
  };

  // Clip Action Handlers
  const handlePreviewClip = (clip: ClipSuggestion) => {
    setSelectedClip(clip);
    setCurrentTab('editor');
  };

  const handleEditClip = (clip: ClipSuggestion) => {
    setSelectedClip(clip);
    setCurrentTab('editor');
  };

  const [isTranslatingSubtitles, setIsTranslatingSubtitles] = useState(false);
  const [isEnhancingSubtitles, setIsEnhancingSubtitles] = useState(false);

  const handlePostYouTube = (clip: ClipSuggestion) => {
    setSelectedClip(clip);
    setIsYouTubeModalOpen(true);
  };

  const handleTranslateSubtitles = async () => {
    if (!selectedClip || !selectedClip.transcript_sentences) return;
    setIsTranslatingSubtitles(true);
    try {
      const translated = await api.translateSubtitles(selectedClip.transcript_sentences);
      const updatedSentences = translated as SubtitleSentence[];
      
      setSelectedClip((prev) => prev ? { ...prev, transcript_sentences: updatedSentences } : null);
      setClips((prev) => prev.map((c) => c.clip_id === selectedClip.clip_id ? { ...c, transcript_sentences: updatedSentences } : c));
      
      await api.updateClipSubtitles(selectedClip.clip_id, {
        transcript_sentences: updatedSentences,
        style_segments: selectedClip.style_segments,
      });
    } catch (err: any) {
      alert(`Translation error: ${err.message}`);
    } finally {
      setIsTranslatingSubtitles(false);
    }
  };

  const handleEnhanceSubtitles = async () => {
    if (!selectedClip || !selectedClip.transcript_sentences) return;
    setIsEnhancingSubtitles(true);
    try {
      const enhanced = await api.enhanceSubtitles(selectedClip.transcript_sentences);
      const updatedSentences = enhanced as SubtitleSentence[];
      setSelectedClip((prev) => prev ? { ...prev, transcript_sentences: updatedSentences } : null);
      setClips((prev) => prev.map((c) => c.clip_id === selectedClip.clip_id ? { ...c, transcript_sentences: updatedSentences } : c));
      await api.updateClipSubtitles(selectedClip.clip_id, {
        transcript_sentences: updatedSentences,
        style_segments: selectedClip.style_segments,
      });
    } catch (err: any) {
      alert(`Enhance error: ${err.message}`);
    } finally {
      setIsEnhancingSubtitles(false);
    }
  };

  const handleStyleSegmentsChange = (segments: StyleSegment[]) => {
    if (!selectedClip) return;
    setSelectedClip((prev) => prev ? { ...prev, style_segments: segments } : null);
    setClips((prev) => prev.map((c) => c.clip_id === selectedClip.clip_id ? { ...c, style_segments: segments } : c));
    api.updateClipSubtitles(selectedClip.clip_id, {
      transcript_sentences: selectedClip.transcript_sentences,
      style_segments: segments,
    }).catch(() => {});
  };

  const handleSentencesChange = (sentences: SubtitleSentence[]) => {
    if (!selectedClip) return;
    setSelectedClip((prev) => prev ? { ...prev, transcript_sentences: sentences } : null);
    setClips((prev) => prev.map((c) => c.clip_id === selectedClip.clip_id ? { ...c, transcript_sentences: sentences } : c));
    api.updateClipSubtitles(selectedClip.clip_id, {
      transcript_sentences: sentences,
      style_segments: selectedClip.style_segments,
    }).catch(() => {});
  };

  const handleRenderClip = async (clip: ClipSuggestion) => {
    setRenderingClipId(clip.clip_id);
    try {
      const res = await api.renderClip({
        clip_id: clip.clip_id,
        layout_type: layoutPreset,
        subtitle_style: subtitlePreset,
        font_family: fontFamily,
        font_size: fontSize,
        primary_color: primaryColor,
        highlight_color: highlightColor,
        stroke_color: strokeColor,
        stroke_width: strokeWidth,
        show_emojis: showEmojis,
        style_segments: clip.style_segments || [],
        transcript_sentences: clip.transcript_sentences || [],
      });

      // Update clip status
      setClips((prev) =>
        prev.map((c) =>
          c.clip_id === clip.clip_id
            ? { ...c, status: 'rendered', rendered_path: res.preview_url }
            : c
        )
      );
      if (selectedClip?.clip_id === clip.clip_id) {
        setSelectedClip((prev) =>
          prev ? { ...prev, status: 'rendered', rendered_path: res.preview_url } : null
        );
      }
    } catch (err: any) {
      alert(`Render error: ${err.message}`);
    } finally {
      setRenderingClipId(null);
    }
  };

  const handleBatchRenderAll = async () => {
    for (const c of clips) {
      if (c.status !== 'rendered') {
        await handleRenderClip(c);
      }
    }
  };

  const handleUploadToYouTube = async (req: YouTubeUploadRequest) => {
    const res = await api.uploadToYouTube(req);
    await loadQueue();
    return res;
  };

  const handleDeleteQueueItem = async (id: string) => {
    await api.deleteQueueItem(id);
    await loadQueue();
  };

  const handleNewProject = () => {
    setImportedVideo(null);
    setClips([]);
    setSelectedClip(null);
    setCurrentTab('import');
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#07090E] text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* Top Header */}
      <Header
        systemStatus={systemStatus}
        channelInfo={channelInfo}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenChat={() => setIsChatOpen(true)}
        onOpenAutoPilot={() => setIsAutoPilotOpen(true)}
        onRefreshStatus={loadSystemStatus}
        onNewProject={handleNewProject}
        onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
        isMobileMenuOpen={isMobileMenuOpen}
      />

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Navigation */}
        <Sidebar
          currentTab={currentTab}
          onTabChange={setCurrentTab}
          clipsCount={clips.length}
          queueCount={youtubeQueue.length}
          isProcessing={isProcessing}
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
          onOpenAutoPilot={() => setIsAutoPilotOpen(true)}
        />

        {/* Content View Area */}
        <main className="flex-1 overflow-y-auto bg-gradient-to-b from-[#0B0F17] via-[#07090E] to-[#07090E] pb-24 md:pb-6">
          {/* TAB 1: Import & Setup */}
          {currentTab === 'import' && (
            <ImportSection
              onStartProcessing={handleStartProcessing}
              onImportLocalFile={handleImportLocalFile}
              onImportYouTube={handleImportYouTube}
              importedVideo={importedVideo}
              isImporting={isImporting}
            />
          )}

          {/* TAB: Search YouTube */}
          {currentTab === 'youtube_search' && (
            <YouTubeSearch
              onSelectVideoToClip={(videoUrl) => {
                handleStartProcessing({
                  source_type: 'youtube_url',
                  url_or_path: videoUrl,
                  clip_count: 5,
                  min_duration: 15,
                  max_duration: 60,
                  subtitle_preset: subtitlePreset,
                  layout_preset: layoutPreset,
                });
              }}
              isProcessing={isProcessing}
            />
          )}

          {/* TAB: Channel Auto-Clipper */}
          {currentTab === 'channel_scan' && (
            <ChannelScanner
              onSelectVideoToClip={(videoUrl) => {
                handleStartProcessing({
                  source_type: 'youtube_url',
                  url_or_path: videoUrl,
                  clip_count: 5,
                  min_duration: 15,
                  max_duration: 60,
                  subtitle_preset: subtitlePreset,
                  layout_preset: layoutPreset,
                });
              }}
              isProcessing={isProcessing}
            />
          )}

          {/* TAB: AI Growth & SEO Studio */}
          {currentTab === 'ai_tools' && (
            <AIGrowthTools
              currentVideoTitle={
                selectedClip?.headline ||
                importedVideo?.title ||
                'Top Productivity Hacks & Mindset Shift'
              }
            />
          )}

          {/* TAB 2: Processing Progress */}
          {currentTab === 'progress' && (
            <ProgressTracker
              progress={progressMsg}
              logs={logs}
              onViewClips={() => setCurrentTab('clips')}
            />
          )}

          {/* TAB 3: Clips Gallery Studio */}
          {currentTab === 'clips' && (
            <ClipsStudio
              clips={clips}
              videoMeta={importedVideo}
              onPreviewClip={handlePreviewClip}
              onEditClip={handleEditClip}
              onPostYouTube={handlePostYouTube}
              onRenderClip={handleRenderClip}
              renderingClipId={renderingClipId}
              onBatchRenderAll={handleBatchRenderAll}
            />
          )}

          {/* TAB 4: Studio Editor & Subtitles */}
          {currentTab === 'editor' && (
            <div className="max-w-7xl mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <button
                  onClick={() => setCurrentTab('clips')}
                  className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer py-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Clips Gallery</span>
                </button>

                {selectedClip && (
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <button
                      onClick={handleTranslateSubtitles}
                      disabled={isTranslatingSubtitles}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-cyan-500/40 hover:border-cyan-500 text-cyan-300 text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-50"
                      title="Translate captions from other languages into English"
                    >
                      {isTranslatingSubtitles ? (
                        <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Globe className="w-4 h-4 text-cyan-400" />
                      )}
                      <span>Translate to English</span>
                    </button>

                    <button
                      onClick={() => handleRenderClip(selectedClip)}
                      disabled={renderingClipId === selectedClip.clip_id}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
                    >
                      {renderingClipId === selectedClip.clip_id ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                      <span>Render 9:16</span>
                    </button>

                    <button
                      onClick={() => handlePostYouTube(selectedClip)}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-600/25 transition-all cursor-pointer glow-youtube"
                    >
                      <YouTubeIcon className="w-4 h-4 text-white" />
                      <span>Post to YouTube</span>
                    </button>
                  </div>
                )}
              </div>

              {selectedClip ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  {/* Left Column: 9:16 Interactive Video Player Preview */}
                  <div className="lg:col-span-5 flex justify-center">
                    <VideoPlayerPreview
                      clip={selectedClip}
                      videoMeta={importedVideo}
                      subtitlePreset={subtitlePreset}
                      layoutPreset={layoutPreset}
                      fontFamily={fontFamily}
                      fontSize={fontSize}
                      primaryColor={primaryColor}
                      highlightColor={highlightColor}
                      showEmojis={showEmojis}
                      styleSegments={selectedClip.style_segments || []}
                    />
                  </div>

                  {/* Right Column: Styling & Layout Controls */}
                  <div className="lg:col-span-7 space-y-6">
                    {/* Clip Info Card */}
                    <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs uppercase font-extrabold text-amber-400 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Virality Score: {selectedClip.virality.overall_score}/100</span>
                        </span>
                        <span className="text-xs font-mono text-slate-400">
                          {selectedClip.start_time}s - {selectedClip.end_time}s ({Math.round(selectedClip.duration)}s)
                        </span>
                      </div>
                      <h3 className="font-display font-bold text-lg text-white">
                        {selectedClip.headline}
                      </h3>
                      <p className="text-xs text-slate-300 italic">
                        "{selectedClip.hook_sentence}"
                      </p>
                    </div>

                    {/* Subtitle Customizer */}
                    <SubtitleCustomizer
                      subtitlePreset={subtitlePreset}
                      onPresetChange={setSubtitlePreset}
                      fontFamily={fontFamily}
                      onFontFamilyChange={setFontFamily}
                      fontSize={fontSize}
                      onFontSizeChange={setFontSize}
                      primaryColor={primaryColor}
                      onPrimaryColorChange={setPrimaryColor}
                      highlightColor={highlightColor}
                      onHighlightColorChange={setHighlightColor}
                      strokeColor={strokeColor}
                      onStrokeColorChange={setStrokeColor}
                      strokeWidth={strokeWidth}
                      onStrokeWidthChange={setStrokeWidth}
                      showEmojis={showEmojis}
                      onShowEmojisChange={setShowEmojis}
                      clipDuration={selectedClip.duration || (selectedClip.end_time - selectedClip.start_time)}
                      styleSegments={selectedClip.style_segments || []}
                      onStyleSegmentsChange={handleStyleSegmentsChange}
                      sentences={selectedClip.transcript_sentences || []}
                      onSentencesChange={handleSentencesChange}
                      onTranslateToEnglish={handleTranslateSubtitles}
                      isTranslating={isTranslatingSubtitles}
                      onEnhanceSubtitles={handleEnhanceSubtitles}
                      isEnhancing={isEnhancingSubtitles}
                    />
                  </div>
                </div>
              ) : (
                <div className="text-center p-12 text-slate-400">
                  Select a clip from the gallery to preview and customize.
                </div>
              )}
            </div>
          )}

          {/* TAB 5: YouTube Publisher Queue */}
          {currentTab === 'queue' && (
            <YouTubeQueue
              queue={youtubeQueue}
              onRefresh={loadQueue}
              onDelete={handleDeleteQueueItem}
            />
          )}

          {/* TAB 6: Settings */}
          {currentTab === 'settings' && (
            <div className="max-w-3xl mx-auto p-6">
              <div className="glass-panel rounded-2xl p-6 border border-slate-800">
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm"
                >
                  Open Full Settings Window
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0B0F17]/95 backdrop-blur-xl border-t border-slate-800/80 px-2 py-1.5 flex items-center justify-around pb-safe shadow-2xl">
        <button
          onClick={() => setCurrentTab('import')}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl text-[10px] font-semibold transition-all cursor-pointer ${
            currentTab === 'import' ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className={`p-1 rounded-lg ${currentTab === 'import' ? 'bg-indigo-600/20' : ''}`}>
            <Video className="w-4 h-4" />
          </div>
          <span>Import</span>
        </button>

        <button
          onClick={() => setCurrentTab('youtube_search')}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl text-[10px] font-semibold transition-all cursor-pointer ${
            currentTab === 'youtube_search' || currentTab === 'channel_scan' ? 'text-red-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className={`p-1 rounded-lg ${currentTab === 'youtube_search' || currentTab === 'channel_scan' ? 'bg-red-600/20' : ''}`}>
            <Search className="w-4 h-4" />
          </div>
          <span>Search</span>
        </button>

        <button
          onClick={() => setCurrentTab('clips')}
          className={`relative flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl text-[10px] font-semibold transition-all cursor-pointer ${
            currentTab === 'clips' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className={`p-1 rounded-lg ${currentTab === 'clips' ? 'bg-emerald-600/20' : ''}`}>
            <Scissors className="w-4 h-4" />
          </div>
          <span>Clips</span>
          {clips.length > 0 && (
            <span className="absolute top-0 right-1 w-4 h-4 rounded-full bg-emerald-500 text-slate-950 font-black text-[9px] flex items-center justify-center">
              {clips.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setCurrentTab('editor')}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl text-[10px] font-semibold transition-all cursor-pointer ${
            currentTab === 'editor' ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className={`p-1 rounded-lg ${currentTab === 'editor' ? 'bg-indigo-600/20' : ''}`}>
            <Film className="w-4 h-4" />
          </div>
          <span>Studio</span>
        </button>

        <button
          onClick={() => setCurrentTab('queue')}
          className={`relative flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl text-[10px] font-semibold transition-all cursor-pointer ${
            currentTab === 'queue' ? 'text-red-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className={`p-1 rounded-lg ${currentTab === 'queue' ? 'bg-red-600/20' : ''}`}>
            <YouTubeIcon className="w-4 h-4" />
          </div>
          <span>Queue</span>
          {youtubeQueue.length > 0 && (
            <span className="absolute top-0 right-1 w-4 h-4 rounded-full bg-red-500 text-white font-black text-[9px] flex items-center justify-center">
              {youtubeQueue.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setIsAutoPilotOpen(true)}
          className="flex flex-col items-center gap-1 py-1 px-2 rounded-xl text-[10px] font-semibold text-cyan-400 hover:text-cyan-300 cursor-pointer"
        >
          <div className="p-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
            <Bot className="w-4 h-4 text-cyan-300 animate-pulse" />
          </div>
          <span>Auto-Pilot</span>
        </button>

        <button
          onClick={() => setIsChatOpen(true)}
          className="flex flex-col items-center gap-1 py-1 px-2 rounded-xl text-[10px] font-semibold text-purple-400 hover:text-purple-300 cursor-pointer"
        >
          <div className="p-1 rounded-lg bg-purple-500/10 border border-purple-500/20">
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
          </div>
          <span>AI Bot</span>
        </button>

        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="flex flex-col items-center gap-1 py-1 px-2 rounded-xl text-[10px] font-semibold text-slate-400 hover:text-slate-200 cursor-pointer"
        >
          <div className="p-1 rounded-lg">
            <Sparkles className="w-4 h-4 text-indigo-400" />
          </div>
          <span>More</span>
        </button>
      </nav>

      {/* YouTube Publisher Modal */}
      <YouTubePublisherModal
        clip={selectedClip}
        isOpen={isYouTubeModalOpen}
        onClose={() => setIsYouTubeModalOpen(false)}
        onUpload={handleUploadToYouTube}
        isAuthenticated={Boolean(channelInfo?.authenticated || systemStatus?.youtube_authenticated || settings?.youtube_authenticated)}
        channelName={channelInfo?.title || systemStatus?.youtube_channel_name || settings?.youtube_channel_name}
        onOpenSettings={() => {
          setIsYouTubeModalOpen(false);
          setIsSettingsOpen(true);
        }}
        onConnectDirectly={async () => {
          await api.connectYouTube();
          await loadChannelInfo();
          await loadSystemStatus();
        }}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={handleSaveSettings}
        channelInfo={channelInfo}
        onRefreshChannel={loadChannelInfo}
      />

      {/* Floating AI Studio Agent Button */}
      <button
        onClick={() => setIsChatOpen(true)}
        className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-30 flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-bold text-xs sm:text-sm shadow-xl shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-105 active:scale-95 transition-all cursor-pointer border border-white/20"
        title="Open AI Studio Agent"
      >
        <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
        <span className="hidden xs:inline sm:inline">AI Studio Agent</span>
      </button>

      {/* AI Studio Assistant Modal */}
      <AIChatModal
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        activeVideo={importedVideo}
        activeClip={selectedClip}
        onClipCreated={() => {
          if (importedVideo) {
            loadClips(importedVideo.video_id);
          }
          loadQueue();
        }}
      />

      {/* 24/7 GTA Auto-Pilot Agent Modal */}
      <AutoPilotModal
        isOpen={isAutoPilotOpen}
        onClose={() => setIsAutoPilotOpen(false)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />
    </div>
  );
};
