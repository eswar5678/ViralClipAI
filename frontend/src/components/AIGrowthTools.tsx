import React, { useState } from 'react';
import { Sparkles, FileText, Hash, TrendingUp, Copy, Check, Sliders, AlertCircle, ArrowUpRight, Flame, ShieldAlert, Lightbulb } from 'lucide-react';
import { AIDescriptionResult, AITagsResult, AIAnalyzeResult } from '../types';
import { api } from '../api';

interface AIGrowthToolsProps {
  currentVideoTitle?: string;
}

export const AIGrowthTools: React.FC<AIGrowthToolsProps> = ({
  currentVideoTitle = 'Top Productivity Hacks & Mindset Shift',
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'desc' | 'tags' | 'analyzer'>('desc');
  const [videoTitle, setVideoTitle] = useState(currentVideoTitle);
  const [keywordsInput, setKeywordsInput] = useState('mindset, productivity, focus, growth');
  const [tone, setTone] = useState('punchy_shorts');
  const [cta, setCta] = useState('Like & Subscribe for daily viral shorts!');

  // Tool Result States
  const [descResult, setDescResult] = useState<AIDescriptionResult | null>(null);
  const [tagsResult, setTagsResult] = useState<AITagsResult | null>(null);
  const [analyzeResult, setAnalyzeResult] = useState<AIAnalyzeResult | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2500);
  };

  // Generate AI Description
  const handleGenerateDescription = async () => {
    if (!videoTitle.trim()) return;
    setIsLoading(true);
    try {
      const res = await api.generateAIDescription({
        title: videoTitle.trim(),
        tone,
        keywords: keywordsInput.split(',').map((k) => k.trim()).filter(Boolean),
        call_to_action: cta,
      });
      setDescResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  // Generate Viral Tags
  const handleGenerateTags = async () => {
    if (!videoTitle.trim()) return;
    setIsLoading(true);
    try {
      const res = await api.generateAITags({
        title: videoTitle.trim(),
        topic: keywordsInput,
      });
      setTagsResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  // Analyze Video Retention
  const handleAnalyzeVideo = async () => {
    if (!videoTitle.trim()) return;
    setIsLoading(true);
    try {
      const res = await api.analyzeVideoContent({
        title: videoTitle.trim(),
      });
      setAnalyzeResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6 p-3 sm:p-6">
      {/* Top Banner */}
      <div className="glass-panel rounded-2xl p-4 sm:p-6 border border-slate-800 space-y-4">
        <div className="flex items-center gap-3 sm:gap-3.5">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-400" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-[10px] font-extrabold uppercase tracking-wider">
              AI Growth & SEO Studio
            </div>
            <h2 className="font-display text-lg sm:text-xl font-bold text-white mt-1">
              AI Description Writer, Viral Tags & Retention Analyzer
            </h2>
          </div>
        </div>

        {/* Sub-Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto no-scrollbar whitespace-nowrap">
          <button
            onClick={() => setActiveSubTab('desc')}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              activeSubTab === 'desc'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>AI Description Writer</span>
          </button>

          <button
            onClick={() => setActiveSubTab('tags')}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              activeSubTab === 'tags'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Hash className="w-4 h-4" />
            <span>Viral Tags & SEO</span>
          </button>

          <button
            onClick={() => setActiveSubTab('analyzer')}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              activeSubTab === 'analyzer'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Virality Audit</span>
          </button>
        </div>
      </div>

      {/* Global Input Bar */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300">Video Topic or Headline</label>
            <input
              type="text"
              value={videoTitle}
              onChange={(e) => setVideoTitle(e.target.value)}
              placeholder="e.g. How to Build Massive Focus in 30 Days"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300">Target Keywords (Comma Separated)</label>
            <input
              type="text"
              value={keywordsInput}
              onChange={(e) => setKeywordsInput(e.target.value)}
              placeholder="e.g. dopamine, productivity, morning routine"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* TAB 1: AI Description Writer */}
      {activeSubTab === 'desc' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Controls */}
          <div className="lg:col-span-4 glass-panel rounded-2xl p-5 border border-slate-800 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Description Tone</label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="punchy_shorts">⚡ Viral Punchy Shorts (Fast & High CTR)</option>
                <option value="educational">🧠 Educational Breakdown (Structured & Deep)</option>
                <option value="storytelling">📖 Storytelling & Narrative (Curiosity Hook)</option>
                <option value="seo_heavy">🔍 SEO Keyword Packed (Algorithm Ranker)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Call to Action (CTA)</label>
              <input
                type="text"
                value={cta}
                onChange={(e) => setCta(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              onClick={handleGenerateDescription}
              disabled={isLoading || !videoTitle.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 text-amber-300" />
              )}
              <span>Generate Viral Description</span>
            </button>
          </div>

          {/* Right Preview */}
          <div className="lg:col-span-8 glass-panel rounded-2xl p-5 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Generated YouTube Description
              </h4>
              {descResult && (
                <button
                  onClick={() => handleCopy(descResult.main_description, 'desc')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white text-xs font-semibold transition-all cursor-pointer"
                >
                  {copiedField === 'desc' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedField === 'desc' ? 'Copied!' : 'Copy Description'}</span>
                </button>
              )}
            </div>

            {descResult ? (
              <div className="space-y-3">
                <textarea
                  rows={8}
                  value={descResult.main_description}
                  readOnly
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-xs text-slate-100 font-mono leading-relaxed focus:outline-none"
                />
                <div className="flex flex-wrap gap-1.5">
                  {descResult.hashtags.map((h, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold">
                      {h}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-44 flex flex-col items-center justify-center text-slate-400 text-xs italic">
                Click "Generate Viral Description" to create high-converting copy.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Viral Tags & SEO Studio */}
      {activeSubTab === 'tags' && (
        <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-6">
          <div className="flex items-center justify-between">
            <button
              onClick={handleGenerateTags}
              disabled={isLoading || !videoTitle.trim()}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Hash className="w-4 h-4" />
              )}
              <span>Generate Viral Tags & SEO Hashtags</span>
            </button>

            {tagsResult && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400">
                  Length: <strong className="text-indigo-400">{tagsResult.character_count} / 500</strong> chars
                </span>
                <button
                  onClick={() => handleCopy(tagsResult.all_tags_csv, 'tags_csv')}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
                >
                  {copiedField === 'tags_csv' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedField === 'tags_csv' ? 'Copied CSV!' : 'Copy Tags for YouTube Studio'}</span>
                </button>
              </div>
            )}
          </div>

          {tagsResult ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2 border-t border-slate-800">
              {/* Broad Tags */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                  Broad High-Volume Tags
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {tagsResult.broad_tags.map((t, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs">
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Niche Long-Tail */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                  Niche Long-Tail Keywords
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {tagsResult.niche_tags.map((t, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs">
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Trending Hashtags */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  Trending Hashtags
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {tagsResult.trending_hashtags.map((t, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-32 flex flex-col items-center justify-center text-slate-400 text-xs italic">
              Click above to extract high-traffic search terms and hashtags.
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Deep Retention & Virality Audit */}
      {activeSubTab === 'analyzer' && (
        <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-6">
          <div className="flex items-center justify-between">
            <button
              onClick={handleAnalyzeVideo}
              disabled={isLoading || !videoTitle.trim()}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <TrendingUp className="w-4 h-4" />
              )}
              <span>Run Deep Retention & Virality Audit</span>
            </button>
          </div>

          {analyzeResult ? (
            <div className="space-y-6 pt-2 border-t border-slate-800">
              {/* Score Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30">
                  <span className="block text-xs font-bold uppercase text-slate-400">Hook Score</span>
                  <span className="font-display text-2xl font-black text-emerald-400">{analyzeResult.hook_score}/100</span>
                </div>
                <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/30">
                  <span className="block text-xs font-bold uppercase text-slate-400">Predicted Virality</span>
                  <span className="font-display text-2xl font-black text-indigo-400">{analyzeResult.overall_virality}/100</span>
                </div>
                <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-500/30">
                  <span className="block text-xs font-bold uppercase text-slate-400">Pacing Grade</span>
                  <span className="font-display text-2xl font-black text-cyan-400">{analyzeResult.pacing_grade}</span>
                </div>
              </div>

              {/* Retention Curve Visualization */}
              <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Predicted Audience Retention Flow
                </span>
                <div className="flex items-center justify-between gap-2 pt-2">
                  {analyzeResult.retention_curve.map((pt, i) => (
                    <div key={i} className="flex-1 text-center space-y-1">
                      <div className="h-16 bg-slate-900 rounded-lg flex items-end p-1">
                        <div
                          className="w-full bg-gradient-to-t from-indigo-600 to-cyan-400 rounded-md transition-all duration-500"
                          style={{ height: `${pt.retention_pct}%` }}
                        />
                      </div>
                      <span className="block text-xs font-bold text-white">{pt.retention_pct}%</span>
                      <span className="block text-[10px] text-slate-400">{pt.timestamp}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Strengths & Drop-Off Warnings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-400">
                    <Flame className="w-4 h-4" />
                    <span>Key Virality Strengths</span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-200">
                    {analyzeResult.strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-emerald-400 font-bold">✓</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-400">
                    <ShieldAlert className="w-4 h-4" />
                    <span>Attention Drop-Off Risks</span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-200">
                    {analyzeResult.weaknesses_or_drop_offs.map((w, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-amber-400 font-bold">⚠</span>
                        <span>{w}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Actionable Growth Tips */}
              <div className="p-5 rounded-2xl bg-indigo-950/20 border border-indigo-500/30 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-400">
                  <Lightbulb className="w-4 h-4 text-amber-300" />
                  <span>AI Recommendations for Maximum Views</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  {analyzeResult.actionable_growth_tips.map((tip, i) => (
                    <div key={i} className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 leading-relaxed">
                      <strong className="text-indigo-300 block mb-1">Tip #{i+1}</strong>
                      {tip}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-32 flex flex-col items-center justify-center text-slate-400 text-xs italic">
              Click above to evaluate hook strength, pacing curve, and drop-off risks.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
