import React from 'react';
import { ExternalLink, Trash2, Calendar, CheckCircle2, Clock, AlertTriangle, RefreshCw } from 'lucide-react';
import { YouTubeIcon } from './YouTubeIcon';
import { YouTubeQueueItem } from '../types';

interface YouTubeQueueProps {
  queue: YouTubeQueueItem[];
  onRefresh: () => void;
  onDelete: (id: string) => void;
}

export const YouTubeQueue: React.FC<YouTubeQueueProps> = ({
  queue,
  onRefresh,
  onDelete,
}) => {
  return (
    <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6 p-3 sm:p-6">
      {/* Top Banner */}
      <div className="glass-panel rounded-2xl p-4 sm:p-6 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-red-600/10 border border-red-500/20 flex items-center justify-center shrink-0">
            <YouTubeIcon className="w-6 h-6 sm:w-7 sm:h-7 text-red-500" />
          </div>
          <div>
            <h3 className="font-display text-lg sm:text-xl font-bold text-white">
              YouTube Publishing Queue & History
            </h3>
            <p className="text-xs text-slate-400">
              Manage scheduled YouTube Shorts, live uploads, and automated posting logs.
            </p>
          </div>
        </div>

        <button
          onClick={onRefresh}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-all cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Queue Items */}
      {queue.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 text-center border border-slate-800/80 space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center mx-auto text-slate-400">
            <Calendar className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-slate-200">No Scheduled or Published Posts Yet</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Once you slice your video and click "Post to YouTube", your uploads and scheduled calendar will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {queue.map((item) => {
            const isPublished = item.status === 'published';
            const isScheduled = item.status === 'scheduled';
            const isUploading = item.status === 'uploading';
            const isFailed = item.status === 'failed';

            return (
              <div
                key={item.id}
                className="glass-card rounded-2xl p-5 border flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
                    <YouTubeIcon className="w-5 h-5 text-red-500" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white line-clamp-1">
                        {item.title}
                      </h4>
                      {isPublished && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Live</span>
                        </span>
                      )}
                      {isScheduled && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>Scheduled</span>
                        </span>
                      )}
                      {isUploading && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                          Uploading ({item.progress}%)
                        </span>
                      )}
                      {isFailed && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Failed</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-1 max-w-xl">
                      {item.description}
                    </p>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400">
                      <span>Visibility: <strong className="text-slate-300 capitalize">{item.privacy_status}</strong></span>
                      {item.schedule_time && (
                        <>
                          <span>•</span>
                          <span>Publish At: <strong className="text-indigo-300">{new Date(item.schedule_time).toLocaleString()}</strong></span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-3 shrink-0">
                  {item.youtube_url && (
                    <a
                      href={item.youtube_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-sm transition-all"
                    >
                      <span>Open Short</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <button
                    onClick={() => onDelete(item.id)}
                    className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-red-500/50 text-slate-400 hover:text-red-400 transition-all cursor-pointer"
                    title="Remove from history"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
