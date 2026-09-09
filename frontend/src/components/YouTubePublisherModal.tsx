import React, { useState } from 'react';
import { X, Sparkles, Calendar, Globe, Lock, EyeOff, Hash, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { YouTubeIcon } from './YouTubeIcon';
import { ClipSuggestion, YouTubeUploadRequest } from '../types';

interface YouTubePublisherModalProps {
  clip: ClipSuggestion | null;
  isOpen: boolean;
  onClose: () => void;
  onUpload: (req: YouTubeUploadRequest) => Promise<any>;
  isAuthenticated: boolean;
  channelName?: string;
  onOpenSettings: () => void;
  onConnectDirectly?: () => Promise<void>;
}

export const YouTubePublisherModal: React.FC<YouTubePublisherModalProps> = ({
  clip,
  isOpen,
  onClose,
  onUpload,
  isAuthenticated,
  channelName,
  onOpenSettings,
  onConnectDirectly,
}) => {
  if (!isOpen || !clip) return null;

  const [selectedTitle, setSelectedTitle] = useState(
    clip.suggested_titles && clip.suggested_titles.length > 0
      ? clip.suggested_titles[0]
      : `${clip.headline} #Shorts`
  );
  const [description, setDescription] = useState(
    clip.description ||
      `Watch this powerful viral insight! Like and subscribe for daily videos.\n\n${clip.hashtags.join(' ')}`
  );
  const [privacy, setPrivacy] = useState<'public' | 'unlisted' | 'private'>('public');
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduleDateTime, setScheduleDateTime] = useState('');
  const [tags, setTags] = useState<string[]>(clip.hashtags || ['#Shorts', '#Viral', '#Trending']);
  const [newTagInput, setNewTagInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAddTag = () => {
    if (newTagInput.trim()) {
      let t = newTagInput.trim();
      if (!t.startsWith('#')) t = '#' + t;
      if (!tags.includes(t)) {
        setTags([...tags, t]);
      }
      setNewTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleSubmit = async () => {
    setIsUploading(true);
    setErrorMsg(null);
    try {
      const res = await onUpload({
        clip_id: clip.clip_id,
        title: selectedTitle,
        description,
        tags,
        privacy_status: privacy,
        is_short: true,
        schedule_time: isScheduled && scheduleDateTime ? new Date(scheduleDateTime).toISOString() : undefined,
        made_for_kids: false,
      });
      setUploadResult(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to upload to YouTube');
    } finally {
      setIsUploading(false);
    }
  };

  const [isConnecting, setIsConnecting] = useState(false);

  const handleDirectConnect = async () => {
    if (onConnectDirectly) {
      setIsConnecting(true);
      try {
        await onConnectDirectly();
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to connect YouTube');
      } finally {
        setIsConnecting(false);
      }
    } else {
      onOpenSettings();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="glass-panel w-full max-w-2xl rounded-2xl border border-slate-800 p-4 sm:p-6 space-y-5 sm:space-y-6 relative shadow-2xl animate-scaleIn max-h-[92dvh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-red-600/20 border border-red-500/30 flex items-center justify-center">
            <YouTubeIcon className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <h3 className="font-display text-xl font-bold text-white">
              Auto-Post to YouTube Shorts
            </h3>
            <p className="text-xs text-slate-400">
              One-click publish or schedule via official YouTube Data API v3
            </p>
          </div>
        </div>

        {/* Auth Channel Banner */}
        {!isAuthenticated ? (
          <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-amber-300">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>YouTube account not connected. Please authorize your channel to publish.</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDirectConnect}
                disabled={isConnecting}
                className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 shadow-md shadow-red-600/30"
              >
                {isConnecting ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <YouTubeIcon className="w-3.5 h-3.5 text-white" />
                )}
                <span>{isConnecting ? 'Authorizing...' : 'Connect Channel'}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <span className="text-slate-400">Posting to Channel:</span>
              <span className="font-bold text-white">{channelName || 'Authenticated Channel'}</span>
            </div>
            <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>OAuth Token Active</span>
            </span>
          </div>
        )}

        {/* Success State */}
        {uploadResult ? (
          <div className="p-6 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle className="w-8 h-8" />
            </div>
            <div>
              <h4 className="font-display text-lg font-bold text-white">
                {uploadResult.status === 'scheduled' ? 'Scheduled Successfully! ⏰' : 'Published Live to YouTube! 🚀'}
              </h4>
              <p className="text-xs text-slate-300 mt-1">
                {uploadResult.title}
              </p>
            </div>
            {uploadResult.youtube_url && (
              <a
                href={uploadResult.youtube_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/25 transition-all"
              >
                <span>View on YouTube Shorts</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            <div className="pt-2">
              <button
                onClick={onClose}
                className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
              >
                Close Window
              </button>
            </div>
          </div>
        ) : (
          /* Upload Form */
          <div className="space-y-5">
            {/* AI Suggested Titles */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-300">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>AI-Generated High-CTR Titles</span>
              </div>
              <div className="space-y-2">
                {clip.suggested_titles.map((t, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedTitle(t)}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                      selectedTitle === t
                        ? 'bg-indigo-600/20 border-indigo-500 text-white font-semibold shadow-sm'
                        : 'bg-slate-900/50 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <span>{t}</span>
                    {selectedTitle === t && <CheckCircle className="w-4 h-4 text-indigo-400 shrink-0" />}
                  </div>
                ))}
              </div>
              <input
                type="text"
                value={selectedTitle}
                onChange={(e) => setSelectedTitle(e.target.value)}
                placeholder="Or type custom title..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* SEO Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                SEO Description & Timestamps
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 leading-relaxed font-sans"
              />
            </div>

            {/* Trending Hashtags */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-indigo-400" />
                <span>Viral Hashtags</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <span
                    key={t}
                    onClick={() => handleRemoveTag(t)}
                    className="px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold cursor-pointer hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 transition-all"
                    title="Click to remove"
                  >
                    {t} ×
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                  placeholder="Add hashtag (e.g. #Podcasts)"
                  className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-semibold cursor-pointer"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Privacy & Scheduling Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800/80">
              {/* Privacy Dropdown */}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400">Visibility</label>
                <select
                  value={privacy}
                  onChange={(e) => setPrivacy(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="public">🌐 Public (Instant Viral Exposure)</option>
                  <option value="unlisted">🔗 Unlisted (Only via Link)</option>
                  <option value="private">🔒 Private (Review Draft)</option>
                </select>
              </div>

              {/* Schedule Toggle */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-slate-400">Schedule Publish Time</label>
                  <input
                    type="checkbox"
                    checked={isScheduled}
                    onChange={(e) => setIsScheduled(e.target.checked)}
                    className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
                  />
                </div>
                {isScheduled && (
                  <input
                    type="datetime-local"
                    value={scheduleDateTime}
                    onChange={(e) => setScheduleDateTime(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                )}
              </div>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/40 text-xs text-red-300">
                {errorMsg}
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-4 flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isUploading || !isAuthenticated}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-red-600/30 transition-all cursor-pointer glow-youtube"
              >
                {isUploading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <YouTubeIcon className="w-4 h-4 text-white" />
                )}
                <span>{isScheduled ? 'Schedule to YouTube' : 'Upload Short Now'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
