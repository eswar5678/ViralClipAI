import os
import re
import json
import uuid
import shutil
import subprocess
from pathlib import Path
from typing import Optional, Callable
import yt_dlp
from backend.config import UPLOADS_DIR, COOKIES_FILE, get_ffmpeg_path
from backend.models import VideoMetadata

def extract_video_metadata(file_path: str, custom_title: Optional[str] = None) -> VideoMetadata:
    """Uses ffprobe / ffmpeg to extract video resolution, fps, duration and title."""
    ffmpeg_exe = get_ffmpeg_path()
    file_path = str(Path(file_path).resolve())
    
    # Generate thumbnail
    video_id = str(uuid.uuid4())[:8]
    thumb_path = UPLOADS_DIR / f"{video_id}_thumb.jpg"
    
    # Try ffprobe or ffmpeg frame extraction
    cmd = [
        ffmpeg_exe, "-y",
        "-ss", "00:00:02",
        "-i", file_path,
        "-vframes", "1",
        "-q:v", "2",
        str(thumb_path)
    ]
    try:
        subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)
    except Exception:
        pass

    # Basic duration & size detection via ffmpeg -i info stderr
    info_cmd = [ffmpeg_exe, "-i", file_path]
    res = subprocess.run(info_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    out = res.stderr
    
    duration = 60.0
    width = 1920
    height = 1080
    fps = 30.0

    # Parse duration: Duration: 00:01:23.45
    dur_match = re.search(r"Duration:\s*(\d+):(\d+):(\d+\.\d+)", out)
    if dur_match:
        h, m, s = dur_match.groups()
        duration = int(h) * 3600 + int(m) * 60 + float(s)

    # Parse video stream dimensions: 1920x1080
    dim_match = re.search(r"Video:.*?(\d{3,4})x(\d{3,4})", out)
    if dim_match:
        width = int(dim_match.group(1))
        height = int(dim_match.group(2))

    # Parse FPS: 29.97 fps or 30 fps or 60 fps
    fps_match = re.search(r"(\d+(?:\.\d+)?)\s*fps", out)
    if fps_match:
        fps = float(fps_match.group(1))

    title = custom_title or Path(file_path).stem.replace("_", " ").title()

    return VideoMetadata(
        video_id=video_id,
        file_path=file_path,
        title=title,
        duration=duration,
        width=width,
        height=height,
        fps=fps,
        thumbnail_url=f"/api/thumbnails/{thumb_path.name}" if thumb_path.exists() else None
    )

def sanitize_youtube_url(url: str) -> str:
    """Sanitizes shorts and tracking queries into clean YouTube URLs."""
    if not url:
        return url
    url = url.strip()
    shorts_match = re.search(r'shorts/([a-zA-Z0-9_-]+)', url)
    if shorts_match:
        return f"https://www.youtube.com/watch?v={shorts_match.group(1)}"
    # Clean si tracking parameter
    if "youtu.be/" in url:
        v_id = url.split("youtu.be/")[1].split("?")[0]
        return f"https://www.youtube.com/watch?v={v_id}"
    return url

def get_node_path() -> Optional[str]:
    """Finds Node.js binary for yt-dlp JavaScript challenge solver."""
    p = shutil.which("node")
    if p:
        return p
    for cand in [
        r"D:\Apps\node.exe",
        r"C:\Program Files\nodejs\node.exe",
        r"C:\Program Files (x86)\nodejs\node.exe",
        os.path.expanduser(r"~\AppData\Roaming\nvm\current\node.exe"),
    ]:
        if os.path.exists(cand):
            return cand
    return None

def download_youtube_video(
    youtube_url: str,
    progress_callback: Optional[Callable[[int, str], None]] = None
) -> VideoMetadata:
    """Downloads highest available quality YouTube video (up to 4K/1080p60) and merges with audio via FFmpeg."""
    clean_url = sanitize_youtube_url(youtube_url)
    video_id = str(uuid.uuid4())[:8]
    
    output_template = str(UPLOADS_DIR / f"{video_id}_%(title).100s.%(ext)s")
    ffmpeg_exe = get_ffmpeg_path()
    ffmpeg_dir = os.path.dirname(ffmpeg_exe) if os.path.exists(ffmpeg_exe) else ffmpeg_exe
    node_exe = get_node_path()
    
    def ytdl_hook(d):
        if d['status'] == 'downloading':
            total = d.get('total_bytes') or d.get('total_bytes_estimate') or 1
            downloaded = d.get('downloaded_bytes', 0)
            percent = int((downloaded / total) * 100)
            speed = d.get('_speed_str', '')
            eta = d.get('_eta_str', '')
            msg = f"Downloading High-Quality YouTube Video: {percent}% ({speed}, ETA {eta})"
            if progress_callback:
                try:
                    progress_callback(percent, msg)
                except Exception:
                    pass
        elif d['status'] == 'finished':
            if progress_callback:
                try:
                    progress_callback(100, "Download completed. Processing video...")
                except Exception:
                    pass

    ydl_opts = {
        # Pristine High-Quality: Full 4K/1440p/1080p60 video + highest bitrate audio (opus/m4a), merged cleanly by FFmpeg into MP4!
        'format': 'bestvideo[height<=2160]+bestaudio/bestvideo+bestaudio/best',
        'outtmpl': output_template,
        'ffmpeg_location': ffmpeg_dir,
        'progress_hooks': [ytdl_hook],
        'merge_output_format': 'mp4',
        'extractor_args': {
            'youtube': {
                'player_client': ['ios', 'android', 'mweb', 'tv', 'web']
            }
        },
        'http_headers': {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
        },
        'socket_timeout': 30,
        'retries': 10,
        'fragment_retries': 10,
        'http_chunk_size': 10485760,
        'writesubtitles': True,
        'writeautomaticsub': True,
        'subtitleslangs': ['en.*', 'es.*', 'hi.*', 'fr.*', 'de.*', 'ja.*', 'pt.*', 'ru.*', 'ar.*', 'all'],
        'subtitlesformat': 'vtt',
        'quiet': True,
        'no_warnings': True,
        'nocheckcertificate': True,
        'ignoreerrors': False,
    }

    if node_exe:
        ydl_opts['js_runtimes'] = {'node': {'path': node_exe}}

    if COOKIES_FILE.exists() and COOKIES_FILE.stat().st_size > 10:
        ydl_opts['cookiefile'] = str(COOKIES_FILE)

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(clean_url, download=True)
            if not info:
                raise ValueError("Could not extract video information from YouTube URL.")
            filename = ydl.prepare_filename(info)
            video_title = info.get('title', 'YouTube Video')
            
            # Ensure mp4 extension if merged
            if not os.path.exists(filename):
                base_fn = os.path.splitext(filename)[0] + ".mp4"
                if os.path.exists(base_fn):
                    filename = base_fn
                else:
                    # Find any matching file in uploads directory with video_id
                    candidates = list(UPLOADS_DIR.glob(f"{video_id}_*"))
                    if candidates:
                        filename = str(candidates[0])
    except Exception as e:
        err_msg = str(e)
        if "confirm your age" in err_msg.lower() or "age-restricted" in err_msg.lower():
            raise ValueError(
                "This video is age-restricted by YouTube. "
                "Please choose a non-age-restricted video or upload a cookies.txt file in Settings."
            )
        raise e

    if not os.path.exists(filename):
        raise FileNotFoundError("Downloaded YouTube video file could not be located on disk.")

    return extract_video_metadata(filename, custom_title=video_title)
