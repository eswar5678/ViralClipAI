import os
import re
import subprocess
from pathlib import Path
from typing import Optional, Callable
from backend.config import CLIPS_DIR, get_ffmpeg_path, load_settings
from backend.models import ClipSuggestion, VideoMetadata, RenderClipRequest
from backend.services.face_tracker import calculate_crop_filter
from backend.services.subtitle_engine import generate_ass_subtitles

def detect_best_encoder() -> str:
    """Detects available hardware encoder (NVENC, QSV, AMF, or CPU libx264)."""
    ffmpeg_exe = get_ffmpeg_path()
    try:
        res = subprocess.run([ffmpeg_exe, "-encoders"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        out = res.stdout
        if "h264_nvenc" in out:
            return "h264_nvenc"
        elif "h264_qsv" in out:
            return "h264_qsv"
        elif "h264_amf" in out:
            return "h264_amf"
    except Exception:
        pass
    return "libx264"

def render_clip_pipeline(
    clip: ClipSuggestion,
    video_meta: VideoMetadata,
    render_opts: Optional[RenderClipRequest] = None,
    progress_callback: Optional[Callable[[int, str], None]] = None
) -> str:
    """Renders high-quality 9:16 vertical Short with burned-in animated subtitles."""
    ffmpeg_exe = get_ffmpeg_path()
    output_clip_path = str(CLIPS_DIR / f"{clip.clip_id}.mp4")
    
    start_time = clip.start_time
    end_time = clip.end_time
    duration = end_time - start_time

    if progress_callback:
        progress_callback(10, "Generating animated karaoke subtitles...")

    # Options setup
    preset = render_opts.subtitle_style if render_opts else clip.subtitle_style
    layout = render_opts.layout_type if render_opts else clip.layout_type
    font_fam = render_opts.font_family if render_opts else "Montserrat ExtraBold"
    font_sz = render_opts.font_size if render_opts else 24
    prim_col = render_opts.primary_color if render_opts else "#FFFFFF"
    high_col = render_opts.highlight_color if render_opts else "#FFD700"
    st_col = render_opts.stroke_color if render_opts else "#000000"
    st_w = render_opts.stroke_width if render_opts else 3
    show_em = render_opts.show_emojis if render_opts else True

    style_segs = render_opts.style_segments if (render_opts and render_opts.style_segments) else getattr(clip, "style_segments", [])
    custom_sentences = render_opts.transcript_sentences if (render_opts and render_opts.transcript_sentences) else clip.transcript_sentences

    # 1. Generate ASS subtitle file
    ass_path = generate_ass_subtitles(
        sentences=custom_sentences,
        clip_start_time=start_time,
        clip_end_time=end_time,
        preset=preset,
        font_family=font_fam,
        font_size=font_sz,
        primary_color_hex=prim_col,
        highlight_color_hex=high_col,
        stroke_color_hex=st_col,
        stroke_width=st_w,
        auto_emojis=show_em,
        style_segments=style_segs
    )

    if progress_callback:
        progress_callback(25, f"Configuring 9:16 layout ({layout})...")

    # 2. Build FFmpeg Filter Complex
    layout_filter = calculate_crop_filter(video_meta, layout_type=layout)
    
    # Escape Windows path for subtitles filter: subtitles='C\:/path/to/sub.ass'
    escaped_ass_path = ass_path.replace("\\", "/").replace(":", "\\:")
    
    # Combined filter complex: Layout -> Subtitle Burn-In
    full_filter = f"{layout_filter};[outv]subtitles='{escaped_ass_path}'[finalv]"

    # 3. Choose video encoder with pristine high-bitrate settings
    encoder = detect_best_encoder()
    encoder_args = []
    if encoder == "h264_nvenc":
        encoder_args = ["-c:v", "h264_nvenc", "-preset", "p6", "-cq", "18", "-b:v", "14M", "-maxrate", "20M", "-bufsize", "28M"]
    elif encoder == "h264_qsv":
        encoder_args = ["-c:v", "h264_qsv", "-global_quality", "19", "-b:v", "14M"]
    elif encoder == "h264_amf":
        encoder_args = ["-c:v", "h264_amf", "-quality", "quality", "-b:v", "14M"]
    else:
        encoder_args = ["-c:v", "libx264", "-preset", "medium", "-crf", "18"]

    if progress_callback:
        progress_callback(40, f"Rendering Crystal-Clear 1080x1920 60FPS Short via {encoder}...")

    cmd = [
        ffmpeg_exe, "-y",
        "-ss", str(start_time),
        "-t", str(duration),
        "-i", str(video_meta.file_path),
        "-filter_complex", full_filter,
        "-map", "[finalv]",
        "-map", "0:a?",
        *encoder_args,
        "-c:a", "aac",
        "-b:a", "320k",
        "-ar", "48000",
        "-r", "60",
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        output_clip_path
    ]

    # Run FFmpeg process and monitor progress
    process = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        universal_newlines=True
    )
    
    # Read stderr for time progress
    while True:
        line = process.stderr.readline()
        if not line and process.poll() is not None:
            break
        if "time=" in line:
            time_match = re.search(r"time=(\d+):(\d+):(\d+\.\d+)", line)
            if time_match:
                h, m, s = time_match.groups()
                current_rendered_secs = int(h) * 3600 + int(m) * 60 + float(s)
                pct = int(min(98, 40 + (current_rendered_secs / max(duration, 1.0)) * 55))
                if progress_callback:
                    progress_callback(pct, f"Rendering frame: {pct}% complete")

    if process.returncode != 0:
        # If hardware encoder or subtitle failed, retry with pure CPU fallback
        fallback_filter = calculate_crop_filter(video_meta, layout_type=layout)
        simple_filter = f"{fallback_filter};[outv]null[finalv]"
        retry_cmd = [
            ffmpeg_exe, "-y",
            "-ss", str(start_time),
            "-t", str(duration),
            "-i", str(video_meta.file_path),
            "-filter_complex", simple_filter,
            "-map", "[finalv]",
            "-map", "0:a?",
            "-c:v", "libx264",
            "-preset", "ultrafast",
            "-crf", "22",
            "-c:a", "aac",
            "-b:a", "192k",
            "-pix_fmt", "yuv420p",
            output_clip_path
        ]
        subprocess.run(retry_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)

    if progress_callback:
        progress_callback(100, "Render completed successfully!")

    return output_clip_path
