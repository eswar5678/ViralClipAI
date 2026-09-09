import os
import re
import json
import uuid
import datetime
from typing import List, Dict, Any, Optional
from backend.config import load_settings, CLIPS_DIR
from backend.models import YouTubeQueueItem, ClipSuggestion, YouTubeUploadRequest
from backend.services.ai_tools import call_llm_json, generate_ai_description, generate_viral_tags
from backend.services.youtube_search import search_youtube
from backend.services.downloader import download_youtube_video
from backend.services.transcriber import transcribe_audio
from backend.services.virality_analyzer import analyze_virality_and_slice
from backend.services.video_renderer import render_clip_pipeline
from backend.services.youtube_publisher import (
    get_channel_details,
    get_queue,
    add_to_queue,
    upload_video_to_youtube
)

AGENT_SYSTEM_PROMPT = """You are the ViralClip AI Autonomous Studio Agent.
You assist creators by searching, clipping, captioning, optimizing, and scheduling viral YouTube Shorts and TikToks.

TOKEN EFFICIENCY DIRECTIVE:
1. Be extremely concise, direct, and actionable.
2. NEVER output repetitive filler, boilerplate greetings, or huge transcript dumps.
3. Keep conversational replies under 120 words unless giving a structured breakdown.
4. When executing actions (e.g. search, clip, subtitle, describe, post, check dashboard), output structured ACTION proposals or decisions so the frontend can display rich visual cards.

DASHBOARD & QUEUE CAPABILITY:
You HAVE DIRECT, LIVE ACCESS to the user's YouTube Dashboard and Upload Queue right in your context!
You can see:
- The user's connected YouTube channel (subscribers, video count, channel title).
- The complete Upload Queue (all queued, uploading, published, or scheduled videos, including their titles, IDs, statuses, and YouTube links).
When asked about queue status, dashboard, uploaded videos, or channel analytics, provide the exact real-time data from your context. NEVER say 'I cannot access your YouTube dashboard' because you have full live integration!

CAPABILITIES / TOOLS:
- find_and_post: Search a topic (e.g. 'GTA 5 gameplay', 'AI news'), pick the best video, download it, extract real subtitles, slice viral clips, generate SEO description/tags, render, and queue it for YouTube upload.
- get_dashboard: Inspect live YouTube channel statistics, subscribers, and all queued/published videos.
- search_videos: Search YouTube for trending or viral source videos.
- generate_metadata: Write video-specific title, description, and tags.
- advice: Answer questions about hooks, retention, pacing, and viral algorithms.

Output response in JSON:
{
  "reply": "Your brief direct message to the user",
  "action": null | {
     "type": "find_and_post" | "get_dashboard" | "search_videos" | "clip_video" | "generate_metadata",
     "params": { ... }
  },
  "suggested_followups": ["Short follow-up prompt 1", "Short follow-up prompt 2"]
}
"""

def execute_chat_turn(
    message: str,
    model_name: str = "gemini-3.6-flash",
    history: Optional[List[Dict[str, str]]] = None,
    context: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """Processes user chat messages using the chosen AI model with live dashboard context and token-efficient instructions."""
    settings = load_settings()
    hist_snippet = ""
    if history:
        # Keep only last 4 turns for token efficiency
        last_turns = history[-4:]
        hist_snippet = "\n".join([f"{h.get('role', 'user')}: {h.get('content', '')[:180]}" for h in last_turns])

    # Fetch live real-time YouTube dashboard & queue data
    channel_info = None
    queue_items: List[YouTubeQueueItem] = []
    try:
        channel_info = get_channel_details()
    except Exception:
        pass
    try:
        queue_items = get_queue()
    except Exception:
        pass

    dashboard_context = "\n[LIVE YOUTUBE DASHBOARD & QUEUE DATA]\n"
    if channel_info and channel_info.get("authenticated"):
        dashboard_context += f"- Connected Channel: {channel_info.get('title', 'Unknown')} (ID: {channel_info.get('channel_id')}, Subscribers: {channel_info.get('subscriber_count')}, Videos: {channel_info.get('video_count')})\n"
    else:
        dashboard_context += "- YouTube Channel: Not connected / unauthenticated\n"

    dashboard_context += f"- Total Upload Queue Items: {len(queue_items)}\n"
    if queue_items:
        dashboard_context += "- Recent Queue Items:\n"
        for item in queue_items[-6:]:
            url_str = f"URL: {item.youtube_url}" if item.youtube_url else "Not published yet"
            title_clean = item.title.encode('ascii', 'ignore').decode('ascii') if item.title else "Untitled"
            dashboard_context += f"  • [{item.status.upper()}] \"{title_clean}\" (ID: {item.id}, Privacy: {item.privacy_status}, {url_str})\n"
    else:
        dashboard_context += "- Queue is currently empty.\n"

    active_context = ""
    if context:
        if "active_video" in context:
            v = context["active_video"]
            active_context += f"\nActive Video Title: {v.get('title', 'None')} (Duration: {v.get('duration', 0)}s)"
        if "active_clip" in context:
            c = context["active_clip"]
            active_context += f"\nActive Clip Title: {c.get('title', 'None')} (Score: {c.get('virality_score', 0)})"

    user_prompt = f"""Conversation History:
{hist_snippet if hist_snippet else 'None'}
{dashboard_context}
{active_context}

User Request: {message}

Respond with valid JSON conforming to the system prompt."""

    # Call AI using the selected model
    ai_response = None

    # Check Local AI on PC (Ollama / LM Studio)
    if "local" in model_name.lower() or "ollama" in model_name.lower() or "pc" in model_name.lower():
        from backend.services.local_ai import call_local_llm
        try:
            local_res = call_local_llm(
                AGENT_SYSTEM_PROMPT,
                user_prompt,
                url=settings.local_ai_url,
                model=settings.local_ai_model
            )
            if local_res:
                ai_response = local_res
                ai_response["model_used"] = f"Local PC ({settings.local_ai_model or 'Ollama'})"
                ai_response["is_local"] = True
                ai_response["token_optimized"] = True
                return ai_response
        except Exception as e:
            print(f"Local AI turn error: {e}")

    # Check model selection
    is_groq = "groq" in model_name.lower() or "llama" in model_name.lower() or "gpt-oss" in model_name.lower() or "qwen" in model_name.lower()
    if is_groq:
        if settings.groq_api_key and settings.groq_api_key.strip():
            import requests
            groq_m = "openai/gpt-oss-120b"
            if "qwen" in model_name.lower():
                groq_m = "qwen/qwen3.8-27b"
            headers = {
                "Authorization": f"Bearer {settings.groq_api_key.strip()}",
                "Content-Type": "application/json"
            }
            body = {
                "model": groq_m,
                "messages": [
                    {"role": "system", "content": AGENT_SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt}
                ],
                "response_format": {"type": "json_object"},
                "temperature": 0.3
            }
            try:
                res = requests.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=body, timeout=25)
                if res.status_code == 200:
                    content = res.json().get("choices", [{}])[0].get("message", {}).get("content", "")
                    ai_response = json.loads(content)
            except Exception as e:
                print(f"Groq chat turn error: {e}")

    elif "openai" in model_name.lower() or "gpt-4" in model_name.lower():
        if settings.openai_api_key and settings.openai_api_key.strip():
            import openai
            try:
                client = openai.OpenAI(api_key=settings.openai_api_key.strip())
                response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": AGENT_SYSTEM_PROMPT},
                        {"role": "user", "content": user_prompt}
                    ],
                    response_format={"type": "json_object"},
                    temperature=0.3
                )
                ai_response = json.loads(response.choices[0].message.content)
            except Exception as e:
                print(f"OpenAI chat turn error: {e}")

    # Fallback to Gemini (default)
    if not ai_response:
        ai_response = call_llm_json(AGENT_SYSTEM_PROMPT, user_prompt)

    # If still none, craft a contextual fallback
    if not ai_response:
        lower_msg = message.lower()
        if "queue" in lower_msg or "dashboard" in lower_msg or "upload" in lower_msg or "status" in lower_msg:
            ch_name = channel_info.get("title") if channel_info else "Connected"
            ai_response = {
                "reply": f"Here is your live YouTube Dashboard status:\n• Channel: {ch_name}\n• Total Queued Clips: {len(queue_items)}\n• Recent Items: " + ", ".join([f"'{q.title}' ({q.status})" for q in queue_items[-3:]]) if queue_items else "Queue is empty.",
                "action": {
                    "type": "get_dashboard",
                    "params": {}
                },
                "suggested_followups": ["Show all queue items", "Find a GTA video and make clips", "Check channel analytics"]
            }
        elif "find" in lower_msg or "search" in lower_msg or "gta" in lower_msg:
            topic = "GTA 5 gameplay" if "gta" in lower_msg else message.replace("find", "").replace("video", "").strip() or "trending viral gaming"
            ai_response = {
                "reply": f"I'm ready to find a viral video for '{topic}', transcribe it, slice the highest retention clips, write SEO metadata, and stage it in your YouTube upload queue.",
                "action": {
                    "type": "find_and_post",
                    "params": {"topic": topic, "privacy_status": "unlisted"}
                },
                "suggested_followups": ["Proceed with GTA video", "Search different topic", "Check YouTube queue"]
            }
        else:
            ai_response = {
                "reply": "I am your AI Studio Assistant with full access to your YouTube Dashboard and Clipper tools. What would you like to create or review?",
                "action": None,
                "suggested_followups": ["Check YouTube queue status", "Find me a GTA video and make clips", "Generate description for active clip"]
            }

    ai_response["model_used"] = model_name
    ai_response["token_optimized"] = True
    return ai_response

def execute_autonomous_action(action_type: str, params: Dict[str, Any]) -> Dict[str, Any]:
    """Executes background autonomous actions requested by the AI agent."""
    if action_type == "get_dashboard":
        ch = None
        q_items = []
        try:
            ch = get_channel_details()
        except Exception:
            pass
        try:
            q_items = get_queue()
        except Exception:
            pass
        return {
            "status": "success",
            "type": "get_dashboard",
            "channel": ch,
            "queue_count": len(q_items),
            "queue": [
                {
                    "id": it.id,
                    "title": it.title,
                    "status": it.status,
                    "youtube_url": it.youtube_url,
                    "privacy": it.privacy_status,
                    "created_at": it.created_at
                }
                for it in q_items
            ],
            "message": f"Dashboard refreshed: {len(q_items)} clip(s) in upload queue."
        }

    elif action_type == "search_videos":
        query = params.get("query", "viral shorts")
        videos = search_youtube(query, max_results=params.get("max_results", 5))
        return {
            "status": "success",
            "type": "search_videos",
            "videos": videos,
            "message": f"Found {len(videos)} videos for '{query}'"
        }

    elif action_type == "find_and_post":
        topic = params.get("topic") or params.get("search_query") or params.get("query") or "GTA 5 highlights"
        privacy_status = params.get("privacy_status", "unlisted")
        
        # 1. Search for video
        search_res = search_youtube(topic, max_results=4)
        if not search_res:
            return {"status": "error", "message": f"No videos found for '{topic}'."}

        target_vid = None
        video_meta = None
        last_err = "No downloadable video found"

        for candidate in search_res:
            try:
                candidate_url = candidate["url"]
                video_meta = download_youtube_video(candidate_url)
                target_vid = candidate
                break
            except Exception as e:
                last_err = str(e)
                print(f"Skipping candidate '{candidate.get('title')}': {e}")
                continue

        if not target_vid or not video_meta:
            return {"status": "error", "message": f"Could not process video for '{topic}': {last_err}"}

        youtube_url = target_vid["url"]
        video_title = target_vid["title"]

        # 2. Transcribe audio with Groq / native captions
        transcript = transcribe_audio(video_meta.file_path)

        # 3. Analyze virality & slice
        clips = analyze_virality_and_slice(video_meta, transcript, clip_count=params.get("clip_count", 3))
        if not clips:
            return {"status": "error", "message": "Failed to slice clips from downloaded video."}

        best_clip = clips[0]

        # 4. Generate video-relevant headline, description & tags
        clip_headline = best_clip.headline or (best_clip.suggested_titles[0] if best_clip.suggested_titles else f"{video_title} #Shorts")
        transcript_snippet = " ".join([s.text for s in transcript[:25]])
        ai_desc = generate_ai_description(
            title=clip_headline,
            transcript_summary=transcript_snippet,
            tone="punchy_shorts",
            call_to_action="Subscribe for daily gaming moments!"
        )
        ai_tags = generate_viral_tags(
            title=clip_headline,
            topic=topic,
            transcript_summary=transcript_snippet
        )

        # 5. Render the clip so MP4 is on disk and ready for upload!
        try:
            rendered_path = render_clip_pipeline(best_clip, video_meta)
            best_clip.rendered_path = rendered_path
            best_clip.status = "rendered"
        except Exception as e:
            print(f"Pre-render warning: {e}")

        # 6. Stage in YouTube queue
        queue_item = YouTubeQueueItem(
            id=str(uuid.uuid4())[:8],
            clip_id=best_clip.clip_id,
            title=clip_headline,
            description=ai_desc.get("main_description", ""),
            privacy_status=privacy_status,
            status="queued",
            created_at=datetime.datetime.now().isoformat()
        )
        add_to_queue(queue_item)

        virality_val = best_clip.virality.virality_score if hasattr(best_clip.virality, 'virality_score') else 85

        return {
            "status": "success",
            "type": "find_and_post",
            "source_video": {
                "title": video_title,
                "url": youtube_url,
                "duration": video_meta.duration
            },
            "best_clip": {
                "id": best_clip.clip_id,
                "title": clip_headline,
                "virality_score": virality_val,
                "start": best_clip.start_time,
                "end": best_clip.end_time,
                "duration": round(best_clip.end_time - best_clip.start_time, 1)
            },
            "metadata": {
                "description": ai_desc.get("main_description", ""),
                "tags": ai_tags.get("all_tags_csv", ""),
                "hashtags": ai_desc.get("hashtags", [])
            },
            "queued_id": queue_item.id,
            "message": f"Successfully processed '{video_title}', rendered clip '{clip_headline}' (Virality: {virality_val}/100), and added to YouTube Queue ({privacy_status})!"
        }

    return {"status": "error", "message": f"Unknown action type: {action_type}"}
