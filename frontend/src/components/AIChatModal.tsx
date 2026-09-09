import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Send,
  Bot,
  User,
  Sparkles,
  Zap,
  Play,
  CheckCircle,
  AlertCircle,
  Loader2,
  ChevronDown,
  ExternalLink,
  Tag,
  FileText
} from 'lucide-react';
import { YouTubeIcon } from './YouTubeIcon';
import { api } from '../api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  action?: any;
  actionResult?: any;
  isExecuting?: boolean;
  modelUsed?: string;
  timestamp: string;
}

interface AIChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeVideo?: any;
  activeClip?: any;
  onClipCreated?: () => void;
}

export const AIChatModal: React.FC<AIChatModalProps> = ({
  isOpen,
  onClose,
  activeVideo,
  activeClip,
  onClipCreated,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        "👋 Hey! I'm your autonomous AI Video Agent. Tell me what you want to create or automate (e.g. *'Find me a GTA video, make description, tags, subtitles and queue it for posting'*), and I will handle the entire studio workflow with zero wasted tokens!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [selectedModel, setSelectedModel] = useState('gemini-3.6-flash');
  const [isLoading, setIsLoading] = useState(false);
  const [localAiStatus, setLocalAiStatus] = useState<{ available: boolean; message: string; models?: string[]; download_url?: string; guide?: string } | null>(null);
  const [isCheckingLocal, setIsCheckingLocal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedModel === 'local') {
      setIsCheckingLocal(true);
      api.getLocalAiStatus().then(status => {
        setLocalAiStatus(status);
        setIsCheckingLocal(false);
      }).catch(() => {
        setLocalAiStatus({ available: false, message: 'Local AI server not detected on PC.' });
        setIsCheckingLocal(false);
      });
    }
  }, [selectedModel]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    }
  }, [isOpen, messages]);

  if (!isOpen) return null;

  const quickPrompts = [
    '🎮 Find me a GTA game video, make description, tags, subtitles and post it',
    '🔍 Search viral tech podcasts and clip the top moment',
    '✍️ Write a viral YouTube description & tags for my active clip',
    '🔥 Analyze my active video for peak emotional hooks',
  ];

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputText.trim();
    if (!text || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputText('');
    setIsLoading(true);

    try {
      // Build brief history
      const historyTurns = messages
        .filter((m) => m.id !== 'welcome')
        .slice(-4)
        .map((m) => ({ role: m.role, content: m.content }));

      const contextPayload: any = {};
      if (activeVideo) {
        contextPayload.active_video = {
          title: activeVideo.title,
          duration: activeVideo.duration,
        };
      }
      if (activeClip) {
        contextPayload.active_clip = {
          title: activeClip.title,
          virality_score: activeClip.virality_score,
        };
      }

      const res = await api.chatWithAgent({
        message: text,
        model: selectedModel,
        history: historyTurns,
        context: contextPayload,
      });

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: res.reply,
        action: res.action,
        modelUsed: res.model_used || selectedModel,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `⚠️ Error: ${err.message || 'Failed to communicate with AI agent.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecuteAction = async (msgId: string, actionType: string, params: any) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, isExecuting: true } : m))
    );

    try {
      const result = await api.executeAgentAction(actionType, params);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId ? { ...m, isExecuting: false, actionResult: result } : m
        )
      );
      if (onClipCreated) onClipCreated();
    } catch (e: any) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? {
                ...m,
                isExecuting: false,
                actionResult: { status: 'error', message: e.message || 'Action failed' },
              }
            : m
        )
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl h-[92dvh] sm:h-[85vh] bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-800 bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-bold text-sm sm:text-base text-white">
                  ViralClip AI Studio Agent
                </h3>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                  <Zap className="w-2.5 h-2.5" />
                  Token-Optimized
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Autonomous Video Slicing, Captioning & YouTube Automation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Model Switcher Dropdown */}
            <div className="relative">
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="bg-slate-950 text-slate-200 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:border-indigo-500 cursor-pointer appearance-none pr-7"
              >
                <optgroup label="Cloud AI (Fast & Intelligent)">
                  <option value="gemini-3.6-flash">Google Gemini 3.6 Flash</option>
                  <option value="gemini-3.7-flash">Google Gemini 3.7 Flash</option>
                  <option value="openai/gpt-oss-120b">Groq GPT-OSS 120B (Free)</option>
                  <option value="qwen/qwen3.8-27b">Groq Qwen 3.8 (Free)</option>
                  <option value="gpt-4o-mini">OpenAI GPT-4o-mini</option>
                </optgroup>
                <optgroup label="Local PC AI (100% Free & Offline)">
                  <option value="local">🖥️ Local AI on PC (Ollama / LM Studio)</option>
                </optgroup>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Local AI Status Banner (when Local AI selected) */}
        {selectedModel === 'local' && (
          <div className="px-4 py-2.5 bg-slate-950/80 border-b border-slate-800 text-xs flex items-center justify-between shrink-0">
            {isCheckingLocal ? (
              <div className="flex items-center gap-2 text-slate-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                <span>Checking local AI on PC (localhost:11434)...</span>
              </div>
            ) : localAiStatus?.available ? (
              <div className="flex items-center gap-2 text-emerald-300 font-semibold">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>{localAiStatus.message} — 0 tokens used, 100% private!</span>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-amber-300">
                <div className="flex items-center gap-1.5 font-medium">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Local AI not detected on PC.</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <span>Run <code className="text-indigo-300 bg-slate-900 px-1 rounded">ollama run llama3</code> in terminal</span>
                  <a
                    href="https://ollama.com"
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-400 hover:underline flex items-center gap-0.5"
                  >
                    <span>Download Ollama</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setIsCheckingLocal(true);
                api.getLocalAiStatus().then(status => {
                  setLocalAiStatus(status);
                  setIsCheckingLocal(false);
                });
              }}
              className="text-[10px] px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 shrink-0 cursor-pointer ml-2"
            >
              Re-check
            </button>
          </div>
        )}

        {/* Message Feed */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 no-scrollbar">
          {messages.map((m) => {
            const isUser = m.role === 'user';
            return (
              <div
                key={m.id}
                className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  </div>
                )}

                <div className={`max-w-[85%] space-y-2.5 ${isUser ? 'items-end' : 'items-start'}`}>
                  {/* Message Bubble */}
                  <div
                    className={`rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed ${
                      isUser
                        ? 'bg-indigo-600 text-white rounded-br-xs shadow-md shadow-indigo-600/20'
                        : 'bg-slate-800/90 text-slate-200 border border-slate-700/80 rounded-bl-xs'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{m.content}</div>
                    <div className="mt-1 flex items-center justify-between gap-2 text-[10px] opacity-60">
                      <span>{m.timestamp}</span>
                      {m.modelUsed && <span>{m.modelUsed}</span>}
                    </div>
                  </div>

                  {/* Action Suggestion Card */}
                  {m.action && !m.actionResult && (
                    <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-xs space-y-2.5 animate-fade-in">
                      <div className="flex items-center gap-2 font-semibold text-indigo-300">
                        <Zap className="w-4 h-4 text-amber-400" />
                        <span>Ready to run autonomous pipeline:</span>
                      </div>
                      <div className="text-[11px] text-slate-300 bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                        <span className="font-semibold text-white">Action:</span> {m.action.type}
                        {m.action.params?.topic && (
                          <div>
                            <span className="font-semibold text-white">Topic:</span>{' '}
                            {m.action.params.topic}
                          </div>
                        )}
                        {m.action.params?.search_query && (
                          <div>
                            <span className="font-semibold text-white">Query:</span>{' '}
                            {m.action.params.search_query}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => handleExecuteAction(m.id, m.action.type, m.action.params)}
                        disabled={m.isExecuting}
                        className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold cursor-pointer transition-all shadow-md shadow-indigo-600/30 disabled:opacity-50"
                      >
                        {m.isExecuting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Executing Autonomous Workflow (Downloading, Slicing & Queuing)...</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>🚀 Run Autonomous Workflow Now</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Action Result Card */}
                  {m.actionResult && (
                    <div
                      className={`p-3.5 rounded-xl text-xs space-y-2.5 ${
                        m.actionResult.status === 'success'
                          ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-200'
                          : 'bg-red-950/40 border border-red-500/40 text-red-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-bold">
                        {m.actionResult.status === 'success' ? (
                          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                        )}
                        <span>{m.actionResult.message}</span>
                      </div>

                      {m.actionResult.source_video && (
                        <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800 text-[11px] text-slate-300 space-y-1">
                          <div className="font-semibold text-white flex items-center gap-1">
                            <YouTubeIcon className="w-3 h-3 text-red-400" />
                            <span>Source: {m.actionResult.source_video.title}</span>
                          </div>
                          {m.actionResult.best_clip && (
                            <div>
                              🎬 Sliced Clip: <b>{m.actionResult.best_clip.title}</b> ({m.actionResult.best_clip.duration}s, Virality: {m.actionResult.best_clip.virality_score}/100)
                            </div>
                          )}
                          {m.actionResult.metadata?.tags && (
                            <div className="text-[10px] text-slate-400 truncate">
                              🏷️ Tags: {m.actionResult.metadata.tags}
                            </div>
                          )}
                        </div>
                      )}

                      {m.actionResult.queue && (
                        <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 text-[11px] text-slate-300 space-y-2">
                          {m.actionResult.channel && (
                            <div className="flex items-center justify-between font-semibold text-white border-b border-slate-800/80 pb-1.5">
                              <span className="flex items-center gap-1.5">
                                <YouTubeIcon className="w-3.5 h-3.5 text-red-500" />
                                <span>{m.actionResult.channel.title}</span>
                              </span>
                              <span className="text-[10px] text-emerald-400 font-normal">● Live Channel Connected</span>
                            </div>
                          )}
                          <div className="space-y-1.5 max-h-40 overflow-y-auto no-scrollbar">
                            {m.actionResult.queue.slice(0, 6).map((q: any) => (
                              <div key={q.id} className="flex items-center justify-between gap-2 p-1.5 rounded bg-slate-900/60 border border-slate-800/60">
                                <div className="truncate flex-1">
                                  <span className="font-medium text-slate-200">{q.title}</span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                    q.status === 'published' ? 'bg-emerald-500/20 text-emerald-300' :
                                    q.status === 'uploading' ? 'bg-indigo-500/20 text-indigo-300 animate-pulse' :
                                    'bg-amber-500/20 text-amber-300'
                                  }`}>
                                    {q.status.toUpperCase()}
                                  </span>
                                  {q.youtube_url && (
                                    <a
                                      href={q.youtube_url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-red-400 hover:text-red-300"
                                      title="Open on YouTube"
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0 mt-0.5 shadow-md shadow-indigo-600/30">
                    <User className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
              </div>
            );
          })}

          {isLoading && (
            <div className="flex items-center gap-2 text-xs text-slate-400 italic">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
              <span>AI Agent is thinking and planning token-efficient actions...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-4 py-2 bg-slate-950/60 border-t border-slate-800/80 flex gap-2 overflow-x-auto no-scrollbar shrink-0">
          {quickPrompts.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(q)}
              className="text-[11px] px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300 hover:border-indigo-500 hover:text-white shrink-0 transition-colors cursor-pointer"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Chat Input Bar */}
        <div className="p-3 sm:p-4 bg-slate-900 border-t border-slate-800 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask AI to find videos, clip, caption, generate tags or post..."
              className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isLoading}
              className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shrink-0 disabled:opacity-40 transition-colors cursor-pointer shadow-md shadow-indigo-600/30"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
