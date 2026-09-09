import React, { useState, useEffect, useRef } from 'react';
import { Settings, X, Key, Cpu, CheckCircle, Save, ExternalLink, ShieldCheck, Upload, LogOut, RefreshCw, AlertCircle, Wifi } from 'lucide-react';
import { YouTubeIcon } from './YouTubeIcon';
import { AppSettings, YouTubeChannelInfo } from '../types';
import { api, getCustomBackendUrl, setCustomBackendUrl } from '../api';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (newSettings: AppSettings) => Promise<void>;
  channelInfo?: YouTubeChannelInfo | null;
  onRefreshChannel?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
  channelInfo,
  onRefreshChannel,
}) => {
  if (!isOpen) return null;

  const [form, setForm] = useState<AppSettings>({ ...settings });
  const [customBackendUrl, setCustomBackendUrlState] = useState(getCustomBackendUrl());
  const [isTestingConn, setIsTestingConn] = useState(false);
  const [connTestResult, setConnTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testingAiKey, setTestingAiKey] = useState<string | null>(null);
  const [aiTestResult, setAiTestResult] = useState<{ provider: string; valid: boolean; message: string; action_url?: string; tip?: string } | null>(null);
  const [testingLocalAi, setTestingLocalAi] = useState(false);
  const [localAiResult, setLocalAiResult] = useState<any>(null);
  const [isConnectingYT, setIsConnectingYT] = useState(false);
  const [ytError, setYtError] = useState<string | null>(null);
  const [ytSuccessMsg, setYtSuccessMsg] = useState<string | null>(null);
  const [isUploadingCookies, setIsUploadingCookies] = useState(false);
  const [cookieUploadMsg, setCookieUploadMsg] = useState<string | null>(null);
  const secretsFileRef = useRef<HTMLInputElement>(null);
  const cookiesFileRef = useRef<HTMLInputElement>(null);

  const handleUploadCookies = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingCookies(true);
    setCookieUploadMsg(null);
    try {
      const res = await api.uploadYouTubeCookies(file);
      setCookieUploadMsg('✅ Cookies loaded! Age-restricted videos unlocked.');
    } catch (err: any) {
      setCookieUploadMsg(`❌ Failed: ${err.message}`);
    } finally {
      setIsUploadingCookies(false);
    }
  };

  useEffect(() => {
    setForm({ ...settings });
    setCustomBackendUrlState(getCustomBackendUrl());
  }, [settings]);

  const handleTestLocalAi = async () => {
    setTestingLocalAi(true);
    setLocalAiResult(null);
    try {
      const res = await api.getLocalAiStatus(form.local_ai_url);
      setLocalAiResult(res);
    } catch (e: any) {
      setLocalAiResult({ available: false, message: e.message || 'Connection failed' });
    } finally {
      setTestingLocalAi(false);
    }
  };

  const handleTestAiKey = async (provider: string, key?: string) => {
    const k = key || '';
    if (!k.trim()) {
      setAiTestResult({ provider, valid: false, message: 'Please enter an API key first.' });
      return;
    }
    setTestingAiKey(provider);
    setAiTestResult(null);
    try {
      const res = await api.testAiKey(provider, k.trim());
      setAiTestResult({ provider, ...res });
    } catch (e: any) {
      setAiTestResult({ provider, valid: false, message: e.message || 'Key test failed' });
    } finally {
      setTestingAiKey(null);
    }
  };

  const handleTestBackend = async () => {
    setIsTestingConn(true);
    setConnTestResult(null);
    try {
      const res = await api.testConnection(customBackendUrl);
      setConnTestResult(res);
    } finally {
      setIsTestingConn(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      setCustomBackendUrl(customBackendUrl);
      await onSave(form);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleConnectYouTube = async () => {
    setIsConnectingYT(true);
    setYtError(null);
    setYtSuccessMsg(null);
    try {
      await api.connectYouTube({
        client_id: form.youtube_client_id,
        client_secret: form.youtube_client_secret,
      });
      setYtSuccessMsg('YouTube Channel Connected Successfully! 🎉');
      if (onRefreshChannel) onRefreshChannel();
    } catch (err: any) {
      setYtError(err.message || 'Failed to authenticate YouTube channel');
    } finally {
      setIsConnectingYT(false);
    }
  };

  const handleDisconnectYouTube = async () => {
    try {
      await api.disconnectYouTube();
      setForm((prev) => ({
        ...prev,
        youtube_authenticated: false,
        youtube_channel_name: '',
        youtube_channel_id: '',
      }));
      if (onRefreshChannel) onRefreshChannel();
      setYtSuccessMsg('YouTube channel disconnected.');
      setTimeout(() => setYtSuccessMsg(null), 3000);
    } catch (err: any) {
      setYtError(err.message);
    }
  };

  const handleSecretsFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        await api.uploadClientSecrets(e.target.files[0]);
        setYtSuccessMsg('client_secrets.json uploaded! You can now click Connect Channel.');
      } catch (err: any) {
        setYtError(err.message);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="glass-panel rounded-3xl max-w-2xl w-full border border-slate-700/80 shadow-2xl p-4 sm:p-8 space-y-5 sm:space-y-6 relative max-h-[92dvh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
            <Settings className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h3 className="font-display text-xl font-bold text-white">
              Application & AI Settings
            </h3>
            <p className="text-xs text-slate-400">
              Configure AI virality providers, Whisper transcription, and YouTube Data API v3 OAuth
            </p>
          </div>
        </div>

        {/* AI API Keys Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-400 border-b border-slate-800 pb-2">
            <Key className="w-4 h-4" />
            <span>AI Virality & Transcription APIs</span>
          </div>

          {/* Gemini API Key */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-300 font-semibold">Google Gemini API Key (Recommended)</span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-indigo-400 hover:underline flex items-center gap-1"
              >
                <span>Get Free Key</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="flex gap-2">
              <input
                type="password"
                value={form.gemini_api_key || ''}
                onChange={(e) => setForm({ ...form, gemini_api_key: e.target.value })}
                placeholder="AIzaSy..."
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
              />
              <button
                type="button"
                onClick={() => handleTestAiKey('gemini', form.gemini_api_key)}
                disabled={testingAiKey === 'gemini'}
                className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-indigo-500 text-slate-300 hover:text-white text-xs font-semibold shrink-0 cursor-pointer"
              >
                {testingAiKey === 'gemini' ? 'Testing...' : 'Test Key'}
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              Powers AI virality scoring, hook extraction, tags, and description writing.
            </p>
          </div>

          {/* Groq Whisper & Llama API Key */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-300 font-semibold">Groq API Key (Lightning Fast Llama 3.3 & Whisper)</span>
              <a
                href="https://console.groq.com/keys"
                target="_blank"
                rel="noreferrer"
                className="text-indigo-400 hover:underline flex items-center gap-1"
              >
                <span>Get Free Groq Key</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="flex gap-2">
              <input
                type="password"
                value={form.groq_api_key || ''}
                onChange={(e) => setForm({ ...form, groq_api_key: e.target.value })}
                placeholder="gsk_..."
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
              />
              <button
                type="button"
                onClick={() => handleTestAiKey('groq', form.groq_api_key)}
                disabled={testingAiKey === 'groq'}
                className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-indigo-500 text-slate-300 hover:text-white text-xs font-semibold shrink-0 cursor-pointer"
              >
                {testingAiKey === 'groq' ? 'Testing...' : 'Test Key'}
              </button>
            </div>
          </div>

          {/* OpenAI API Key */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-300 font-semibold">OpenAI API Key (GPT-4o & Whisper)</span>
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noreferrer"
                className="text-indigo-400 hover:underline flex items-center gap-1"
              >
                <span>Get OpenAI Key</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="flex gap-2">
              <input
                type="password"
                value={form.openai_api_key || ''}
                onChange={(e) => setForm({ ...form, openai_api_key: e.target.value })}
                placeholder="sk-..."
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
              />
              <button
                type="button"
                onClick={() => handleTestAiKey('openai', form.openai_api_key)}
                disabled={testingAiKey === 'openai'}
                className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-indigo-500 text-slate-300 hover:text-white text-xs font-semibold shrink-0 cursor-pointer"
              >
                {testingAiKey === 'openai' ? 'Testing...' : 'Test Key'}
              </button>
            </div>
          </div>

          {/* AI Key Test Feedback Card */}
          {aiTestResult && (
            <div
              className={`p-3 rounded-xl text-xs space-y-1.5 ${
                aiTestResult.valid
                  ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-200'
                  : 'bg-amber-950/40 border border-amber-500/40 text-amber-200'
              }`}
            >
              <div className="flex items-center gap-2 font-semibold">
                {aiTestResult.valid ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                )}
                <span>{aiTestResult.message}</span>
              </div>
              {aiTestResult.action_url && (
                <div className="pt-1 flex items-center gap-2">
                  <a
                    href={aiTestResult.action_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 text-[11px] font-bold"
                  >
                    <span>Click here to enable Generative Language API in Google Cloud</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
              {aiTestResult.tip && (
                <p className="text-[11px] text-slate-300">{aiTestResult.tip}</p>
              )}
            </div>
          )}

          {/* Local AI on PC (Ollama / LM Studio) */}
          <div className="pt-2 border-t border-slate-800 space-y-2.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                <span>🖥️ Local AI on PC (Ollama / LM Studio)</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">0 Tokens / Free</span>
              </span>
              <a
                href="https://ollama.com"
                target="_blank"
                rel="noreferrer"
                className="text-indigo-400 hover:underline flex items-center gap-1 text-[11px]"
              >
                <span>Get Ollama</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400">Server URL:</span>
                <input
                  type="text"
                  value={form.local_ai_url || 'http://localhost:11434/v1'}
                  onChange={(e) => setForm({ ...form, local_ai_url: e.target.value })}
                  placeholder="http://localhost:11434/v1"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-slate-400">Local Model Name:</span>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={form.local_ai_model || 'llama3:latest'}
                    onChange={(e) => setForm({ ...form, local_ai_model: e.target.value })}
                    placeholder="llama3:latest"
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleTestLocalAi}
                    disabled={testingLocalAi}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-indigo-500 text-slate-300 hover:text-white text-xs font-semibold shrink-0 cursor-pointer"
                  >
                    {testingLocalAi ? 'Pinging...' : 'Test PC'}
                  </button>
                </div>
              </div>
            </div>

            {localAiResult && (
              <div
                className={`p-2.5 rounded-xl text-xs flex items-center justify-between ${
                  localAiResult.available
                    ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-200'
                    : 'bg-amber-950/40 border border-amber-500/40 text-amber-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  {localAiResult.available ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  )}
                  <span>{localAiResult.message}</span>
                </div>
                {localAiResult.models && localAiResult.models.length > 0 && (
                  <span className="text-[10px] bg-slate-900 px-2 py-0.5 rounded text-slate-300">
                    {localAiResult.models.length} model(s)
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* YouTube API OAuth Section */}
        <div className="space-y-4 pt-2 border-t border-slate-800">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-red-400">
              <YouTubeIcon className="w-4 h-4 text-red-500" />
              <span>YouTube Channel Connection</span>
            </div>
            {channelInfo?.authenticated && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                <span>Connected</span>
              </span>
            )}
          </div>

          {/* Connected Channel Info Card */}
          {channelInfo?.authenticated ? (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-red-950/40 via-slate-900 to-slate-900 border border-red-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                {channelInfo.avatar_url ? (
                  <img
                    src={channelInfo.avatar_url}
                    alt="Channel Avatar"
                    className="w-12 h-12 rounded-full border-2 border-red-500/50 object-cover shadow-md"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-red-600/20 border border-red-500/40 flex items-center justify-center">
                    <YouTubeIcon className="w-6 h-6 text-red-500" />
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span>{channelInfo.title}</span>
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                    {channelInfo.custom_url && <span>{channelInfo.custom_url}</span>}
                    {channelInfo.subscriber_count && (
                      <>
                        <span>•</span>
                        <span>{Number(channelInfo.subscriber_count).toLocaleString()} Subscribers</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={handleDisconnectYouTube}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-red-950/60 border border-slate-700 hover:border-red-500/50 text-slate-300 hover:text-red-300 text-xs font-semibold transition-all shrink-0 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Disconnect</span>
              </button>
            </div>
          ) : (
            /* Not Connected State: Connect Actions */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">
                      Link YouTube Account (OAuth 2.0)
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Authorizes 1-click video publishing & scheduling directly to your channel.
                    </p>
                  </div>

                  <button
                    onClick={handleConnectYouTube}
                    disabled={isConnectingYT}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-red-600/30 transition-all cursor-pointer glow-youtube shrink-0"
                  >
                    {isConnectingYT ? (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <YouTubeIcon className="w-4 h-4 text-white" />
                    )}
                    <span>Connect YouTube Channel</span>
                  </button>
                </div>

                {/* Upload client_secrets.json shortcut */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    Have a <code className="text-indigo-300 bg-slate-950 px-1 py-0.5 rounded">client_secrets.json</code> file?
                  </span>
                  <input
                    type="file"
                    ref={secretsFileRef}
                    onChange={handleSecretsFileUpload}
                    accept=".json"
                    className="hidden"
                  />
                  <button
                    onClick={() => secretsFileRef.current?.click()}
                    className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
                  >
                    <Upload className="w-3 h-3" />
                    <span>Upload JSON File</span>
                  </button>
                </div>
              </div>

              {/* Manual Client ID & Secret Inputs */}
              <div className="space-y-3 p-4 bg-slate-950/60 rounded-2xl border border-slate-800/80">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Or Enter Google Cloud OAuth Credentials Manually:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-400">Client ID</span>
                    <input
                      type="text"
                      value={form.youtube_client_id || ''}
                      onChange={(e) => setForm({ ...form, youtube_client_id: e.target.value })}
                      placeholder="xxxx.apps.googleusercontent.com"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-400">Client Secret</span>
                    <input
                      type="password"
                      value={form.youtube_client_secret || ''}
                      onChange={(e) => setForm({ ...form, youtube_client_secret: e.target.value })}
                      placeholder="GOCSPX-..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* YouTube Cookies Upload (Always visible for bypassing bot/datacenter checks) */}
          <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <span>🍪 YouTube Cookies (Bypass Bot & Age-Restricted Blocks)</span>
              </span>
              <a
                href="https://github.com/yt-dlp/yt-dlp/wiki/FAQ#how-do-i-pass-cookies-to-yt-dlp"
                target="_blank"
                rel="noreferrer"
                className="text-indigo-400 hover:underline flex items-center gap-1 text-[11px]"
              >
                <span>Cookie Guide</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-[11px] text-slate-400">
              Export cookies from your browser (using the free Chrome/Edge extension &quot;Get cookies.txt locally&quot;) and upload here to bypass YouTube datacenter bot detection and age blocks.
            </p>
            <div className="flex items-center gap-3 pt-1">
              <input
                type="file"
                accept=".txt"
                ref={cookiesFileRef}
                onChange={handleUploadCookies}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => cookiesFileRef.current?.click()}
                disabled={isUploadingCookies}
                className="px-3.5 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 hover:border-indigo-500 text-xs text-indigo-200 font-semibold cursor-pointer transition-all"
              >
                {isUploadingCookies ? 'Uploading...' : 'Upload cookies.txt'}
              </button>
              {cookieUploadMsg && (
                <span className="text-xs text-emerald-400 font-medium">{cookieUploadMsg}</span>
              )}
            </div>
          </div>

          {/* Feedback messages */}
          {ytSuccessMsg && (
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{ytSuccessMsg}</span>
            </div>
          )}
          {ytError && (
            <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/40 text-xs text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{ytError}</span>
            </div>
          )}
        </div>

        {/* Hardware Acceleration Settings */}
        <div className="space-y-4 pt-2 border-t border-slate-800">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400 border-b border-slate-800 pb-2">
            <Cpu className="w-4 h-4" />
            <span>Hardware GPU Rendering Acceleration</span>
          </div>

          <div className="space-y-1.5">
            <span className="text-xs text-slate-300 font-semibold">Video Encoding Engine</span>
            <select
              value={form.hardware_acceleration || 'auto'}
              onChange={(e) => setForm({ ...form, hardware_acceleration: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="auto">Auto Detect Best GPU Encoder (NVIDIA NVENC / Intel QSV / AMD)</option>
              <option value="cuda">Force NVIDIA NVENC (GeForce RTX / GTX)</option>
              <option value="qsv">Force Intel QuickSync (Intel Core)</option>
              <option value="amf">Force AMD Radeon AMF</option>
              <option value="cpu">Multi-Threaded CPU (libx264)</option>
            </select>
          </div>
        </div>

        {/* Mobile App & Remote Backend Server URL */}
        <div className="space-y-3 pt-4 border-t border-slate-800">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-400">
            <Wifi className="w-4 h-4" />
            <span>Mobile App & Remote Backend Connection</span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-300 font-semibold">Backend Engine Host / IP</span>
              <span className="text-slate-400 text-[11px]">Leave blank for automatic</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={customBackendUrl}
                onChange={(e) => setCustomBackendUrlState(e.target.value)}
                placeholder="e.g. http://192.168.1.50:8000"
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
              />
              <button
                type="button"
                onClick={handleTestBackend}
                disabled={isTestingConn}
                className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-cyan-500 text-slate-200 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shrink-0 cursor-pointer"
              >
                {isTestingConn ? (
                  <div className="w-3.5 h-3.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                )}
                <span>Test Connection</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              For Android APK or mobile browsers on your Wi-Fi, enter your computer's LAN IP address (e.g. <span className="font-mono text-cyan-400">http://192.168.x.x:8000</span>).
            </p>

            {connTestResult && (
              <div
                className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                  connTestResult.success
                    ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-300'
                    : 'bg-red-950/40 border border-red-500/40 text-red-300'
                }`}
              >
                {connTestResult.success ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                )}
                <span>{connTestResult.message}</span>
              </div>
            )}
          </div>
        </div>

        {/* Save Bar */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
          <div>
            {saveSuccess && (
              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4" />
                <span>Settings saved successfully!</span>
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
