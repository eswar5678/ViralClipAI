import sys
import os
if sys.platform == "win32":
    try:
        if hasattr(sys.stdout, 'reconfigure'):
            sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        if hasattr(sys.stderr, 'reconfigure'):
            sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass
import json
import uuid
import datetime
import asyncio
from pathlib import Path
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from backend.config import BASE_DIR, UPLOADS_DIR, CLIPS_DIR, TEMP_DIR, COOKIES_FILE, AppSettings, load_settings, save_settings, get_ffmpeg_path
from backend.models import (
    VideoMetadata, ClipSuggestion, VideoProcessRequest,
    RenderClipRequest, YouTubeUploadRequest, YouTubeQueueItem, WSProgressMessage,
    SubtitleSentence, StyleSegment
)
from backend.services.downloader import download_youtube_video, extract_video_metadata
from backend.services.transcriber import transcribe_audio
from backend.services.virality_analyzer import analyze_virality_and_slice
from backend.services.video_renderer import render_clip_pipeline, detect_best_encoder
from backend.services.youtube_publisher import upload_video_to_youtube, get_queue, save_queue, add_to_queue

app = FastAPI(title="AI Clipper & YouTube Auto-Poster API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for active video sessions and clips
active_videos: Dict[str, VideoMetadata] = {}
active_clips: Dict[str, List[ClipSuggestion]] = {}
active_connections: List[WebSocket] = []

main_loop: Optional[asyncio.AbstractEventLoop] = None

@app.on_event("startup")
async def on_startup():
    global main_loop
    main_loop = asyncio.get_running_loop()

async def broadcast_progress(stage: str, percent: int, message: str, details: Optional[Dict[str, Any]] = None):
    """Broadcasts progress updates to all connected frontend clients."""
    msg = WSProgressMessage(stage=stage, percent=percent, message=message, details=details).model_dump()
    for conn in list(active_connections):
        try:
            await conn.send_json(msg)
        except Exception:
            pass

def sync_broadcast_progress(stage: str, percent: int, message: str, details: Optional[Dict[str, Any]] = None):
    """Thread-safe and event-loop-safe progress broadcaster."""
    global main_loop
    if main_loop and main_loop.is_running():
        try:
            asyncio.run_coroutine_threadsafe(broadcast_progress(stage, percent, message, details), main_loop)
            return
        except Exception:
            pass
    try:
        loop = asyncio.get_running_loop()
        if loop.is_running():
            loop.create_task(broadcast_progress(stage, percent, message, details))
    except Exception:
        pass

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.append(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        if websocket in active_connections:
            active_connections.remove(websocket)

from backend.services.youtube_publisher import TOKEN_FILE, get_channel_details

@app.get("/api/system/status")
async def get_system_status():
    ffmpeg_path = get_ffmpeg_path()
    encoder = detect_best_encoder()
    settings = load_settings()
    is_yt_auth = bool(settings.youtube_authenticated or (TOKEN_FILE and TOKEN_FILE.exists()))
    ch_name = settings.youtube_channel_name
    if not ch_name and is_yt_auth:
        ch_details = get_channel_details()
        if ch_details:
            ch_name = ch_details.get("title", "")
    return {
        "ffmpeg_ready": bool(ffmpeg_path and os.path.exists(ffmpeg_path)),
        "ffmpeg_path": ffmpeg_path,
        "encoder": encoder,
        "gemini_configured": bool(settings.gemini_api_key and settings.gemini_api_key.strip()),
        "openai_configured": bool(settings.openai_api_key and settings.openai_api_key.strip()),
        "groq_configured": bool(settings.groq_api_key and settings.groq_api_key.strip()),
        "has_cookies": bool(COOKIES_FILE.exists() and COOKIES_FILE.stat().st_size > 10),
        "youtube_authenticated": is_yt_auth,
        "youtube_channel_name": ch_name
    }

@app.post("/api/youtube/cookies")
async def upload_youtube_cookies_endpoint(file: UploadFile = File(...)):
    content = await file.read()
    with open(COOKIES_FILE, "wb") as f:
        f.write(content)
    return {"status": "success", "message": "YouTube cookies.txt uploaded successfully."}

@app.delete("/api/youtube/cookies")
async def delete_youtube_cookies_endpoint():
    if COOKIES_FILE.exists():
        COOKIES_FILE.unlink()
    return {"status": "success", "message": "YouTube cookies.txt removed."}

@app.get("/api/settings")
async def get_app_settings():
    return load_settings()

@app.post("/api/settings")
async def update_app_settings(settings: AppSettings):
    save_settings(settings)
    return {"status": "success", "settings": settings}

@app.post("/api/video/import")
async def import_video(
    file: Optional[UploadFile] = File(None),
    youtube_url: Optional[str] = Form(None),
    local_path: Optional[str] = Form(None)
):
    try:
        if file and file.filename:
            file_id = str(uuid.uuid4())[:8]
            dest_path = UPLOADS_DIR / f"{file_id}_{file.filename}"
            with open(dest_path, "wb") as f:
                content = await file.read()
                f.write(content)
            meta = extract_video_metadata(str(dest_path))
            active_videos[meta.video_id] = meta
            return meta

        elif local_path and os.path.exists(local_path):
            meta = extract_video_metadata(local_path)
            active_videos[meta.video_id] = meta
            return meta

        elif youtube_url and youtube_url.strip():
            def dl_cb(pct, msg):
                sync_broadcast_progress("downloading", pct, msg)
            
            meta = await asyncio.to_thread(download_youtube_video, youtube_url.strip(), dl_cb)
            active_videos[meta.video_id] = meta
            return meta

        else:
            raise HTTPException(status_code=400, detail="Must provide a file, local path, or YouTube URL.")
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/video/process")
async def process_video_pipeline(req: VideoProcessRequest, background_tasks: BackgroundTasks):
    """Processes video: Transcription -> Virality Analysis -> Clip Suggestions."""
    video_id = ""
    # Find matching active video
    for vid, meta in active_videos.items():
        if meta.file_path == req.url_or_path or meta.video_id == req.url_or_path:
            video_id = vid
            break

    if not video_id:
        if req.url_or_path.startswith("http://") or req.url_or_path.startswith("https://"):
            def dl_cb(pct, msg):
                sync_broadcast_progress("downloading", pct, msg)
            meta = await asyncio.to_thread(download_youtube_video, req.url_or_path, dl_cb)
            active_videos[meta.video_id] = meta
            video_id = meta.video_id
        elif os.path.exists(req.url_or_path):
            meta = extract_video_metadata(req.url_or_path)
            active_videos[meta.video_id] = meta
            video_id = meta.video_id
        else:
            raise HTTPException(status_code=404, detail="Video metadata not found. Import video first.")

    meta = active_videos[video_id]

    async def run_pipeline():
        try:
            # 1. Transcription Stage
            def tr_cb(pct, msg):
                sync_broadcast_progress("transcribing", pct, msg)
            
            transcript = transcribe_audio(
                meta.file_path,
                progress_callback=tr_cb,
                translate_to_english=getattr(req, "translate_to_english", True)
            )
            
            # 2. Virality Analysis Stage
            def vir_cb(pct, msg):
                sync_broadcast_progress("analyzing", pct, msg)

            clips = analyze_virality_and_slice(
                video_meta=meta,
                transcript=transcript,
                clip_count=req.clip_count,
                progress_callback=vir_cb
            )

            active_clips[meta.video_id] = clips

            sync_broadcast_progress(
                "clipping", 
                100, 
                f"Generated {len(clips)} viral clips successfully!",
                details={"video_id": meta.video_id, "clips_count": len(clips)}
            )
        except Exception as e:
            sync_broadcast_progress("error", 0, f"Processing error: {str(e)}")

    background_tasks.add_task(run_pipeline)
    return {"status": "started", "video_id": meta.video_id}

@app.get("/api/clips/{video_id}")
async def get_clips_for_video(video_id: str):
    if video_id in active_clips:
        return active_clips[video_id]
    return []

@app.post("/api/clips/render")
async def render_clip(req: RenderClipRequest):
    """Renders 9:16 Short with layout and animated subtitles."""
    # Find clip
    target_clip: Optional[ClipSuggestion] = None
    target_meta: Optional[VideoMetadata] = None
    
    for vid, clips in active_clips.items():
        for c in clips:
            if c.clip_id == req.clip_id:
                target_clip = c
                target_meta = active_videos.get(vid)
                break
        if target_clip:
            break

    if not target_clip or not target_meta:
        raise HTTPException(status_code=404, detail="Clip or video metadata not found.")

    # Update custom sentences and style segments if provided in render request
    if req.transcript_sentences:
        target_clip.transcript_sentences = req.transcript_sentences
    if req.style_segments:
        target_clip.style_segments = req.style_segments

    target_clip.status = "rendering"
    sync_broadcast_progress("rendering", 5, f"Starting render for {target_clip.headline}...")

    def rnd_cb(pct, msg):
        sync_broadcast_progress("rendering", pct, msg)

    try:
        out_path = render_clip_pipeline(
            clip=target_clip,
            video_meta=target_meta,
            render_opts=req,
            progress_callback=rnd_cb
        )
        target_clip.status = "rendered"
        target_clip.rendered_path = out_path
        target_clip.layout_type = req.layout_type
        target_clip.subtitle_style = req.subtitle_style
        return {
            "status": "success",
            "clip_id": target_clip.clip_id,
            "rendered_path": out_path,
            "preview_url": f"/api/clips/rendered/{target_clip.clip_id}"
        }
    except Exception as e:
        target_clip.status = "failed"
        raise HTTPException(status_code=500, detail=f"Rendering failed: {str(e)}")

class UpdateClipSubtitlesRequest(BaseModel):
    transcript_sentences: List[SubtitleSentence]
    style_segments: Optional[List[StyleSegment]] = []
    subtitle_style: Optional[str] = None

@app.put("/api/clips/{clip_id}/subtitles")
async def update_clip_subtitles_endpoint(clip_id: str, req: UpdateClipSubtitlesRequest):
    for vid, clips in active_clips.items():
        for c in clips:
            if c.clip_id == clip_id:
                c.transcript_sentences = req.transcript_sentences
                if req.style_segments is not None:
                    c.style_segments = req.style_segments
                if req.subtitle_style:
                    c.subtitle_style = req.subtitle_style
                return {"status": "success", "clip": c}
    raise HTTPException(status_code=404, detail="Clip not found.")

@app.get("/api/clips/rendered/{clip_id}")
async def get_rendered_clip_video(clip_id: str):
    clip_path = CLIPS_DIR / f"{clip_id}.mp4"
    if clip_path.exists():
        return FileResponse(str(clip_path), media_type="video/mp4")
    raise HTTPException(status_code=404, detail="Rendered clip not found.")

@app.get("/api/thumbnails/{thumb_name}")
async def get_thumbnail(thumb_name: str):
    thumb_path = UPLOADS_DIR / thumb_name
    if thumb_path.exists():
        return FileResponse(str(thumb_path), media_type="image/jpeg")
    raise HTTPException(status_code=404, detail="Thumbnail not found.")

from backend.services.youtube_publisher import (
    upload_video_to_youtube, get_queue, save_queue, add_to_queue,
    connect_youtube_oauth, disconnect_youtube, get_channel_details, CLIENT_SECRETS_FILE, TOKEN_FILE
)

@app.get("/api/youtube/channel")
async def get_youtube_channel_info():
    info = get_channel_details()
    if info:
        return info
    settings = load_settings()
    return {
        "authenticated": False,
        "title": settings.youtube_channel_name or "",
        "channel_id": settings.youtube_channel_id or ""
    }

class YouTubeConnectRequest(BaseModel):
    client_id: Optional[str] = None
    client_secret: Optional[str] = None

@app.post("/api/youtube/auth/connect")
async def connect_youtube_account(req: Optional[YouTubeConnectRequest] = None):
    try:
        cid = req.client_id if req else None
        csec = req.client_secret if req else None
        res = connect_youtube_oauth(client_id=cid, client_secret=csec)
        return {"status": "success", "channel": res}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/youtube/auth/upload_secrets")
async def upload_client_secrets_file(file: UploadFile = File(...)):
    try:
        content = await file.read()
        json_data = json.loads(content.decode("utf-8"))
        with open(CLIENT_SECRETS_FILE, "w", encoding="utf-8") as f:
            json.dump(json_data, f, indent=2)
        return {"status": "success", "message": "client_secrets.json uploaded successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid client_secrets.json: {str(e)}")

@app.post("/api/youtube/auth/upload_token")
async def upload_youtube_token_file(file: UploadFile = File(...)):
    try:
        content = await file.read()
        json_data = json.loads(content.decode("utf-8"))
        with open(TOKEN_FILE, "w", encoding="utf-8") as f:
            json.dump(json_data, f, indent=2)
        channel = get_channel_details()
        return {"status": "success", "message": "youtube_token.json uploaded successfully", "channel": channel}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid youtube_token.json: {str(e)}")

@app.post("/api/youtube/auth/disconnect")
async def disconnect_youtube_account():
    success = disconnect_youtube()
    return {"status": "success", "disconnected": success}

from backend.services.channel_analyzer import fetch_channel_latest_videos
from backend.services.youtube_search import search_youtube
from backend.services.ai_tools import (
    generate_ai_description,
    generate_viral_tags,
    analyze_video_retention_and_virality,
    test_ai_key,
    enhance_subtitles_with_ai,
    translate_subtitles_to_english
)

class YouTubeSearchRequest(BaseModel):
    query: str
    max_results: Optional[int] = 12
    order: Optional[str] = "relevance"
    video_duration: Optional[str] = "any"

@app.post("/api/youtube/search")
async def search_youtube_videos_endpoint(req: YouTubeSearchRequest):
    try:
        results = await asyncio.to_thread(
            search_youtube,
            query=req.query,
            max_results=req.max_results or 12,
            order=req.order or "relevance",
            video_duration=req.video_duration or "any"
        )
        return results
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

class ChannelScanRequest(BaseModel):
    channel_url: str
    max_videos: Optional[int] = 10

@app.post("/api/channel/scan")
async def scan_youtube_channel(req: ChannelScanRequest):
    try:
        res = await asyncio.to_thread(fetch_channel_latest_videos, req.channel_url, req.max_videos or 10)
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

class AIDescriptionRequest(BaseModel):
    title: str
    transcript_summary: Optional[str] = ""
    tone: Optional[str] = "punchy_shorts"
    keywords: Optional[List[str]] = []
    call_to_action: Optional[str] = "Like & Subscribe for daily viral shorts!"

@app.post("/api/ai/description")
async def create_ai_description(req: AIDescriptionRequest):
    try:
        res = await asyncio.to_thread(
            generate_ai_description,
            title=req.title,
            transcript_summary=req.transcript_summary or "",
            tone=req.tone or "punchy_shorts",
            keywords=req.keywords or [],
            call_to_action=req.call_to_action or "Like & Subscribe!"
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class AITagsRequest(BaseModel):
    title: str
    topic: Optional[str] = ""
    transcript_summary: Optional[str] = ""

@app.post("/api/ai/tags")
async def create_ai_tags(req: AITagsRequest):
    try:
        res = await asyncio.to_thread(
            generate_viral_tags,
            title=req.title,
            topic=req.topic or "",
            transcript_summary=req.transcript_summary or ""
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class AIAnalyzeRequest(BaseModel):
    title: str
    transcript_summary: Optional[str] = ""

@app.post("/api/ai/analyze")
async def create_ai_video_analysis(req: AIAnalyzeRequest):
    try:
        res = await asyncio.to_thread(
            analyze_video_retention_and_virality,
            title=req.title,
            transcript_summary=req.transcript_summary or ""
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class AITestKeyRequest(BaseModel):
    provider: str
    api_key: str

@app.post("/api/ai/test-key")
async def test_ai_api_key(req: AITestKeyRequest):
    return await asyncio.to_thread(test_ai_key, req.provider, req.api_key)

class AIEnhanceSubtitlesRequest(BaseModel):
    sentences: List[Dict[str, Any]]

@app.post("/api/ai/subtitles/enhance")
async def enhance_subtitles_endpoint(req: AIEnhanceSubtitlesRequest):
    return await asyncio.to_thread(enhance_subtitles_with_ai, req.sentences)

class AITranslateSubtitlesRequest(BaseModel):
    sentences: List[Dict[str, Any]]
    target_language: Optional[str] = "en"

@app.post("/api/ai/subtitles/translate")
async def translate_subtitles_endpoint(req: AITranslateSubtitlesRequest):
    return await asyncio.to_thread(translate_subtitles_to_english, req.sentences)

from backend.services.agent_bot import execute_chat_turn, execute_autonomous_action

class ChatRequest(BaseModel):
    message: str
    model: Optional[str] = "gemini-3.6-flash"
    history: Optional[List[Dict[str, str]]] = []
    context: Optional[Dict[str, Any]] = {}

@app.post("/api/chat")
async def chat_with_ai_agent(req: ChatRequest):
    try:
        res = await asyncio.to_thread(
            execute_chat_turn,
            message=req.message,
            model_name=req.model or "gemini-3.6-flash",
            history=req.history or [],
            context=req.context or {}
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class ChatActionRequest(BaseModel):
    action_type: str
    params: Dict[str, Any]

@app.post("/api/chat/action")
async def execute_chat_action_endpoint(req: ChatActionRequest):
    try:
        res = await asyncio.to_thread(
            execute_autonomous_action,
            action_type=req.action_type,
            params=req.params
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from backend.services.local_ai import get_local_ai_status

@app.get("/api/ai/local/status")
@app.post("/api/ai/local/status")
async def check_local_ai_endpoint(url: Optional[str] = None):
    try:
        return await asyncio.to_thread(get_local_ai_status, url)
    except Exception as e:
        return {"available": False, "message": str(e)}

@app.post("/api/youtube/upload")
async def upload_clip_to_youtube(req: YouTubeUploadRequest):
    clip_path = CLIPS_DIR / f"{req.clip_id}.mp4"
    if not clip_path.exists():
        raise HTTPException(status_code=400, detail="Clip must be rendered before posting to YouTube.")

    queue_item = YouTubeQueueItem(
        id=str(uuid.uuid4())[:8],
        clip_id=req.clip_id,
        title=req.title,
        description=req.description,
        privacy_status=req.privacy_status,
        schedule_time=req.schedule_time,
        status="uploading",
        progress=0,
        created_at=datetime.datetime.now().isoformat()
    )
    add_to_queue(queue_item)

    def up_cb(pct, msg):
        sync_broadcast_progress("uploading", pct, msg)

    try:
        res = upload_video_to_youtube(str(clip_path), req, progress_callback=up_cb)
        queue_item.status = "published" if not req.schedule_time else "scheduled"
        queue_item.youtube_video_id = res.get("youtube_video_id")
        queue_item.youtube_url = res.get("youtube_url")
        queue_item.progress = 100
        
        # Update queue
        q = get_queue()
        for it in q:
            if it.id == queue_item.id:
                it.status = queue_item.status
                it.youtube_video_id = queue_item.youtube_video_id
                it.youtube_url = queue_item.youtube_url
                it.progress = 100
        save_queue(q)

        return res
    except Exception as e:
        queue_item.status = "failed"
        queue_item.error_message = str(e)
        q = get_queue()
        for it in q:
            if it.id == queue_item.id:
                it.status = "failed"
                it.error_message = str(e)
        save_queue(q)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/youtube/queue")
async def get_youtube_queue():
    return get_queue()

@app.delete("/api/youtube/queue/{queue_id}")
async def delete_queue_item(queue_id: str):
    q = get_queue()
    q = [it for it in q if it.id != queue_id]
    save_queue(q)
    return {"status": "deleted"}

def get_frontend_dist() -> Optional[Path]:
    """Finds frontend dist folder across standard and PyInstaller environments."""
    candidates = [
        getattr(sys, '_MEIPASS', None) and (Path(sys._MEIPASS) / "frontend" / "dist"),
        Path(sys.executable).parent / "frontend" / "dist",
        Path(sys.executable).parent / "_internal" / "frontend" / "dist",
        BASE_DIR.parent / "frontend" / "dist",
        Path.cwd() / "frontend" / "dist",
        Path("D:/folder/ClipperTool/frontend/dist"),
    ]
    for c in candidates:
        if c:
            p = Path(c)
            if p.exists() and (p / "index.html").exists():
                return p
    return None

FRONTEND_DIST = get_frontend_dist()
if FRONTEND_DIST and FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file_target = FRONTEND_DIST / full_path
        if file_target.exists() and file_target.is_file():
            return FileResponse(str(file_target))
        return FileResponse(str(FRONTEND_DIST / "index.html"))
else:
    @app.get("/")
    async def root_fallback():
        return {"status": "backend_running", "message": "ViralClip AI Engine is running. Open frontend on port 5173 or ensure frontend/dist is built."}

