import React from 'react';
import { Sparkles, Cpu, Settings, RefreshCw, Layers, CheckCircle, AlertCircle, Menu, X } from 'lucide-react';
import { YouTubeIcon } from './YouTubeIcon';
import { SystemStatus, YouTubeChannelInfo } from '../types';

interface HeaderProps {
  systemStatus: SystemStatus | null;
  channelInfo?: YouTubeChannelInfo | null;
  onOpenSettings: () => void;
  onRefreshStatus: () => void;
  onNewProject: () => void;
  onOpenChat?: () => void;
  onToggleMobileMenu?: () => void;
  isMobileMenuOpen?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  systemStatus,
  channelInfo,
  onOpenSettings,
  onRefreshStatus,
  onNewProject,
  onOpenChat,
  onToggleMobileMenu,
  isMobileMenuOpen,
}) => {
  const isAuth = Boolean(channelInfo?.authenticated || systemStatus?.youtube_authenticated);
  const channelTitle = channelInfo?.title || systemStatus?.youtube_channel_name || 'Channel Linked';
  return (
    <header className="h-16 border-b border-slate-800 bg-[#0B0F17]/95 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between sticky top-0 z-40">
      {/* Left: Mobile Drawer Button & Brand Logo */}
      <div className="flex items-center gap-2 sm:gap-3">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-colors"
            aria-label="Toggle navigation drawer"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5 text-indigo-400" /> : <Menu className="w-5 h-5 text-slate-300" />}
          </button>
        )}

        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
          <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white animate-pulse" />
        </div>
        <div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <h1 className="font-display font-extrabold text-base sm:text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              ViralClip AI
            </h1>
            <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              Pro
            </span>
          </div>
          <p className="text-[11px] text-slate-400 hidden md:block">
            Opus-Level AI Video Clipper & YouTube Auto-Poster
          </p>
        </div>
      </div>

      {/* Center / System Badges */}
      <div className="hidden md:flex items-center gap-3">
        {/* Encoder / GPU status */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300">
          <Cpu className="w-4 h-4 text-emerald-400" />
          <span>GPU/Encoder:</span>
          <span className="font-semibold text-emerald-400 uppercase">
            {systemStatus?.encoder || 'Detecting...'}
          </span>
        </div>

        {/* YouTube Auth Badge */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs cursor-pointer transition-all ${
            isAuth
              ? 'bg-red-950/30 border-red-500/30 text-red-300 hover:bg-red-900/40'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
          onClick={onOpenSettings}
          title={isAuth ? 'YouTube Connected' : 'Click to connect YouTube'}
        >
          <YouTubeIcon className="w-4 h-4 text-red-500" />
          {isAuth ? (
            <div className="flex items-center gap-1.5">
              <span className="font-medium truncate max-w-[120px]">
                {channelTitle}
              </span>
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-slate-400">
              <span>Connect YouTube</span>
              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1.5 sm:gap-3">
        {/* Mobile YouTube Status Badge */}
        <div
          onClick={onOpenSettings}
          className={`md:hidden p-2 rounded-xl border text-xs cursor-pointer transition-all ${
            isAuth
              ? 'bg-red-950/40 border-red-500/40 text-red-400'
              : 'bg-slate-900 border-slate-800 text-slate-400'
          }`}
          title={isAuth ? `YouTube Connected: ${channelTitle}` : 'Click to connect YouTube'}
        >
          <YouTubeIcon className="w-4 h-4 text-red-500" />
        </div>

        {onOpenChat && (
          <button
            onClick={onOpenChat}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-semibold shadow-md shadow-purple-600/25 transition-all cursor-pointer"
            title="Open AI Studio Agent"
          >
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
            <span>AI Agent</span>
          </button>
        )}

        <button
          onClick={onNewProject}
          className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs sm:text-sm font-semibold shadow-md shadow-indigo-600/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Layers className="w-4 h-4" />
          <span>New Video</span>
        </button>

        <button
          onClick={onOpenSettings}
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-all"
          title="App Settings & API Keys"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
