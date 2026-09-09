import React, { useState } from 'react';
import { Type, Sparkles, Palette, Smile, Sliders, Check, Globe, Scissors, Plus, Trash2, Wand2, Clock, Layers } from 'lucide-react';
import { SubtitleSentence, StyleSegment } from '../types';

interface SubtitleCustomizerProps {
  subtitlePreset: string;
  onPresetChange: (preset: string) => void;
  fontFamily: string;
  onFontFamilyChange: (font: string) => void;
  fontSize: number;
  onFontSizeChange: (size: number) => void;
  primaryColor: string;
  onPrimaryColorChange: (color: string) => void;
  highlightColor: string;
  onHighlightColorChange: (color: string) => void;
  strokeColor: string;
  onStrokeColorChange: (color: string) => void;
  strokeWidth: number;
  onStrokeWidthChange: (width: number) => void;
  showEmojis: boolean;
  onShowEmojisChange: (show: boolean) => void;
  // Mid-video style segments & captions editing
  clipDuration?: number;
  styleSegments?: StyleSegment[];
  onStyleSegmentsChange?: (segments: StyleSegment[]) => void;
  sentences?: SubtitleSentence[];
  onSentencesChange?: (sentences: SubtitleSentence[]) => void;
  onTranslateToEnglish?: () => void;
  isTranslating?: boolean;
  onEnhanceSubtitles?: () => void;
  isEnhancing?: boolean;
}

export const SubtitleCustomizer: React.FC<SubtitleCustomizerProps> = ({
  subtitlePreset,
  onPresetChange,
  fontFamily,
  onFontFamilyChange,
  fontSize,
  onFontSizeChange,
  primaryColor,
  onPrimaryColorChange,
  highlightColor,
  onHighlightColorChange,
  strokeColor,
  onStrokeColorChange,
  strokeWidth,
  onStrokeWidthChange,
  showEmojis,
  onShowEmojisChange,
  clipDuration = 30,
  styleSegments = [],
  onStyleSegmentsChange,
  sentences = [],
  onSentencesChange,
  onTranslateToEnglish,
  isTranslating = false,
  onEnhanceSubtitles,
  isEnhancing = false,
}) => {
  const [activeTab, setActiveTab] = useState<'presets' | 'transitions' | 'captions'>('presets');
  const [splitTime, setSplitTime] = useState(Math.round(clipDuration / 2));
  const [firstHalfStyle, setFirstHalfStyle] = useState<'hormozi' | 'cyber' | 'beast' | 'minimalist'>('hormozi');
  const [secondHalfStyle, setSecondHalfStyle] = useState<'hormozi' | 'cyber' | 'beast' | 'minimalist'>('beast');

  const presets = [
    {
      id: 'hormozi' as const,
      name: 'Alex Hormozi',
      desc: 'Glowing gold active word & bounce',
      highlight: '#FFD700',
      primary: '#FFFFFF',
      badge: 'Most Viral',
    },
    {
      id: 'cyber' as const,
      name: 'Cyber Neon',
      desc: 'Electric cyan glow with magenta outline',
      highlight: '#00F0FF',
      primary: '#FFFFFF',
      badge: 'Tech & Crypto',
    },
    {
      id: 'beast' as const,
      name: 'Beast Mode',
      desc: 'High contrast yellow/red with auto emojis',
      highlight: '#FF3B30',
      primary: '#FFCC00',
      badge: 'High CTR',
    },
    {
      id: 'minimalist' as const,
      name: 'Clean Minimal',
      desc: 'Sleek translucent pill backdrop',
      highlight: '#FFFFFF',
      primary: '#CCCCCC',
      badge: 'Aesthetic',
    },
  ];

  const handleSelectPreset = (p: typeof presets[0]) => {
    onPresetChange(p.id);
    onHighlightColorChange(p.highlight);
    onPrimaryColorChange(p.primary);
  };

  // Quick Mid-Video Split Application
  const handleApplySplit = () => {
    if (!onStyleSegmentsChange) return;
    const sTime = Math.min(Math.max(1, splitTime), Math.max(2, clipDuration - 1));
    const newSegments: StyleSegment[] = [
      { start_time: 0, end_time: sTime, style: firstHalfStyle },
      { start_time: sTime, end_time: Math.round(clipDuration), style: secondHalfStyle },
    ];
    onStyleSegmentsChange(newSegments);
  };

  // AI Dynamic Mood Switching across video
  const handleAutoDynamicMood = () => {
    if (!onStyleSegmentsChange) return;
    const dur = Math.max(clipDuration, 15);
    const p1 = Math.round(dur * 0.25); // Hook
    const p2 = Math.round(dur * 0.75); // Climax
    const dynamicSegments: StyleSegment[] = [
      { start_time: 0, end_time: p1, style: 'beast' },       // Punchy hook
      { start_time: p1, end_time: p2, style: 'hormozi' },    // Core story/insight
      { start_time: p2, end_time: Math.round(dur), style: 'cyber' }, // Peak payoff
    ];
    onStyleSegmentsChange(dynamicSegments);
  };

  // Remove a style segment
  const handleRemoveSegment = (idx: number) => {
    if (!onStyleSegmentsChange) return;
    const updated = styleSegments.filter((_, i) => i !== idx);
    onStyleSegmentsChange(updated);
  };

  // Add custom segment
  const handleAddSegment = () => {
    if (!onStyleSegmentsChange) return;
    const lastEnd = styleSegments.length > 0 ? styleSegments[styleSegments.length - 1].end_time : 0;
    const newEnd = Math.min(lastEnd + 10, Math.round(clipDuration));
    onStyleSegmentsChange([
      ...styleSegments,
      { start_time: lastEnd, end_time: newEnd, style: 'cyber' }
    ]);
  };

  // Sentence style update
  const handleSentenceStyleChange = (sentId: number, newStyle: string) => {
    if (!onSentencesChange) return;
    const updated = sentences.map((s) =>
      s.id === sentId
        ? { ...s, style: (newStyle === 'global' ? undefined : (newStyle as any)) }
        : s
    );
    onSentencesChange(updated);
  };

  // Sentence text update
  const handleSentenceTextChange = (sentId: number, newText: string) => {
    if (!onSentencesChange) return;
    const updated = sentences.map((s) => (s.id === sentId ? { ...s, text: newText } : s));
    onSentencesChange(updated);
  };

  return (
    <div className="glass-panel rounded-2xl p-4 sm:p-6 border border-slate-800 space-y-4 sm:space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3 sm:pb-4">
        <div className="flex items-center gap-2">
          <Type className="w-5 h-5 text-indigo-400" />
          <h3 className="font-display font-bold text-sm sm:text-base text-white">
            Animated Karaoke Subtitles
          </h3>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('presets')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'presets'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Presets
          </button>
          <button
            onClick={() => setActiveTab('transitions')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'transitions'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Scissors className="w-3.5 h-3.5 text-amber-400" />
            <span>Mid-Video Styles</span>
            {styleSegments.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-400" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('captions')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'captions'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <span>Translate & Edit</span>
          </button>
        </div>
      </div>

      {/* TAB 1: Global Presets & Typography */}
      {activeTab === 'presets' && (
        <div className="space-y-5">
          {/* Preset Cards */}
          <div className="space-y-2.5">
            <label className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">
              Select Caption Preset
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
              {presets.map((p) => {
                const isSelected = subtitlePreset === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => handleSelectPreset(p)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md shadow-indigo-500/10'
                        : 'bg-slate-900/50 border-slate-800/80 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-white">{p.name}</span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-indigo-400">
                        {p.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">{p.desc}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <div
                        className="w-4 h-4 rounded-full border border-black/50"
                        style={{ backgroundColor: p.highlight }}
                      />
                      <div
                        className="w-4 h-4 rounded-full border border-black/50"
                        style={{ backgroundColor: p.primary }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Typography & Styling Controls */}
          <div className="space-y-4 pt-2 border-t border-slate-800/60">
            <label className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">
              Typography & Colors
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {/* Font Family */}
              <div className="space-y-1.5">
                <span className="text-xs text-slate-400">Font Family</span>
                <select
                  value={fontFamily}
                  onChange={(e) => onFontFamilyChange(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="Montserrat ExtraBold">Montserrat Bold</option>
                  <option value="Impact">Impact (Heavy)</option>
                  <option value="Arial Black">Arial Black</option>
                  <option value="Outfit">Outfit</option>
                  <option value="Inter">Inter</option>
                </select>
              </div>

              {/* Font Size */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Font Size</span>
                  <span className="text-indigo-400 font-bold">{fontSize}px</span>
                </div>
                <input
                  type="range"
                  min="16"
                  max="36"
                  value={fontSize}
                  onChange={(e) => onFontSizeChange(Number(e.target.value))}
                  className="w-full accent-indigo-500"
                />
              </div>
            </div>

            {/* Color Pickers */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5 p-2 rounded-xl bg-slate-900/40 border border-slate-800">
                <span className="text-[11px] text-slate-400">Active Word Glow</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={highlightColor}
                    onChange={(e) => onHighlightColorChange(e.target.value)}
                    className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border-0"
                  />
                  <span className="text-xs font-mono text-slate-300">{highlightColor}</span>
                </div>
              </div>

              <div className="space-y-1.5 p-2 rounded-xl bg-slate-900/40 border border-slate-800">
                <span className="text-[11px] text-slate-400">Base Text Color</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => onPrimaryColorChange(e.target.value)}
                    className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border-0"
                  />
                  <span className="text-xs font-mono text-slate-300">{primaryColor}</span>
                </div>
              </div>

              <div className="space-y-1.5 p-2 rounded-xl bg-slate-900/40 border border-slate-800">
                <span className="text-[11px] text-slate-400">Stroke Border</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={strokeColor}
                    onChange={(e) => onStrokeColorChange(e.target.value)}
                    className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border-0"
                  />
                  <span className="text-xs font-mono text-slate-300">{strokeColor}</span>
                </div>
              </div>
            </div>

            {/* Auto Emojis Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center gap-2.5">
                <Smile className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-slate-200">AI Viral Emojis Injection</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">AI Active</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Detects 100+ high-retention triggers (💰 wealth, 🔥 hype, 🚀 growth, 🧠 insights, 😱 shock)
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={showEmojis}
                onChange={(e) => onShowEmojisChange(e.target.checked)}
                className="w-4 h-4 rounded accent-indigo-500 cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Mid-Video Style Transitions */}
      {activeTab === 'transitions' && (
        <div className="space-y-5">
          {/* Action Card: AI Dynamic Transitions */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-purple-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-white">AI Dynamic Mood Transitions</span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">1-Click</span>
              </div>
              <p className="text-[11px] text-slate-300">
                Automatically switches styles: Beast Mode for the hook, Hormozi for context, and Cyber Neon for the viral payoff!
              </p>
            </div>
            <button
              onClick={handleAutoDynamicMood}
              className="px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-black text-xs shadow-md shadow-amber-500/20 transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>Apply AI Moods</span>
            </button>
          </div>

          {/* Quick Mid-Video Split Section */}
          <div className="space-y-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scissors className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold text-white">Change Style in the Middle of Video</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">Clip: {Math.round(clipDuration)}s</span>
            </div>

            {/* Split Time Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Transition Point</span>
                <span className="text-indigo-400 font-bold">{splitTime}s (Middle)</span>
              </div>
              <input
                type="range"
                min="1"
                max={Math.max(2, Math.round(clipDuration) - 1)}
                value={splitTime}
                onChange={(e) => setSplitTime(Number(e.target.value))}
                className="w-full accent-indigo-500"
              />
            </div>

            {/* Select Styles for both halves */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="space-y-1">
                <span className="text-[11px] text-slate-400">Part 1: (0s to {splitTime}s)</span>
                <select
                  value={firstHalfStyle}
                  onChange={(e) => setFirstHalfStyle(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200"
                >
                  <option value="hormozi">Alex Hormozi (Gold Glow)</option>
                  <option value="cyber">Cyber Neon (Cyan/Magenta)</option>
                  <option value="beast">Beast Mode (Red/Yellow)</option>
                  <option value="minimalist">Clean Minimal (Pill)</option>
                </select>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] text-slate-400">Part 2: ({splitTime}s to {Math.round(clipDuration)}s)</span>
                <select
                  value={secondHalfStyle}
                  onChange={(e) => setSecondHalfStyle(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200"
                >
                  <option value="beast">Beast Mode (Red/Yellow)</option>
                  <option value="cyber">Cyber Neon (Cyan/Magenta)</option>
                  <option value="hormozi">Alex Hormozi (Gold Glow)</option>
                  <option value="minimalist">Clean Minimal (Pill)</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleApplySplit}
              className="w-full mt-2 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply Mid-Video Style Change</span>
            </button>
          </div>

          {/* Active Style Segments List */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                <span>Active Style Segments ({styleSegments.length})</span>
              </label>
              <button
                onClick={handleAddSegment}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Add Segment</span>
              </button>
            </div>

            {styleSegments.length === 0 ? (
              <div className="text-center p-4 rounded-xl border border-dashed border-slate-800 text-xs text-slate-400">
                No mid-video transitions yet. The clip currently uses the default preset across its entire duration. Use the split control above or add a segment!
              </div>
            ) : (
              <div className="space-y-2">
                {styleSegments.map((seg, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/70 border border-slate-800 gap-2"
                  >
                    <div className="flex items-center gap-2 font-mono text-xs text-indigo-300">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{seg.start_time}s - {seg.end_time}s</span>
                    </div>

                    <select
                      value={seg.style}
                      onChange={(e) => {
                        if (!onStyleSegmentsChange) return;
                        const updated = [...styleSegments];
                        updated[idx].style = e.target.value as any;
                        onStyleSegmentsChange(updated);
                      }}
                      className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200"
                    >
                      <option value="hormozi">Alex Hormozi</option>
                      <option value="cyber">Cyber Neon</option>
                      <option value="beast">Beast Mode</option>
                      <option value="minimalist">Clean Minimal</option>
                    </select>

                    <button
                      onClick={() => handleRemoveSegment(idx)}
                      className="p-1 rounded text-slate-400 hover:text-red-400 cursor-pointer"
                      title="Remove segment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Captions & Translation */}
      {activeTab === 'captions' && (
        <div className="space-y-4">
          {/* Translation & Enhancement Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={onTranslateToEnglish}
              disabled={isTranslating}
              className="p-3 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-cyan-600/20 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isTranslating ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Globe className="w-4 h-4 text-cyan-200" />
              )}
              <span>Translate Captions to English</span>
            </button>

            {onEnhanceSubtitles && (
              <button
                onClick={onEnhanceSubtitles}
                disabled={isEnhancing}
                className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-indigo-500/40 text-indigo-300 font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isEnhancing ? (
                  <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 text-amber-400" />
                )}
                <span>AI Emojis & Pacing</span>
              </button>
            )}
          </div>

          <div className="text-[11px] text-slate-400 bg-slate-900/40 p-2.5 rounded-xl border border-slate-800/80">
            💡 Translates foreign speech (Spanish, Hindi, French, Japanese, etc.) into high-retention English while preserving word karaoke synchronization. You can also edit any sentence text or assign a custom style to specific phrases below!
          </div>

          {/* Sentence-by-sentence list */}
          <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
            {sentences.length === 0 ? (
              <div className="text-center p-6 text-xs text-slate-400">
                No captions loaded for this clip.
              </div>
            ) : (
              sentences.map((sent) => (
                <div
                  key={sent.id}
                  className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-slate-400 text-[11px]">
                      {sent.start.toFixed(1)}s - {sent.end.toFixed(1)}s
                    </span>

                    {/* Per-sentence style selector */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-400">Style:</span>
                      <select
                        value={sent.style || 'global'}
                        onChange={(e) => handleSentenceStyleChange(sent.id, e.target.value)}
                        className="bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-[11px] text-slate-200 font-medium"
                      >
                        <option value="global">Default ({subtitlePreset})</option>
                        <option value="hormozi">Alex Hormozi</option>
                        <option value="cyber">Cyber Neon</option>
                        <option value="beast">Beast Mode</option>
                        <option value="minimalist">Clean Minimal</option>
                      </select>
                    </div>
                  </div>

                  {/* Inline text editor */}
                  <input
                    type="text"
                    value={sent.text}
                    onChange={(e) => handleSentenceTextChange(sent.id, e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
