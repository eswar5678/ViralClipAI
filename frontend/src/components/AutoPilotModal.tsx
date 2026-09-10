import React, { useState, useEffect } from 'react';
import {
  X,
  Bot,
  Play,
  Pause,
  RefreshCw,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  ExternalLink,
  Flame,
  Settings2,
  ThumbsUp,
  MessageSquare,
  Eye,
  Zap,
  ShieldCheck,
  Gamepad2,
  Mail,
  Send,
  Bell,
} from 'lucide-react';
import { YouTubeIcon } from './YouTubeIcon';
import { api } from '../api';
import { AutoPilotConfig, AutoPilotStatusResponse, YouTubeChannelInfo, EmailAlertsConfig } from '../types';

interface AutoPilotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
}

export const AutoPilotModal: React.FC<AutoPilotModalProps> = ({
  isOpen,
  onClose,
  onOpenSettings,
}) => {
  const [loading, setLoading] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusData, setStatusData] = useState<AutoPilotStatusResponse | null>(null);
  const [config, setConfig] = useState<AutoPilotConfig>({
    enabled: true,
    niche: 'Grand Theft Auto (GTA)',
    language: 'English',
    interval_hours: 12.0,
    privacy_status: 'public',
    subtitle_preset: 'hormozi',
    auto_emojis: true,
    max_clip_duration: 55,
    min_clip_duration: 22,
  });
  const [activeTab, setActiveTab] = useState<'status' | 'settings' | 'alerts' | 'learnings' | 'uploads'>('status');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Email Alert & Milestone Settings State
  const [emailAlerts, setEmailAlerts] = useState<EmailAlertsConfig>({
    alert_email: '',
    smtp_enabled: false,
    smtp_host: 'smtp.gmail.com',
    smtp_port: 587,
    smtp_user: '',
    smtp_password: '',
    has_smtp_password: false,
    notify_on_error: true,
    notify_on_milestone: true,
    milestone_view_threshold: 100000,
  });
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [isSavingEmail, setIsSavingEmail] = useState(false);

  const isFormLoadedRef = React.useRef(false);

  useEffect(() => {
    if (isOpen) {
      isFormLoadedRef.current = false;
      fetchStatus(true);
      const interval = setInterval(() => fetchStatus(false), 5000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const fetchStatus = async (isInitial = false) => {
    try {
      const data = await api.getAutoPilotStatus();
      setStatusData(data);

      // ONLY populate user-editable input fields on initial open, NEVER during background polling
      if (isInitial || !isFormLoadedRef.current) {
        if (data.config) {
          setConfig(data.config);
        }
        if (data.email_alerts) {
          const ea = data.email_alerts;
          setEmailAlerts((prev) => ({
            ...prev,
            ...ea,
            smtp_password: prev.smtp_password || '',
            has_smtp_password: Boolean(ea.has_smtp_password),
          }));
        }
        isFormLoadedRef.current = true;
      }
    } catch (e) {
      console.error('Failed to load autopilot status', e);
    }
  };

  const handleSaveEmailAlerts = async () => {
    setIsSavingEmail(true);
    setNotification(null);
    try {
      const res = await api.updateAlertConfig(emailAlerts);
      showNotification('success', res.message || 'Email alert preferences saved successfully!');
      if (emailAlerts.smtp_password) {
        setEmailAlerts((prev) => ({ ...prev, has_smtp_password: true }));
      }
    } catch (e: any) {
      showNotification('error', e.message || 'Failed to save email alert settings');
    } finally {
      setIsSavingEmail(false);
    }
  };

  const handleTestEmailAlert = async () => {
    if (!emailAlerts.alert_email || !emailAlerts.alert_email.trim()) {
      showNotification('error', 'Please enter a recipient email address first.');
      return;
    }
    setIsTestingEmail(true);
    setNotification(null);
    try {
      const res = await api.testEmailAlert(emailAlerts.alert_email);
      if (res.status === 'success') {
        showNotification('success', res.message);
      } else {
        showNotification('error', res.message);
      }
    } catch (e: any) {
      showNotification('error', e.message || 'Test email delivery failed');
    } finally {
      setIsTestingEmail(false);
    }
  };

  const handleSaveConfig = async (newConfig?: AutoPilotConfig) => {
    const toSave = newConfig || config;
    setSaving(true);
    setNotification(null);
    try {
      const res = await api.updateAutoPilotConfig(toSave);
      setConfig(res.config);
      showNotification('success', 'Auto-Pilot configuration saved successfully!');
      fetchStatus();
    } catch (e: any) {
      showNotification('error', e.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleDaemon = async () => {
    const updated = { ...config, enabled: !config.enabled };
    setConfig(updated);
    await handleSaveConfig(updated);
  };

  const handleTriggerNow = async () => {
    setTriggering(true);
    setNotification(null);
    try {
      const res = await api.triggerAutoPilotRunNow();
      showNotification('success', res.message || 'Autonomous cycle initiated!');
      await fetchStatus();
    } catch (e: any) {
      showNotification('error', e.message || 'Failed to start autonomous cycle');
    } finally {
      setTriggering(false);
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  if (!isOpen) return null;

  const isCycleRunning = statusData?.state?.is_running_cycle;
  const currentStep = statusData?.state?.current_step || 'Idle';
  const isAuth = Boolean(statusData?.channel?.authenticated);
  const channelName = statusData?.channel?.title || 'Not Linked';
  const recentUploads = statusData?.recent_uploads || [];
  const learnings = statusData?.learnings;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-[#0D121F] border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl shadow-indigo-950/40 overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-800/80 bg-gradient-to-r from-slate-900/90 via-indigo-950/30 to-slate-900/90 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 p-0.5 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <div className="w-full h-full bg-[#0D121F] rounded-[10px] flex items-center justify-center">
                <Bot className="w-6 h-6 text-cyan-400 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  24/7 GTA Auto-Pilot Agent
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 uppercase tracking-wide">
                  Autonomous AI
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Auto-curates English GTA videos, extracts viral hooks, renders 9:16 Shorts & auto-uploads 24/7
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchStatus(false)}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white transition-all cursor-pointer"
              title="Refresh status"
            >
              <RefreshCw className={`w-4 h-4 ${isCycleRunning ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Channel & Master Toggle Bar */}
        <div className="px-4 sm:px-6 py-3 bg-slate-900/40 border-b border-slate-800/60 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Channel Connection Status */}
          <div className="flex items-center gap-2">
            <YouTubeIcon className="w-4 h-4 text-red-500" />
            <span className="text-slate-400">Target Channel:</span>
            {isAuth ? (
              <span className="font-semibold text-emerald-400 flex items-center gap-1">
                {channelName}
                <CheckCircle className="w-3.5 h-3.5" />
              </span>
            ) : (
              <button
                onClick={() => {
                  onClose();
                  onOpenSettings();
                }}
                className="text-amber-400 underline font-medium hover:text-amber-300 flex items-center gap-1 cursor-pointer"
              >
                Connect YouTube Channel in Settings
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Master Enable/Disable Button */}
          <div className="flex items-center gap-3">
            <span className="text-slate-400">Auto-Pilot Status:</span>
            <button
              onClick={handleToggleDaemon}
              disabled={saving}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                config.enabled
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30'
                  : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-750'
              }`}
            >
              {config.enabled ? (
                <>
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>ENABLED (RUNNING 24/7)</span>
                </>
              ) : (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>PAUSED</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800/80 px-4 sm:px-6 bg-[#0B0F17]/60">
          <button
            onClick={() => setActiveTab('status')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'status'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-4 h-4" />
            Live Status & Telemetry
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'settings'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings2 className="w-4 h-4" />
            Schedule & Niche Config
          </button>
          <button
            onClick={() => setActiveTab('alerts')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'alerts'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Mail className="w-4 h-4 text-cyan-400" />
            Email Alerts & 100k Milestones
          </button>
          <button
            onClick={() => setActiveTab('learnings')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'learnings'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            AI Learnings & Performance Memory
          </button>
          <button
            onClick={() => setActiveTab('uploads')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'uploads'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <YouTubeIcon className="w-4 h-4 text-red-500" />
            Auto-Uploaded Shorts ({recentUploads.length})
          </button>
        </div>

        {/* Notifications */}
        {notification && (
          <div
            className={`mx-4 sm:mx-6 mt-4 p-3 rounded-xl text-xs flex items-center gap-2 border ${
              notification.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* TAB: STATUS & TELEMETRY */}
          {activeTab === 'status' && (
            <div className="space-y-6">
              {/* Active Cycle State Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950/30 to-slate-900 border border-indigo-500/30 shadow-lg">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          isCycleRunning
                            ? 'bg-amber-400 animate-ping'
                            : config.enabled
                            ? 'bg-emerald-400'
                            : 'bg-slate-500'
                        }`}
                      />
                      <span className="text-xs uppercase font-bold tracking-wider text-slate-400">
                        Agent Operational State
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      {isCycleRunning ? (
                        <span className="text-amber-300 animate-pulse">{currentStep}</span>
                      ) : config.enabled ? (
                        <span className="text-emerald-400">Daemon Active — Waiting for scheduled cycle</span>
                      ) : (
                        <span className="text-slate-400">Daemon Paused</span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-400">
                      The autonomous agent loop runs independently in the background on the server even when this browser is closed.
                    </p>
                  </div>

                  {/* Manual Run Now Button */}
                  <button
                    onClick={handleTriggerNow}
                    disabled={isCycleRunning || triggering}
                    className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
                  >
                    <Play className={`w-4 h-4 ${triggering ? 'animate-spin' : ''}`} />
                    <span>{isCycleRunning ? 'Cycle In Progress...' : 'Run Auto-Pilot Cycle Now'}</span>
                  </button>
                </div>

                {/* Progress bar if running */}
                {isCycleRunning && (
                  <div className="mt-4 pt-4 border-t border-slate-800/80">
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 h-full w-full animate-pulse" />
                    </div>
                    <div className="flex justify-between items-center mt-2 text-[11px] text-slate-400">
                      <span>Curating English GTA &rarr; Slicing Hook &rarr; 9:16 Subtitles &rarr; Publishing</span>
                      <span className="text-cyan-400 font-semibold">Autonomous Pipeline Active</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Telemetry Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                    <Gamepad2 className="w-4 h-4 text-indigo-400" />
                    <span>Target Niche</span>
                  </div>
                  <div className="text-base font-bold text-white">Grand Theft Auto</div>
                  <div className="text-[11px] text-indigo-400 mt-0.5">English Language Only</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                    <Clock className="w-4 h-4 text-cyan-400" />
                    <span>Frequency</span>
                  </div>
                  <div className="text-base font-bold text-white">Every {config.interval_hours} Hours</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {statusData?.state?.next_run_time
                      ? `Next: ${new Date(statusData.state.next_run_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                      : 'Scheduled automatically'}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                    <Flame className="w-4 h-4 text-pink-400" />
                    <span>Completed Cycles</span>
                  </div>
                  <div className="text-base font-bold text-white">
                    {statusData?.state?.total_cycles_completed ?? 0}
                  </div>
                  <div className="text-[11px] text-emerald-400 mt-0.5">
                    {recentUploads.length} Shorts Uploaded
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                    <Eye className="w-4 h-4 text-emerald-400" />
                    <span>Total Views Generated</span>
                  </div>
                  <div className="text-base font-bold text-emerald-400">
                    {recentUploads.reduce((sum, u) => sum + (u.view_count || 0), 0).toLocaleString()}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    From autonomous uploads
                  </div>
                </div>
              </div>

              {/* What the agent is doing banner */}
              <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  How the 24/7 Agent Works
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs text-slate-400">
                  <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/50">
                    <span className="font-bold text-white block mb-1">1. Curate & Filter</span>
                    Searches YouTube for viral English GTA moments, checking history to never duplicate videos.
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/50">
                    <span className="font-bold text-white block mb-1">2. AI Virality Slice</span>
                    Transcribes audio, analyzes hook intensity, and extracts the single highest-scoring segment (25-55s).
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/50">
                    <span className="font-bold text-white block mb-1">3. 9:16 Subtitle Render</span>
                    Renders vertical Shorts with Hormozi-style glowing subtitles and dynamic emoji accents.
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/50">
                    <span className="font-bold text-white block mb-1">4. Publish & Learn</span>
                    Uploads to YouTube and inspects real view metrics daily to improve future topics.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: SETTINGS & NICHE CONFIG */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Niche & Focus */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Gamepad2 className="w-3.5 h-3.5 text-indigo-400" />
                    Target Game / Niche
                  </label>
                  <input
                    type="text"
                    value={config.niche}
                    onChange={(e) => setConfig({ ...config, niche: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
                    placeholder="e.g. Grand Theft Auto (GTA)"
                  />
                  <p className="text-[11px] text-slate-500">
                    Curates GTA 5, GTA Online, GTA RP, and GTA 6 leaks & stunts.
                  </p>
                </div>

                {/* Language (English strict) */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    Language Restriction
                  </label>
                  <input
                    type="text"
                    value={config.language}
                    onChange={(e) => setConfig({ ...config, language: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
                    placeholder="English"
                  />
                  <p className="text-[11px] text-slate-500">
                    Strict English audio and English search filters only.
                  </p>
                </div>

                {/* Schedule Interval */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    Posting Frequency
                  </label>
                  <select
                    value={config.interval_hours}
                    onChange={(e) => setConfig({ ...config, interval_hours: parseFloat(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value={6}>Every 6 Hours (4 Shorts / day)</option>
                    <option value={12}>Every 12 Hours (2 Shorts / day - Recommended)</option>
                    <option value={24}>Every 24 Hours (1 Short / day)</option>
                    <option value={48}>Every 48 Hours (Every 2 days)</option>
                  </select>
                  <p className="text-[11px] text-slate-500">
                    Automated background timer runs on the server 24/7.
                  </p>
                </div>

                {/* Privacy Status */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <YouTubeIcon className="w-3.5 h-3.5 text-red-400" />
                    Upload Privacy
                  </label>
                  <select
                    value={config.privacy_status}
                    onChange={(e) => setConfig({ ...config, privacy_status: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="public">Public (Instant Live Reach)</option>
                    <option value="unlisted">Unlisted (Review before publishing)</option>
                  </select>
                  <p className="text-[11px] text-slate-500">
                    Choose 'Public' for autonomous channel growth.
                  </p>
                </div>

                {/* Subtitle Preset */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                    Subtitle Style Preset
                  </label>
                  <select
                    value={config.subtitle_preset}
                    onChange={(e) => setConfig({ ...config, subtitle_preset: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="hormozi">Alex Hormozi (Yellow & Green Punch)</option>
                    <option value="cyber">Cyberpunk Neon (Cyan & Pink Glow)</option>
                    <option value="beast">MrBeast High Impact (Clean Yellow Impact)</option>
                    <option value="minimalist">Minimalist Modern (Clean White)</option>
                  </select>
                </div>

                {/* Auto Emojis */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900 border border-slate-800 mt-2">
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-white">Dynamic Animated Emojis</div>
                    <div className="text-[11px] text-slate-500">
                      Injects contextual emojis (💀, 🔥, 🚀, 😱) into GTA hooks
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.auto_emojis}
                    onChange={(e) => setConfig({ ...config, auto_emojis: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded bg-slate-800 border-slate-700 cursor-pointer"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800/80 flex justify-end">
                <button
                  onClick={() => handleSaveConfig()}
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/30 cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Auto-Pilot Settings'}
                </button>
              </div>
            </div>
          )}

          {/* TAB: EMAIL ALERTS & MILESTONES */}
          {activeTab === 'alerts' && (
            <div className="space-y-6">
              {/* Overview Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-indigo-950/30 to-slate-900 border border-cyan-500/30 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-cyan-400 animate-bounce" />
                    <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                      Automated Incident & Growth Notifications
                    </span>
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-white">
                    Get alerted if the agent gets stuck, or if a video goes viral!
                  </h3>
                  <p className="text-xs text-slate-400">
                    Sends immediate email notifications when a download is blocked, YouTube token expires, or when an autonomous Short hits 100,000 views.
                  </p>
                </div>

                <button
                  onClick={handleTestEmailAlert}
                  disabled={isTestingEmail}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md shadow-cyan-600/25 transition-all cursor-pointer shrink-0 disabled:opacity-50"
                >
                  <Send className={`w-3.5 h-3.5 ${isTestingEmail ? 'animate-spin' : ''}`} />
                  <span>{isTestingEmail ? 'Sending Test...' : 'Send Test Email'}</span>
                </button>
              </div>

              {/* Alert Rules & Destination */}
              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <Mail className="w-4 h-4 text-indigo-400" />
                  Alert Destination & Trigger Rules
                </h4>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300">
                    Your Notification Email Address
                  </label>
                  <input
                    type="email"
                    value={emailAlerts.alert_email || ''}
                    onChange={(e) => setEmailAlerts({ ...emailAlerts, alert_email: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
                    placeholder="e.g. yourname@gmail.com"
                  />
                  <p className="text-[11px] text-slate-500">
                    Where critical error notices and 100k view celebration alerts will be sent.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  {/* Trigger 1: Critical Failures */}
                  <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-950/80 border border-rose-500/20">
                    <input
                      type="checkbox"
                      id="notify_on_error"
                      checked={emailAlerts.notify_on_error}
                      onChange={(e) => setEmailAlerts({ ...emailAlerts, notify_on_error: e.target.checked })}
                      className="mt-0.5 w-4 h-4 text-rose-500 rounded bg-slate-800 border-slate-700 cursor-pointer"
                    />
                    <label htmlFor="notify_on_error" className="space-y-1 cursor-pointer">
                      <div className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                        Pipeline Failure & Stuck Alert
                      </div>
                      <p className="text-[11px] text-slate-400 leading-snug">
                        Alert me if YouTube blocks downloads, transcription fails, rendering hangs, or token expires.
                      </p>
                    </label>
                  </div>

                  {/* Trigger 2: Viral Milestones */}
                  <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-950/80 border border-emerald-500/20">
                    <input
                      type="checkbox"
                      id="notify_on_milestone"
                      checked={emailAlerts.notify_on_milestone}
                      onChange={(e) => setEmailAlerts({ ...emailAlerts, notify_on_milestone: e.target.checked })}
                      className="mt-0.5 w-4 h-4 text-emerald-500 rounded bg-slate-800 border-slate-700 cursor-pointer"
                    />
                    <label htmlFor="notify_on_milestone" className="space-y-1 cursor-pointer">
                      <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                        <Flame className="w-3.5 h-3.5 text-amber-400" />
                        Viral View Milestone Alert
                      </div>
                      <p className="text-[11px] text-slate-400 leading-snug">
                        Notify me when any autonomous GTA Short reaches a major view milestone.
                      </p>
                    </label>
                  </div>
                </div>

                {/* Milestone View Count Selector */}
                <div className="space-y-2 pt-2">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                    Milestone Notification Threshold
                  </label>
                  <select
                    value={emailAlerts.milestone_view_threshold || 100000}
                    onChange={(e) => setEmailAlerts({ ...emailAlerts, milestone_view_threshold: parseInt(e.target.value, 10) })}
                    className="w-full sm:w-1/2 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value={10000}>10,000 Views</option>
                    <option value={50000}>50,000 Views</option>
                    <option value={100000}>100,000 Views (Recommended)</option>
                    <option value={500000}>500,000 Views (Half Million)</option>
                    <option value={1000000}>1,000,000 Views (Viral Mega-Hit)</option>
                  </select>
                </div>
              </div>

              {/* SMTP Sender Configuration */}
              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                    <Settings2 className="w-4 h-4 text-cyan-400" />
                    SMTP Outgoing Server Credentials
                  </h4>
                  <label className="flex items-center gap-2 text-xs text-slate-300 font-semibold cursor-pointer">
                    <span>Enable SMTP:</span>
                    <input
                      type="checkbox"
                      checked={emailAlerts.smtp_enabled}
                      onChange={(e) => setEmailAlerts({ ...emailAlerts, smtp_enabled: e.target.checked })}
                      className="w-4 h-4 text-indigo-600 rounded bg-slate-800 border-slate-700 cursor-pointer"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-400">SMTP Host</label>
                    <input
                      type="text"
                      value={emailAlerts.smtp_host || 'smtp.gmail.com'}
                      onChange={(e) => setEmailAlerts({ ...emailAlerts, smtp_host: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
                      placeholder="smtp.gmail.com"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-400">SMTP Port</label>
                    <input
                      type="number"
                      value={emailAlerts.smtp_port || 587}
                      onChange={(e) => setEmailAlerts({ ...emailAlerts, smtp_port: parseInt(e.target.value, 10) || 587 })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
                      placeholder="587"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-400">Sender Email (Username)</label>
                    <input
                      type="email"
                      value={emailAlerts.smtp_user || ''}
                      onChange={(e) => setEmailAlerts({ ...emailAlerts, smtp_user: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
                      placeholder="your-account@gmail.com"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-400">
                      App Password {emailAlerts.has_smtp_password && <span className="text-emerald-400 font-normal">(Saved)</span>}
                    </label>
                    <input
                      type="password"
                      value={emailAlerts.smtp_password || ''}
                      onChange={(e) => setEmailAlerts({ ...emailAlerts, smtp_password: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
                      placeholder={emailAlerts.has_smtp_password ? '••••••••••••••••' : '16-character Google App Password'}
                    />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/20 text-[11px] text-indigo-200 space-y-1">
                  <strong>💡 Free Gmail Setup:</strong> In your Google Account, enable 2-Step Verification, visit{' '}
                  <a
                    href="https://myaccount.google.com/apppasswords"
                    target="_blank"
                    rel="noreferrer"
                    className="underline text-cyan-300 hover:text-cyan-200"
                  >
                    Google App Passwords
                  </a>
                  , generate a 16-character password for "ViralClip", and paste it above.
                </div>
              </div>

              {/* Save Button */}
              <div className="pt-2 flex justify-end">
                <button
                  onClick={handleSaveEmailAlerts}
                  disabled={isSavingEmail}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/30 cursor-pointer disabled:opacity-50"
                >
                  {isSavingEmail ? 'Saving...' : 'Save Email Alert Preferences'}
                </button>
              </div>
            </div>
          )}

          {/* TAB: AI LEARNINGS & REFLECTION */}
          {activeTab === 'learnings' && (
            <div className="space-y-6">
              {/* Reflection Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-purple-950/20 to-slate-900 border border-indigo-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    AI Self-Improvement Analysis
                  </h3>
                  <span className="text-[10px] text-slate-400">
                    Updated every cycle from real YouTube analytics
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {learnings?.latest_reflection?.takeaways ||
                    'The AI agent continuously measures view counts and retention of published Shorts to eliminate boring formats and double down on viral GTA stunts.'}
                </p>
                {learnings?.latest_reflection?.next_search_queries && (
                  <div className="pt-2">
                    <span className="text-[11px] text-slate-400 block mb-1.5 font-semibold">
                      Current Targeted Search Queries:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {learnings.latest_reflection.next_search_queries.map((q, idx) => (
                        <span
                          key={idx}
                          className="text-[11px] px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300"
                        >
                          "{q}"
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Topics Breakdown Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Winning Topics */}
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
                  <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wide flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    Winning Topics (Prioritized)
                  </h4>
                  <ul className="space-y-2 text-xs">
                    {(learnings?.winning_topics || []).map((topic, i) => (
                      <li
                        key={i}
                        className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10 text-emerald-200"
                      >
                        <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>{topic}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Avoid Topics */}
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
                  <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wide flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    Low-Retention Formats (Avoided)
                  </h4>
                  <ul className="space-y-2 text-xs">
                    {(learnings?.avoid_topics || []).map((topic, i) => (
                      <li
                        key={i}
                        className="flex items-center gap-2 p-2 rounded-lg bg-rose-500/5 border border-rose-500/10 text-rose-300"
                      >
                        <X className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        <span>{topic}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Hook Strategies */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wide flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  Active Hook Strategies
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                  {(learnings?.hook_strategies || []).map((strat, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/10 text-cyan-200"
                    >
                      {strat}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB: UPLOADED SHORTS */}
          {activeTab === 'uploads' && (
            <div className="space-y-4">
              {recentUploads.length === 0 ? (
                <div className="text-center py-12 text-slate-500 space-y-2">
                  <YouTubeIcon className="w-12 h-12 mx-auto text-slate-700" />
                  <p className="text-sm">No autonomous uploads yet.</p>
                  <p className="text-xs text-slate-600">
                    Click "Run Auto-Pilot Cycle Now" or wait for the next scheduled cycle to post your first GTA Short!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentUploads.map((u, i) => (
                    <div
                      key={i}
                      className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 uppercase">
                            Short
                          </span>
                          <span className="text-xs text-slate-400">
                            {new Date(u.uploaded_at).toLocaleString()}
                          </span>
                        </div>
                        <h4 className="text-sm font-semibold text-white line-clamp-1">
                          {u.title}
                        </h4>
                        <p className="text-[11px] text-slate-500 line-clamp-1">
                          Source: {u.source_video_title}
                        </p>
                      </div>

                      <div className="flex items-center gap-4 text-xs shrink-0">
                        {/* Metrics */}
                        <div className="flex items-center gap-3 text-slate-300">
                          <div className="flex items-center gap-1" title="Views">
                            <Eye className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="font-semibold text-white">
                              {(u.view_count || 0).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-1" title="Likes">
                            <ThumbsUp className="w-3.5 h-3.5 text-cyan-400" />
                            <span>{(u.like_count || 0).toLocaleString()}</span>
                          </div>
                          <div className="flex items-center gap-1" title="Comments">
                            <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
                            <span>{(u.comment_count || 0).toLocaleString()}</span>
                          </div>
                        </div>

                        {/* YouTube link */}
                        <a
                          href={u.youtube_url || `https://youtube.com/watch?v=${u.youtube_video_id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 font-medium transition-all"
                        >
                          <span>Watch</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
