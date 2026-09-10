import os
import json
import uuid
import asyncio
import datetime
import traceback
from pathlib import Path
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

from backend.config import DATA_DIR, TEMP_DIR, CLIPS_DIR, load_settings
from backend.models import YouTubeUploadRequest, ClipSuggestion, VideoMetadata
from backend.services.ai_tools import call_llm_json, generate_ai_description, generate_viral_tags
from backend.services.youtube_search import search_youtube
from backend.services.downloader import download_youtube_video
from backend.services.transcriber import transcribe_audio
from backend.services.virality_analyzer import analyze_virality_and_slice
from backend.services.video_renderer import render_clip_pipeline
from backend.services.youtube_publisher import (
    get_channel_details,
    upload_video_to_youtube,
    get_uploaded_videos_stats,
    get_recent_channel_uploads
)

AUTOPILOT_CONFIG_FILE = DATA_DIR / "autopilot_config.json"
AGENT_MEMORY_FILE = DATA_DIR / "agent_memory.json"
PROCESSED_HISTORY_FILE = DATA_DIR / "processed_history.json"

DEFAULT_GTA_SEARCH_PROMPTS = [
    "GTA 5 funny moments English",
    "GTA 5 insane stunts and fails",
    "GTA Online high speed police chase escape",
    "GTA 5 unexpected chaos moments",
    "GTA RP funniest roleplay moments",
    "GTA 6 insane gameplay leak analysis",
    "GTA 5 instant karma moments",
    "GTA Online unbelievable lucky moments"
]

class AutoPilotConfig(BaseModel):
    enabled: bool = True
    niche: str = "Grand Theft Auto (GTA)"
    language: str = "English"
    interval_hours: float = 12.0 # Run twice daily
    privacy_status: str = "public" # public or unlisted
    subtitle_preset: str = "hormozi"
    auto_emojis: bool = True
    max_clip_duration: int = 55
    min_clip_duration: int = 22

class AutoPilotState:
    is_running_cycle: bool = False
    current_step: str = "Idle"
    last_run_time: Optional[str] = None
    next_run_time: Optional[str] = None
    last_error: Optional[str] = None
    total_cycles_completed: int = 0

state = AutoPilotState()

def load_autopilot_config() -> AutoPilotConfig:
    if AUTOPILOT_CONFIG_FILE.exists():
        try:
            with open(AUTOPILOT_CONFIG_FILE, "r", encoding="utf-8") as f:
                return AutoPilotConfig(**json.load(f))
        except Exception:
            pass
    return AutoPilotConfig()

def save_autopilot_config(cfg: AutoPilotConfig) -> None:
    with open(AUTOPILOT_CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(cfg.model_dump(), f, indent=2)

def load_agent_memory() -> Dict[str, Any]:
    if AGENT_MEMORY_FILE.exists():
        try:
            with open(AGENT_MEMORY_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {
        "uploads": [],
        "reflections": [],
        "winning_topics": [
            "Police Chases & 5-Star Escapes",
            "Hilarious NPC & Physics Glitches",
            "GTA RP Unexpected Encounters",
            "Crazy Stunts with Immediate Karma"
        ],
        "avoid_topics": [
            "Silent driving montages",
            "Low-energy story cutscenes without voiceover"
        ],
        "hook_strategies": [
            "Curiosity gap questions: 'He thought he was safe... 💀'",
            "Shocking opening in the first 2 seconds",
            "High contrast text captions with dynamic emojis"
        ]
    }

def save_agent_memory(mem: Dict[str, Any]) -> None:
    with open(AGENT_MEMORY_FILE, "w", encoding="utf-8") as f:
        json.dump(mem, f, indent=2)

def load_processed_history() -> List[str]:
    if PROCESSED_HISTORY_FILE.exists():
        try:
            with open(PROCESSED_HISTORY_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return []

def record_processed_video_id(vid: str) -> None:
    history = load_processed_history()
    if vid not in history:
        history.append(vid)
        # Keep last 500 IDs
        history = history[-500:]
        with open(PROCESSED_HISTORY_FILE, "w", encoding="utf-8") as f:
            json.dump(history, f, indent=2)

def reflect_and_learn_from_analytics() -> Dict[str, Any]:
    """Inspects real YouTube view counts of past uploads and prompts the AI to synthesize performance learnings."""
    memory = load_agent_memory()
    uploads = memory.get("uploads", [])

    # 1. Fetch live updated stats from YouTube Data API
    if uploads:
        video_ids = [u.get("youtube_video_id") for u in uploads if u.get("youtube_video_id")]
        live_stats = get_uploaded_videos_stats(video_ids)
        stats_map = {s["video_id"]: s for s in live_stats}
        settings = load_settings()
        milestone_target = settings.milestone_view_threshold or 100000

        for u in uploads:
            vid = u.get("youtube_video_id")
            if vid in stats_map:
                new_views = stats_map[vid].get("view_count", u.get("view_count", 0))
                u["view_count"] = new_views
                u["like_count"] = stats_map[vid].get("like_count", u.get("like_count", 0))
                u["comment_count"] = stats_map[vid].get("comment_count", u.get("comment_count", 0))

                # Check if video reached viral milestone (e.g. 100,000 views)
                milestones_notified = u.get("milestones_notified", [])
                milestone_key = f"{milestone_target // 1000}k" if milestone_target >= 1000 else str(milestone_target)
                if new_views >= milestone_target and milestone_key not in milestones_notified:
                    try:
                        from backend.services.email_service import send_milestone_alert
                        send_milestone_alert(
                            video_title=u.get("title", "GTA Viral Short"),
                            youtube_url=u.get("youtube_url") or f"https://youtube.com/shorts/{vid}",
                            view_count=new_views,
                            like_count=u.get("like_count", 0),
                            milestone=milestone_target
                        )
                        milestones_notified.append(milestone_key)
                        u["milestones_notified"] = milestones_notified
                    except Exception as me:
                        print(f"[AutoPilot Milestone Alert Error] {me}")

        memory["uploads"] = uploads
        save_agent_memory(memory)

    # 2. Build summary prompt for LLM Reflection
    recent_uploads_summary = []
    for u in uploads[-10:]:
        recent_uploads_summary.append(
            f"- Title: \"{u.get('title')}\" | Views: {u.get('view_count', 0)} | Likes: {u.get('like_count', 0)} | Topic: {u.get('topic', 'GTA')}"
        )

    prompt = f"""You are the Master YouTube Shorts Algorithm Strategist for an automated English Grand Theft Auto (GTA) channel.
Analyze our recent upload performance and current strategy to generate actionable intelligence.

Recent Upload Performance:
{chr(10).join(recent_uploads_summary) if recent_uploads_summary else "No historical uploads yet - initialize initial high-performing GTA hypotheses."}

Current Winning Topics: {json.dumps(memory.get("winning_topics", []))}
Topics to Avoid: {json.dumps(memory.get("avoid_topics", []))}

Generate an analytical reflection:
1. Identify which types of GTA content (chases, RP, glitches, funny moments) have the highest viral probability.
2. Formulate 4 specific English search queries for YouTube that will yield fresh, high-velocity clips.
3. Suggest the optimal hook style and title formula for the next upload.

Return ONLY valid JSON matching this schema:
{{
  "summary": "Brief executive reflection on performance and audience retention (under 60 words)",
  "top_performing_topics": ["Topic 1", "Topic 2", "Topic 3"],
  "underperforming_topics": ["Topic to avoid 1", "Topic to avoid 2"],
  "hook_recommendations": ["Recommendation 1", "Recommendation 2"],
  "recommended_next_searches": [
    "GTA 5 search query 1",
    "GTA 5 search query 2",
    "GTA RP search query 3",
    "GTA Online search query 4"
  ]
}}"""

    system_prompt = "You are an elite YouTube Shorts growth engineer and data scientist specializing in gaming virality."
    reflection_res = call_llm_json(system_prompt, prompt)

    if reflection_res and "recommended_next_searches" in reflection_res:
        reflection_record = {
            "timestamp": datetime.datetime.now().isoformat(),
            "summary": reflection_res.get("summary", "Optimized search based on gaming virality metrics."),
            "top_performing_topics": reflection_res.get("top_performing_topics", memory.get("winning_topics", [])),
            "underperforming_topics": reflection_res.get("underperforming_topics", memory.get("avoid_topics", [])),
            "hook_recommendations": reflection_res.get("hook_recommendations", memory.get("hook_strategies", [])),
            "recommended_next_searches": reflection_res.get("recommended_next_searches", DEFAULT_GTA_SEARCH_PROMPTS[:4])
        }

        memory["winning_topics"] = reflection_record["top_performing_topics"]
        memory["avoid_topics"] = reflection_record["underperforming_topics"]
        memory["hook_strategies"] = reflection_record["hook_recommendations"]
        if "reflections" not in memory:
            memory["reflections"] = []
        memory["reflections"].insert(0, reflection_record)
        memory["reflections"] = memory["reflections"][:20]
        save_agent_memory(memory)
        return reflection_record

    return {
        "timestamp": datetime.datetime.now().isoformat(),
        "summary": "Focusing on high-intensity GTA 5 police escapes and funny roleplay moments.",
        "top_performing_topics": memory.get("winning_topics", []),
        "underperforming_topics": memory.get("avoid_topics", []),
        "hook_recommendations": memory.get("hook_strategies", []),
        "recommended_next_searches": DEFAULT_GTA_SEARCH_PROMPTS[:4]
    }

def curate_and_download_gta_source(search_pool: List[str]) -> tuple[Optional[Dict[str, Any]], Optional[VideoMetadata]]:
    """Searches and downloads a fresh, un-clipped English GTA source video."""
    history = load_processed_history()
    queries = search_pool if search_pool else DEFAULT_GTA_SEARCH_PROMPTS

    for query in queries:
        # Enforce English GTA search
        clean_query = f"{query} English" if "english" not in query.lower() else query
        print(f"[AutoPilot] Searching YouTube for English GTA: '{clean_query}'...")
        candidates = search_youtube(clean_query, max_results=6)
        if not candidates:
            continue

        for cand in candidates:
            url = cand.get("url", "")
            # Extract video ID
            vid_id = ""
            if "watch?v=" in url:
                vid_id = url.split("watch?v=")[1].split("&")[0]
            elif "youtu.be/" in url:
                vid_id = url.split("youtu.be/")[1].split("?")[0]

            if vid_id and vid_id in history:
                print(f"[AutoPilot] Skipping already processed video: {vid_id} ({cand.get('title')})")
                continue

            try:
                print(f"[AutoPilot] Downloading source video: {cand.get('title')} ({url})...")
                meta = download_youtube_video(url)
                if meta and os.path.exists(meta.file_path):
                    if vid_id:
                        record_processed_video_id(vid_id)
                    return cand, meta
            except Exception as e:
                print(f"[AutoPilot] Download candidate skipped ({cand.get('title')}): {e}")
                continue

    return None, None

def execute_autopilot_cycle() -> Dict[str, Any]:
    """Executes a complete autonomous cycle: Reflect -> Curate -> Download -> Transcribe -> Clip -> Render -> Upload."""
    if state.is_running_cycle:
        return {"status": "busy", "message": "An autonomous cycle is already in progress."}

    config = load_autopilot_config()
    state.is_running_cycle = True
    state.last_error = None
    state.current_step = "Reflecting & Analyzing Past Analytics"

    try:
        # Step 1: Reflect on past upload view metrics
        print("[AutoPilot] Step 1/7: Analyzing past performance and generating learning reflection...")
        reflection = reflect_and_learn_from_analytics()
        recommended_searches = reflection.get("recommended_next_searches", DEFAULT_GTA_SEARCH_PROMPTS)

        # Step 2: Curate & Download Source Video
        state.current_step = "Curating & Downloading English GTA Video"
        print("[AutoPilot] Step 2/7: Curating English GTA video...")
        source_cand, video_meta = curate_and_download_gta_source(recommended_searches)
        if not source_cand or not video_meta:
            raise RuntimeError("Failed to find and download an eligible English GTA video.")

        # Step 3: Transcribe Audio (English)
        state.current_step = "Transcribing English Dialogue"
        print(f"[AutoPilot] Step 3/7: Transcribing audio from '{video_meta.title}'...")
        transcript = transcribe_audio(video_meta.file_path)
        if not transcript:
            raise RuntimeError("Could not extract speech or audio transcript for video.")

        # Step 4: Analyze Virality & Hook Slicing
        state.current_step = "Analyzing Virality & Detecting Peak Hooks"
        print("[AutoPilot] Step 4/7: Analyzing virality and slicing peak retention clip...")
        clips = analyze_virality_and_slice(video_meta, transcript, clip_count=3)
        if not clips:
            raise RuntimeError("No high-retention clips identified in source video.")

        best_clip = clips[0]

        # Step 5: Generate Viral Metadata (Title, Description, Tags)
        state.current_step = "Generating High-CTR Title & SEO Tags"
        headline = best_clip.headline or (best_clip.suggested_titles[0] if best_clip.suggested_titles else f"{video_meta.title} #Shorts")
        if not headline.endswith("#Shorts") and not headline.endswith("#shorts"):
            headline = f"{headline[:80]} #Shorts"

        transcript_snippet = " ".join([s.text for s in transcript[:30]])
        ai_desc = generate_ai_description(
            title=headline,
            transcript_summary=transcript_snippet,
            tone="punchy_shorts",
            call_to_action="Follow for the craziest daily GTA moments!"
        )
        ai_tags = generate_viral_tags(
            title=headline,
            topic="Grand Theft Auto 5 funny moments",
            transcript_summary=transcript_snippet
        )

        # Step 6: Render 9:16 Vertical Video with Animated Subtitles
        state.current_step = "Rendering 9:16 Short with Animated Karaoke Subtitles"
        print(f"[AutoPilot] Step 6/7: Rendering vertical Short '{headline}' with {config.subtitle_preset} captions...")
        best_clip.subtitle_style = config.subtitle_preset
        rendered_mp4_path = render_clip_pipeline(best_clip, video_meta)
        best_clip.rendered_path = rendered_mp4_path
        best_clip.status = "rendered"

        # Step 7: Publish to YouTube Channel
        state.current_step = "Publishing Short to YouTube Channel"
        print(f"[AutoPilot] Step 7/7: Uploading to YouTube as {config.privacy_status.upper()}...")
        upload_req = YouTubeUploadRequest(
            title=headline,
            description=ai_desc.get("main_description", f"Insane GTA Moment! Like & Subscribe! #Shorts #GTA5 #Gaming"),
            tags=ai_tags.get("tags_list", ["GTA5", "Shorts", "Gaming", "GTAOnline", "FunnyMoments"]),
            privacy_status=config.privacy_status,
            is_short=True,
            made_for_kids=False
        )

        upload_result = upload_video_to_youtube(rendered_mp4_path, upload_req)
        yt_video_id = upload_result.get("youtube_video_id")
        yt_url = upload_result.get("youtube_url")

        # Step 8: Save to Memory
        memory = load_agent_memory()
        upload_record = {
            "id": str(uuid.uuid4())[:8],
            "youtube_video_id": yt_video_id,
            "youtube_url": yt_url,
            "title": headline,
            "topic": reflection.get("top_performing_topics", ["GTA Chases"])[0] if reflection.get("top_performing_topics") else "GTA 5",
            "source_title": video_meta.title,
            "virality_score": best_clip.virality.virality_score if hasattr(best_clip.virality, 'virality_score') else 92,
            "duration": round(best_clip.end_time - best_clip.start_time, 1),
            "uploaded_at": datetime.datetime.now().isoformat(),
            "privacy": config.privacy_status,
            "view_count": 0,
            "like_count": 0,
            "comment_count": 0
        }
        if "uploads" not in memory:
            memory["uploads"] = []
        memory["uploads"].insert(0, upload_record)
        save_agent_memory(memory)

        state.last_run_time = datetime.datetime.now().isoformat()
        state.next_run_time = (datetime.datetime.now() + datetime.timedelta(hours=config.interval_hours)).isoformat()
        state.total_cycles_completed += 1
        state.current_step = "Completed"

        return {
            "status": "success",
            "message": f"Autonomous cycle complete! Video published: '{headline}'",
            "upload": upload_record,
            "reflection": reflection
        }

    except Exception as e:
        err_str = f"{str(e)}\n{traceback.format_exc()}"
        print(f"[AutoPilot Error] {err_str}")
        state.last_error = str(e)
        state.current_step = f"Failed: {str(e)}"

        # Automatically dispatch emergency email alert to user
        try:
            from backend.services.email_service import send_error_alert
            send_error_alert(
                stage=state.current_step,
                error_message=str(e),
                details={
                    "last_attempted_step": state.current_step,
                    "target_niche": config.niche,
                    "language": config.language,
                }
            )
        except Exception as alert_err:
            print(f"[AutoPilot Alert Dispatch Failed] {alert_err}")

        return {"status": "error", "message": str(e)}
    finally:
        state.is_running_cycle = False

def get_autopilot_status() -> Dict[str, Any]:
    """Returns complete telemetry for the Auto-Pilot studio."""
    config = load_autopilot_config()
    memory = load_agent_memory()
    channel = None
    try:
        channel = get_channel_details()
    except Exception:
        pass

    return {
        "config": config.model_dump(),
        "state": {
            "is_running_cycle": state.is_running_cycle,
            "current_step": state.current_step,
            "last_run_time": state.last_run_time,
            "next_run_time": state.next_run_time,
            "last_error": state.last_error,
            "total_cycles_completed": state.total_cycles_completed
        },
        "channel": channel,
        "learnings": {
            "winning_topics": memory.get("winning_topics", []),
            "avoid_topics": memory.get("avoid_topics", []),
            "hook_strategies": memory.get("hook_strategies", []),
            "latest_reflection": memory.get("reflections", [{}])[0] if memory.get("reflections") else None
        },
        "recent_uploads": memory.get("uploads", [])[:15],
        "email_alerts": {
            "alert_email": load_settings().alert_email,
            "smtp_enabled": load_settings().smtp_enabled,
            "smtp_host": load_settings().smtp_host,
            "smtp_port": load_settings().smtp_port,
            "smtp_user": load_settings().smtp_user,
            "has_smtp_password": bool(load_settings().smtp_password),
            "notify_on_error": load_settings().notify_on_error,
            "notify_on_milestone": load_settings().notify_on_milestone,
            "milestone_view_threshold": load_settings().milestone_view_threshold,
        }
    }

async def start_autopilot_background_loop():
    """Background async daemon that runs 24/7 on the server."""
    print("[AutoPilot] Initializing 24/7 background worker loop...")
    await asyncio.sleep(10) # Brief pause on server startup

    while True:
        try:
            config = load_autopilot_config()
            if config.enabled:
                now = datetime.datetime.now()
                should_run = False

                if state.next_run_time:
                    try:
                        next_dt = datetime.datetime.fromisoformat(state.next_run_time)
                        if now >= next_dt:
                            should_run = True
                    except Exception:
                        should_run = True
                else:
                    # First run: schedule next run
                    should_run = True

                if should_run and not state.is_running_cycle:
                    print(f"[AutoPilot] Scheduled run triggered at {now.isoformat()}. Starting autonomous cycle...")
                    await asyncio.to_thread(execute_autopilot_cycle)

        except Exception as e:
            print(f"[AutoPilot Daemon Exception] {e}")

        # Sleep 2 minutes between schedule checks
        await asyncio.sleep(120)
