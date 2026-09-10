export interface WordTimestamp {
  word: string;
  start: float;
  end: float;
  confidence?: number;
}

export type float = number;

export interface SubtitleSentence {
  id: number;
  text: string;
  start: number;
  end: number;
  words: WordTimestamp[];
  style?: 'hormozi' | 'cyber' | 'beast' | 'minimalist';
}

export interface StyleSegment {
  start_time: number;
  end_time: number;
  style: 'hormozi' | 'cyber' | 'beast' | 'minimalist';
}

export interface VideoMetadata {
  video_id: string;
  file_path: string;
  title: string;
  duration: number;
  width: number;
  height: number;
  fps: number;
  thumbnail_url?: string;
  created_at?: string;
}

export interface ViralityMetrics {
  overall_score: number;
  hook_strength: number;
  engagement_flow: number;
  emotional_peak: number;
  retention_estimate: string;
  reasoning: string;
}

export interface ClipSuggestion {
  clip_id: string;
  video_id: string;
  start_time: number;
  end_time: number;
  duration: number;
  headline: string;
  hook_sentence: string;
  suggested_titles: string[];
  description: string;
  hashtags: string[];
  virality: ViralityMetrics;
  status: 'ready' | 'rendering' | 'rendered' | 'failed' | 'published';
  rendered_path?: string;
  layout_type: 'active_speaker' | 'split_screen' | 'blur_background' | 'fit_center';
  subtitle_style: 'hormozi' | 'cyber' | 'beast' | 'minimalist';
  transcript_sentences: SubtitleSentence[];
  style_segments?: StyleSegment[];
}

export interface SystemStatus {
  ffmpeg_ready: boolean;
  ffmpeg_path: string;
  encoder: string;
  gemini_configured: boolean;
  openai_configured: boolean;
  groq_configured: boolean;
  has_cookies?: boolean;
  youtube_authenticated: boolean;
  youtube_channel_name?: string;
}

export interface YouTubeChannelInfo {
  channel_id?: string;
  title: string;
  description?: string;
  custom_url?: string;
  avatar_url?: string;
  subscriber_count?: string;
  video_count?: string;
  authenticated: boolean;
}

export interface AppSettings {
  gemini_api_key?: string;
  openai_api_key?: string;
  groq_api_key?: string;
  youtube_client_id?: string;
  youtube_client_secret?: string;
  youtube_channel_name?: string;
  youtube_channel_id?: string;
  youtube_authenticated?: boolean;
  preferred_whisper_model?: string;
  hardware_acceleration?: string;
  default_clip_min_duration?: number;
  default_clip_max_duration?: number;
  default_subtitle_preset?: string;
  auto_emojis?: boolean;
  highlight_active_words?: boolean;
  local_ai_url?: string;
  local_ai_model?: string;
}

export interface RenderClipRequest {
  clip_id: string;
  layout_type: string;
  subtitle_style: string;
  font_family: string;
  font_size: number;
  primary_color: string;
  highlight_color: string;
  stroke_color: string;
  stroke_width: number;
  show_emojis: boolean;
  start_offset?: number;
  end_offset?: number;
  style_segments?: StyleSegment[];
  transcript_sentences?: SubtitleSentence[];
}

export interface YouTubeUploadRequest {
  clip_id: string;
  title: string;
  description: string;
  tags: string[];
  privacy_status: 'public' | 'unlisted' | 'private';
  is_short: boolean;
  schedule_time?: string;
  made_for_kids: boolean;
}

export interface YouTubeQueueItem {
  id: string;
  clip_id: string;
  title: string;
  description: string;
  privacy_status: string;
  schedule_time?: string;
  status: 'queued' | 'uploading' | 'published' | 'failed' | 'scheduled';
  progress: number;
  youtube_video_id?: string;
  youtube_url?: string;
  error_message?: string;
  created_at: string;
}

export interface YouTubeSearchResultItem {
  video_id: string;
  title: string;
  channel_title: string;
  channel_id: string;
  description: string;
  url: string;
  thumbnail_url: string;
  duration: number;
  duration_formatted: string;
  view_count: number;
  view_count_formatted: string;
  upload_date: string;
}

export interface ChannelVideoItem {
  video_id: string;
  title: string;
  url: string;
  thumbnail_url: string;
  duration: number;
  duration_formatted: string;
  view_count: number;
  view_count_formatted: string;
  upload_date: string;
}

export interface ChannelScanResult {
  channel_title: string;
  channel_id: string;
  channel_url: string;
  avatar_url: string;
  videos: ChannelVideoItem[];
  total_fetched: number;
}

export interface AIDescriptionResult {
  main_description: string;
  short_summary: string;
  suggested_cta: string;
  hashtags: string[];
}

export interface AITagsResult {
  broad_tags: string[];
  niche_tags: string[];
  trending_hashtags: string[];
  all_tags_csv: string;
  character_count: number;
}

export interface RetentionPoint {
  timestamp: string;
  retention_pct: number;
}

export interface AIAnalyzeResult {
  hook_score: number;
  overall_virality: number;
  pacing_grade: string;
  retention_curve: RetentionPoint[];
  strengths: string[];
  weaknesses_or_drop_offs: string[];
  actionable_growth_tips: string[];
}

export interface WSProgressMessage {
  stage: 'downloading' | 'transcribing' | 'analyzing' | 'clipping' | 'rendering' | 'uploading' | 'error';
  percent: number;
  message: string;
  details?: Record<string, any>;
}

export interface AutoPilotConfig {
  enabled: boolean;
  niche: string;
  language: string;
  interval_hours: number;
  privacy_status: 'public' | 'unlisted';
  subtitle_preset: 'hormozi' | 'cyber' | 'beast' | 'minimalist';
  auto_emojis: boolean;
  max_clip_duration: number;
  min_clip_duration: number;
}

export interface AutoPilotState {
  is_running_cycle: boolean;
  current_step: string;
  last_run_time?: string | null;
  next_run_time?: string | null;
  last_error?: string | null;
  total_cycles_completed: number;
}

export interface AutoPilotUploadRecord {
  youtube_video_id: string;
  title: string;
  uploaded_at: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  source_video_title: string;
  virality_score: number;
  youtube_url: string;
}

export interface AutoPilotLearnings {
  winning_topics: string[];
  avoid_topics: string[];
  hook_strategies: string[];
  latest_reflection?: {
    analyzed_at?: string;
    total_analyzed?: number;
    takeaways?: string;
    next_search_queries?: string[];
  } | null;
}

export interface AutoPilotStatusResponse {
  config: AutoPilotConfig;
  state: AutoPilotState;
  channel?: YouTubeChannelInfo | null;
  learnings: AutoPilotLearnings;
  recent_uploads: AutoPilotUploadRecord[];
}
