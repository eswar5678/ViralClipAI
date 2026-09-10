import React from 'react';
import {
  Video,
  Wand2,
  Scissors,
  Film,
  Calendar,
  Settings,
  Radio,
  Sparkles,
  Search,
  X,
  Bot,
} from 'lucide-react';

export type TabType =
  | 'import'
  | 'youtube_search'
  | 'channel_scan'
  | 'ai_tools'
  | 'progress'
  | 'clips'
  | 'editor'
  | 'queue'
  | 'settings';

interface SidebarProps {
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
  clipsCount: number;
  queueCount: number;
  isProcessing: boolean;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  onOpenAutoPilot?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  clipsCount,
  queueCount,
  isProcessing,
  isMobileOpen = false,
  onCloseMobile,
  onOpenAutoPilot,
}) => {
  const navItems = [
    {
      id: 'import' as TabType,
      label: 'Import & Setup',
      icon: Video,
      badge: null,
    },
    {
      id: 'youtube_search' as TabType,
      label: 'Search YouTube',
      icon: Search,
      badge: 'Live',
      badgeColor: 'bg-red-500/20 text-red-400 border border-red-500/30',
    },
    {
      id: 'channel_scan' as TabType,
      label: 'Channel Auto-Clipper',
      icon: Radio,
      badge: 'New',
      badgeColor: 'bg-red-500/20 text-red-400 border border-red-500/30',
    },
    {
      id: 'ai_tools' as TabType,
      label: 'AI Growth & SEO',
      icon: Sparkles,
      badge: 'AI',
      badgeColor: 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30',
    },
    {
      id: 'progress' as TabType,
      label: 'AI Clipper Engine',
      icon: Wand2,
      badge: isProcessing ? 'Active' : null,
      badgeColor: 'bg-indigo-500 animate-pulse',
    },
    {
      id: 'clips' as TabType,
      label: 'Viral Clips Gallery',
      icon: Scissors,
      badge: clipsCount > 0 ? clipsCount.toString() : null,
      badgeColor: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
    },
    {
      id: 'editor' as TabType,
      label: 'Studio & Subtitles',
      icon: Film,
      badge: null,
    },
    {
      id: 'queue' as TabType,
      label: 'YouTube Publisher',
      icon: Calendar,
      badge: queueCount > 0 ? queueCount.toString() : null,
      badgeColor: 'bg-red-500/20 text-red-400 border border-red-500/30',
    },
    {
      id: 'settings' as TabType,
      label: 'Settings & APIs',
      icon: Settings,
      badge: null,
    },
  ];

  const handleSelectTab = (tab: TabType) => {
    onTabChange(tab);
    if (onCloseMobile) onCloseMobile();
  };

  const navContent = (
    <div className="space-y-1">
      {onOpenAutoPilot && (
        <div
          onClick={() => {
            onOpenAutoPilot();
            if (onCloseMobile) onCloseMobile();
          }}
          className="p-3 mb-3 rounded-xl bg-gradient-to-r from-cyan-950/50 via-indigo-950/40 to-purple-950/50 border border-cyan-500/40 hover:border-cyan-400 hover:shadow-lg hover:shadow-cyan-900/20 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-white tracking-tight">24/7 GTA Auto-Pilot</span>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          </div>
          <p className="text-[11px] text-slate-400 leading-tight">
            Autonomous AI curation & publishing 24/7
          </p>
        </div>
      )}

      <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
        Navigation
      </div>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => handleSelectTab(item.id)}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
              isActive
                ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <div className="flex items-center gap-3">
              <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </div>
            {item.badge && (
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  item.badgeColor || 'bg-slate-800 text-slate-300'
                }`}
              >
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );

  const footerInfo = (
    <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/60 space-y-2">
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
        <span>Opus Engine Ready</span>
      </div>
      <p className="text-[11px] text-slate-400 leading-relaxed">
        Slices 16:9 videos into 9:16 vertical viral shorts with active speaker auto-framing.
      </p>
    </div>
  );

  return (
    <>
      {/* Desktop Static Sidebar */}
      <aside className="hidden md:flex w-64 border-r border-slate-800/80 bg-[#0B0F17]/95 flex-col justify-between p-4 shrink-0 overflow-y-auto">
        {navContent}
        {footerInfo}
      </aside>

      {/* Mobile Slide-Over Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden animate-fadeIn">
          {/* Backdrop Blur */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
          />

          {/* Drawer Container */}
          <div className="relative w-72 max-w-[85vw] h-full bg-[#0B0F17] border-r border-slate-800 p-4 flex flex-col justify-between shadow-2xl z-10 overflow-y-auto">
            <div className="space-y-4">
              {/* Drawer Header with Close Button */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-display font-extrabold text-white text-base">
                    ViralClip AI
                  </span>
                </div>
                <button
                  onClick={onCloseMobile}
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {navContent}
            </div>

            <div className="pt-4 border-t border-slate-800/80">
              {footerInfo}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
