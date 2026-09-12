import sys
import os
import json
from pathlib import Path
from pydantic import BaseModel
from typing import Optional

if getattr(sys, 'frozen', False):
    ROOT_DIR = Path(sys.executable).parent
    if ROOT_DIR.name == "_internal":
        ROOT_DIR = ROOT_DIR.parent
else:
    ROOT_DIR = Path(__file__).resolve().parent.parent

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = ROOT_DIR / "backend" / "data" if (ROOT_DIR / "backend").exists() else ROOT_DIR / "data"
UPLOADS_DIR = DATA_DIR / "uploads"
CLIPS_DIR = DATA_DIR / "clips"
TEMP_DIR = DATA_DIR / "temp"
SETTINGS_FILE = DATA_DIR / "settings.json"
QUEUE_FILE = DATA_DIR / "youtube_queue.json"
COOKIES_FILE = DATA_DIR / "cookies.txt"

for d in [DATA_DIR, UPLOADS_DIR, CLIPS_DIR, TEMP_DIR]:
    d.mkdir(parents=True, exist_ok=True)

class AppSettings(BaseModel):
    gemini_api_key: Optional[str] = ""
    openai_api_key: Optional[str] = ""
    groq_api_key: Optional[str] = ""
    youtube_api_key: Optional[str] = ""
    youtube_client_id: Optional[str] = ""
    youtube_client_secret: Optional[str] = ""
    youtube_channel_name: Optional[str] = ""
    youtube_channel_id: Optional[str] = ""
    youtube_authenticated: bool = False
    preferred_whisper_model: str = "base" # tiny, base, small, medium, large, api
    hardware_acceleration: str = "auto" # auto, cuda, qsv, amf, cpu
    default_clip_min_duration: int = 15
    default_clip_max_duration: int = 60
    default_subtitle_preset: str = "hormozi" # hormozi, cyber, beast, minimalist
    auto_emojis: bool = True
    highlight_active_words: bool = True
    local_ai_url: str = "http://localhost:11434/v1"
    local_ai_model: str = "llama3:latest"
    # Email Alerts & Milestones
    alert_email: Optional[str] = ""
    smtp_enabled: bool = False
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: Optional[str] = ""
    smtp_password: Optional[str] = ""
    notify_on_error: bool = True
    notify_on_milestone: bool = True
    milestone_view_threshold: int = 100000

def load_settings() -> AppSettings:
    if SETTINGS_FILE.exists():
        try:
            with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                return AppSettings(**data)
        except Exception:
            return AppSettings()
    return AppSettings()

def save_settings(settings: AppSettings):
    with open(SETTINGS_FILE, "w", encoding="utf-8") as f:
        json.dump(settings.model_dump(), f, indent=2)

def get_ffmpeg_path() -> str:
    """Finds or extracts bundled FFmpeg binary path, ensures ffmpeg.exe exists, and is in PATH."""
    try:
        import imageio_ffmpeg
        import shutil
        raw_exe = imageio_ffmpeg.get_ffmpeg_exe()
        if os.path.exists(raw_exe):
            ffmpeg_dir = Path(raw_exe).parent
            standard_exe = ffmpeg_dir / "ffmpeg.exe"
            if not standard_exe.exists():
                try:
                    shutil.copy2(raw_exe, standard_exe)
                except Exception:
                    pass
            exe_to_use = str(standard_exe) if standard_exe.exists() else raw_exe
            ffmpeg_dir_str = str(ffmpeg_dir)
            if ffmpeg_dir_str not in os.environ.get("PATH", ""):
                os.environ["PATH"] = ffmpeg_dir_str + os.pathsep + os.environ.get("PATH", "")
            return exe_to_use
    except Exception:
        pass
    
    # Fallback to system ffmpeg if installed in PATH
    return "ffmpeg"
