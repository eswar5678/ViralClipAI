import os
import sys
import subprocess
from pathlib import Path

# Ensure UTF-8 output encoding on Windows
if sys.platform.startswith("win"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

from backend.config import TEMP_DIR, CLIPS_DIR, get_ffmpeg_path
from backend.models import VideoMetadata, RenderClipRequest
from backend.services.downloader import extract_video_metadata
from backend.services.transcriber import transcribe_audio
from backend.services.virality_analyzer import analyze_virality_and_slice
from backend.services.video_renderer import render_clip_pipeline

def test_full_pipeline():
    print("--- [TEST] Testing Complete Clipper Pipeline ---")
    ffmpeg_exe = get_ffmpeg_path()
    test_video_path = TEMP_DIR / "test_input.mp4"

    # 1. Generate 10-second synthetic test video with audio
    print("[1/5] Generating synthetic test video...")
    gen_cmd = [
        ffmpeg_exe, "-y",
        "-f", "lavfi", "-i", "testsrc=size=1920x1080:rate=30:duration=8",
        "-f", "lavfi", "-i", "sine=frequency=440:duration=8",
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        str(test_video_path)
    ]
    subprocess.run(gen_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
    assert test_video_path.exists(), "Test video was not generated"

    # 2. Test Video Metadata Extraction
    print("[2/5] Extracting video metadata...")
    meta = extract_video_metadata(str(test_video_path))
    assert meta.width == 1920 and meta.height == 1080
    print(f"  -> Extracted metadata: {meta.width}x{meta.height}, {meta.duration}s, {meta.fps}fps")

    # 3. Test Audio Transcription
    print("[3/5] Transcribing audio with word timestamps...")
    transcript = transcribe_audio(str(test_video_path))
    assert len(transcript) > 0
    print(f"  -> Generated {len(transcript)} subtitle sentences with word timestamps")

    # 4. Test Virality Analyzer & Slicing
    print("[4/5] Analyzing virality and slicing clips...")
    clips = analyze_virality_and_slice(video_meta=meta, transcript=transcript, clip_count=2)
    assert len(clips) > 0
    top_clip = clips[0]
    print(f"  -> Top Clip: '{top_clip.headline}', Virality Score: {top_clip.virality.overall_score}/100")
    print(f"  -> Hook: '{top_clip.hook_sentence}'")
    print(f"  -> Suggested Titles: {top_clip.suggested_titles}")

    # 5. Test 9:16 Video Rendering with Hormozi Karaoke Subtitles
    print("[5/5] Rendering 9:16 Short with Alex Hormozi Karaoke Captions...")
    render_req = RenderClipRequest(
        clip_id=top_clip.clip_id,
        layout_type="active_speaker",
        subtitle_style="hormozi",
        font_family="Montserrat ExtraBold",
        font_size=24,
        primary_color="#FFFFFF",
        highlight_color="#FFD700",
        stroke_color="#000000",
        stroke_width=3,
        show_emojis=True
    )
    rendered_file = render_clip_pipeline(clip=top_clip, video_meta=meta, render_opts=render_req)
    assert Path(rendered_file).exists(), "Rendered MP4 file was not created"
    rendered_size = os.path.getsize(rendered_file)
    print(f"  -> Rendered Short: {rendered_file} ({rendered_size} bytes)")

    print("\n[SUCCESS] All Clipper Pipeline Tests Passed Successfully!\n")

if __name__ == "__main__":
    test_full_pipeline()
