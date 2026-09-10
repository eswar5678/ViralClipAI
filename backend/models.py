from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import datetime

class WordTimestamp(BaseModel):
    word: str
    start: float
    end: float
    confidence: Optional[float] = 1.0

class SubtitleSentence(BaseModel):
    id: int
    text: str
    start: float
    end: float
    words: List[WordTimestamp] = []
    style: Optional[str] = None # "hormozi", "cyber", "beast", "minimalist"

class StyleSegment(BaseModel):
    start_time: float
    end_time: float
    style: str # "hormozi", "cyber", "beast", "minimalist"

class VideoMetadata(BaseModel):
    video_id: str
    file_path: str
    title: str
    duration: float
    width: int
    height: int
    fps: float
    thumbnail_url: Optional[str] = None
    created_at: Optional[str] = None

class ViralityMetrics(BaseModel):
    overall_score: int = Field(ge=0, le=100) # 0-100 score
    hook_strength: int = Field(ge=0, le=100) # 0-100
    engagement_flow: int = Field(ge=0, le=100)
    emotional_peak: int = Field(ge=0, le=100)
    retention_estimate: str = "High" # Very High, High, Medium, Moderate
    reasoning: str = ""

class ClipSuggestion(BaseModel):
    clip_id: str
    video_id: str
    start_time: float
    end_time: float
    duration: float
    headline: str
    hook_sentence: str
    suggested_titles: List[str] = []
    description: str = ""
    hashtags: List[str] = []
    virality: ViralityMetrics
    status: str = "ready" # "ready", "rendering", "rendered", "failed", "published"
    rendered_path: Optional[str] = None
    layout_type: str = "active_speaker" # "active_speaker", "split_screen", "blur_background", "fit_center"
    subtitle_style: str = "hormozi" # "hormozi", "cyber", "beast", "minimalist"
    transcript_sentences: List[SubtitleSentence] = []
    style_segments: Optional[List[StyleSegment]] = []

class VideoProcessRequest(BaseModel):
    source_type: str # "local_file" or "youtube_url"
    url_or_path: str
    clip_count: int = 5
    min_duration: int = 20
    max_duration: int = 60
    subtitle_preset: str = "hormozi"
    layout_preset: str = "active_speaker"
    use_ai: bool = True
    translate_to_english: bool = True

class RenderClipRequest(BaseModel):
    clip_id: str
    layout_type: str = "active_speaker" # "active_speaker", "split_screen", "blur_background", "fit_center"
    subtitle_style: str = "hormozi"
    font_family: str = "Montserrat ExtraBold"
    font_size: int = 24
    primary_color: str = "#FFFFFF" # Base subtitle color
    highlight_color: str = "#FFD700" # Active karaoke glowing color (gold/yellow)
    stroke_color: str = "#000000"
    stroke_width: int = 3
    show_emojis: bool = True
    start_offset: Optional[float] = 0.0
    end_offset: Optional[float] = 0.0
    style_segments: Optional[List[StyleSegment]] = []
    transcript_sentences: Optional[List[SubtitleSentence]] = None

class YouTubeUploadRequest(BaseModel):
    clip_id: str = ""
    title: str
    description: str
    tags: List[str] = []
    privacy_status: str = "public" # "public", "unlisted", "private"
    is_short: bool = True
    schedule_time: Optional[str] = None # ISO format timestamp (e.g. "2026-09-03T18:00:00Z")
    made_for_kids: bool = False

class YouTubeQueueItem(BaseModel):
    id: str
    clip_id: str
    title: str
    description: str = ""
    privacy_status: str = "unlisted"
    schedule_time: Optional[str] = None
    status: str = "queued" # "queued", "uploading", "published", "failed"
    progress: int = 0
    youtube_video_id: Optional[str] = None
    youtube_url: Optional[str] = None
    error_message: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.datetime.now().isoformat())

class WSProgressMessage(BaseModel):
    stage: str # "downloading", "transcribing", "analyzing", "clipping", "rendering", "uploading"
    percent: int
    message: str
    details: Optional[Dict[str, Any]] = None
