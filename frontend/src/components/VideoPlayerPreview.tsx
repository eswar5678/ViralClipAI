import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize2, Layout, Sparkles } from 'lucide-react';
import { ClipSuggestion, VideoMetadata, StyleSegment } from '../types';
import { getApiBaseUrl } from '../api';

interface VideoPlayerPreviewProps {
  clip: ClipSuggestion;
  videoMeta: VideoMetadata | null;
  subtitlePreset: string;
  layoutPreset: string;
  fontFamily: string;
  fontSize: number;
  primaryColor: string;
  highlightColor: string;
  showEmojis: boolean;
  styleSegments?: StyleSegment[];
}

export const VideoPlayerPreview: React.FC<VideoPlayerPreviewProps> = ({
  clip,
  videoMeta,
  subtitlePreset,
  layoutPreset,
  fontFamily,
  fontSize,
  primaryColor,
  highlightColor,
  showEmojis,
  styleSegments = [],
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  const clipDuration = clip.duration || (clip.end_time - clip.start_time);
  const isRendered = clip.status === 'rendered' && clip.rendered_path;

  // Sync playback loop to clip start and end timestamps
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!isRendered) {
      video.currentTime = clip.start_time;
    }

    const handleTimeUpdate = () => {
      if (isRendered) {
        setCurrentTime(video.currentTime);
      } else {
        const relTime = video.currentTime - clip.start_time;
        setCurrentTime(Math.max(0, relTime));

        // Loop clip within bounds
        if (video.currentTime >= clip.end_time) {
          video.currentTime = clip.start_time;
          if (!isPlaying) video.pause();
        }
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, [clip, isRendered, isPlaying]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      video.play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const seekRel = Number(e.target.value);
    if (isRendered) {
      video.currentTime = seekRel;
    } else {
      video.currentTime = clip.start_time + seekRel;
    }
    setCurrentTime(seekRel);
  };

  // Find active sentence and active word for live karaoke preview
  const currentAbsTime = isRendered ? clip.start_time + currentTime : clip.start_time + currentTime;
  const activeSentence = clip.transcript_sentences.find(
    (s) => s.start <= currentAbsTime && s.end >= currentAbsTime
  );

  // Determine current effective style dynamically (per-sentence override -> styleSegments timeline -> global preset)
  const relTime = currentTime;
  let effectiveStyle = subtitlePreset || 'hormozi';
  const effectiveSegments = styleSegments && styleSegments.length > 0 ? styleSegments : (clip.style_segments || []);
  if (effectiveSegments.length > 0) {
    const matchedSeg = effectiveSegments.find((seg) => relTime >= seg.start_time && relTime <= seg.end_time);
    if (matchedSeg) {
      effectiveStyle = matchedSeg.style;
    }
  }
  if (activeSentence?.style) {
    effectiveStyle = activeSentence.style;
  }

  const getWordStyleClass = (isActive: boolean, style: string) => {
    if (style === 'cyber') return isActive ? 'cyber-active' : 'cyber-static';
    if (style === 'beast') return isActive ? 'beast-active' : 'beast-static';
    if (style === 'minimalist') return isActive ? 'minimalist-active' : 'minimalist-static';
    return isActive ? 'hormozi-active' : 'hormozi-static';
  };

  return (
    <div className="flex flex-col items-center justify-center p-2 sm:p-4 w-full">
      {/* 9:16 Vertical Video Frame */}
      <div className="w-full max-w-[280px] xs:max-w-[320px] sm:max-w-[360px] aspect-[9/16] max-h-[62vh] sm:max-h-[640px] bg-slate-950 rounded-3xl overflow-hidden border-2 border-slate-800 shadow-2xl relative flex items-center justify-center group">
        {/* Video Element */}
        <video
          ref={videoRef}
          src={
            isRendered
              ? `${getApiBaseUrl()}/clips/rendered/${clip.clip_id}`
              : videoMeta?.file_path
              ? `${getApiBaseUrl()}/clips/rendered/${clip.clip_id}`
              : undefined
          }
          className={`w-full h-full object-cover ${
            layoutPreset === 'blur_background'
              ? 'scale-105 filter blur-sm'
              : layoutPreset === 'fit_center'
              ? 'object-contain'
              : 'object-cover'
          }`}
          muted={isMuted}
          playsInline
        />

        {/* Blurred Layout Center Foreground */}
        {layoutPreset === 'blur_background' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-full aspect-video shadow-2xl overflow-hidden border-y border-white/10">
              <video
                src={isRendered ? `${getApiBaseUrl()}/clips/rendered/${clip.clip_id}` : undefined}
                className="w-full h-full object-cover"
                muted
              />
            </div>
          </div>
        )}

        {/* Live Synchronized Karaoke Subtitles Overlay (When previewing raw clip) */}
        {!isRendered && (
          <div className="absolute bottom-20 left-4 right-4 text-center pointer-events-none z-20 transition-all">
            {activeSentence ? (
              <div className="inline-block p-3 rounded-2xl bg-black/50 backdrop-blur-md border border-white/15 shadow-2xl max-w-xs transition-all">
                <div className="flex flex-wrap items-center justify-center gap-1.5 leading-tight">
                  {activeSentence.words && activeSentence.words.length > 0 ? (
                    activeSentence.words.map((w, idx) => {
                      const isWordActive = currentAbsTime >= w.start && currentAbsTime <= w.end;
                      return (
                        <span
                          key={idx}
                          className={`transition-all duration-75 text-sm ${getWordStyleClass(isWordActive, effectiveStyle)}`}
                          style={{
                            color: isWordActive
                              ? effectiveStyle === 'cyber'
                                ? '#00F0FF'
                                : effectiveStyle === 'beast'
                                ? '#FF3B30'
                                : effectiveStyle === 'minimalist'
                                ? '#FFFFFF'
                                : highlightColor
                              : effectiveStyle === 'beast'
                              ? '#FFCC00'
                              : effectiveStyle === 'minimalist'
                              ? '#CCCCCC'
                              : primaryColor,
                          }}
                        >
                          {w.word}
                        </span>
                      );
                    })
                  ) : (
                    <span className={`text-sm ${getWordStyleClass(true, effectiveStyle)}`}>
                      {activeSentence.text}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-xs text-white/50 bg-black/20 backdrop-blur-sm px-3 py-1 rounded-full inline-block">
                [Subtitles preview ready]
              </div>
            )}
          </div>
        )}

        {/* 9:16 Aspect Guide Lines & Layout Badge */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-10">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[11px] font-bold text-white">
            <Layout className="w-3 h-3 text-indigo-400" />
            <span className="capitalize">{layoutPreset.replace('_', ' ')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="px-2 py-0.5 rounded-md bg-amber-500/90 text-black text-[10px] font-black uppercase flex items-center gap-1 shadow-md shadow-amber-500/20">
              <Sparkles className="w-2.5 h-2.5 text-black" />
              <span>{effectiveStyle}</span>
            </div>
            <div className="px-2 py-0.5 rounded-md bg-indigo-500/80 text-white text-[10px] font-extrabold uppercase">
              9:16
            </div>
          </div>
        </div>

        {/* Big Center Play/Pause Button */}
        <button
          onClick={togglePlay}
          className={`absolute inset-0 flex items-center justify-center bg-black/20 ${
            isPlaying ? 'opacity-0 hover:opacity-100' : 'opacity-100'
          } transition-opacity z-30 cursor-pointer`}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-indigo-600/90 text-white flex items-center justify-center shadow-xl hover:scale-110 transition-transform">
            {isPlaying ? <Pause className="w-6 h-6 sm:w-8 sm:h-8" /> : <Play className="w-6 h-6 sm:w-8 sm:h-8 translate-x-0.5" />}
          </div>
        </button>

        {/* Bottom Playback Scrubber Bar */}
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex items-center gap-3 z-30">
          <button onClick={togglePlay} className="text-white hover:text-indigo-400 transition-colors">
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          
          <input
            type="range"
            min="0"
            max={clipDuration || 30}
            step="0.1"
            value={currentTime}
            onChange={handleSeek}
            className="flex-1 accent-indigo-500 h-1 bg-slate-700 rounded-lg cursor-pointer"
          />

          <span className="text-[11px] font-mono text-slate-300">
            {Math.floor(currentTime)}s / {Math.round(clipDuration)}s
          </span>

          <button
            onClick={() => setIsMuted(!isMuted)}
            className="text-slate-300 hover:text-white transition-colors"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};
