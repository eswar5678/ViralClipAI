import os
import json
import uuid
import datetime
from pathlib import Path
from typing import Optional, Callable, Dict, Any, List

# Relax token scope verification so Google Cloud console scope changes don't cause crashes
os.environ["OAUTHLIB_RELAX_TOKEN_SCOPE"] = "1"

from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from googleapiclient.errors import HttpError
from backend.config import DATA_DIR, QUEUE_FILE, load_settings, save_settings
from backend.models import YouTubeUploadRequest, YouTubeQueueItem

SCOPES = [
    "https://www.googleapis.com/auth/youtube.upload",
    "https://www.googleapis.com/auth/userinfo.profile"
]

TOKEN_FILE = DATA_DIR / "youtube_token.json"
CLIENT_SECRETS_FILE = DATA_DIR / "client_secrets.json"

def get_channel_details() -> Optional[Dict[str, Any]]:
    """Returns detailed channel metadata if authenticated."""
    if not TOKEN_FILE.exists():
        return None
    try:
        creds = Credentials.from_authorized_user_file(str(TOKEN_FILE), SCOPES)
        if creds and creds.expired and creds.refresh_token:
            from google.auth.transport.requests import Request
            creds.refresh(Request())
            with open(TOKEN_FILE, "w", encoding="utf-8") as token:
                token.write(creds.to_json())

        # Try fetching YouTube Channel info
        try:
            service = build("youtube", "v3", credentials=creds)
            ch_resp = service.channels().list(mine=True, part="snippet,statistics").execute()
            if "items" in ch_resp and len(ch_resp["items"]) > 0:
                item = ch_resp["items"][0]
                snippet = item.get("snippet", {})
                stats = item.get("statistics", {})
                thumb = snippet.get("thumbnails", {}).get("medium", {}).get("url") or snippet.get("thumbnails", {}).get("default", {}).get("url")
                
                return {
                    "channel_id": item.get("id", ""),
                    "title": snippet.get("title", "YouTube Channel"),
                    "description": snippet.get("description", ""),
                    "custom_url": snippet.get("customUrl", ""),
                    "avatar_url": thumb,
                    "subscriber_count": stats.get("subscriberCount", "0"),
                    "video_count": stats.get("videoCount", "0"),
                    "view_count": stats.get("viewCount", "0"),
                    "authenticated": True
                }
        except Exception:
            pass

        # Fallback to OAuth User Profile
        try:
            oauth_service = build("oauth2", "v2", credentials=creds)
            user_info = oauth_service.userinfo().get().execute()
            return {
                "channel_id": user_info.get("id", ""),
                "title": user_info.get("name", "Connected Creator"),
                "description": "",
                "custom_url": "",
                "avatar_url": user_info.get("picture", ""),
                "subscriber_count": "Active",
                "video_count": "-",
                "view_count": "-",
                "authenticated": True
            }
        except Exception:
            pass

        return {
            "channel_id": "",
            "title": "Connected YouTube Channel",
            "authenticated": True
        }
    except Exception as e:
        print(f"Error fetching channel details: {e}")
    return None

def connect_youtube_oauth(client_id: Optional[str] = None, client_secret: Optional[str] = None) -> Dict[str, Any]:
    """Runs interactive OAuth 2.0 flow to link a YouTube channel."""
    settings = load_settings()

    if client_id and client_secret:
        settings.youtube_client_id = client_id.strip()
        settings.youtube_client_secret = client_secret.strip()
        save_settings(settings)

    if not CLIENT_SECRETS_FILE.exists():
        if settings.youtube_client_id and settings.youtube_client_secret:
            cs_data = {
                "installed": {
                    "client_id": settings.youtube_client_id.strip(),
                    "client_secret": settings.youtube_client_secret.strip(),
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": ["http://localhost:8080/", "http://127.0.0.1:8080/"]
                }
            }
            with open(CLIENT_SECRETS_FILE, "w", encoding="utf-8") as cs_f:
                json.dump(cs_data, cs_f, indent=2)
        else:
            raise ValueError("Please provide your Google Cloud OAuth Client ID & Client Secret or upload client_secrets.json.")

    flow = InstalledAppFlow.from_client_secrets_file(str(CLIENT_SECRETS_FILE), SCOPES)
    creds = flow.run_local_server(port=8080, prompt="consent")

    with open(TOKEN_FILE, "w", encoding="utf-8") as token:
        token.write(creds.to_json())

    # Fetch channel metadata
    channel_info = get_channel_details()
    if channel_info:
        settings.youtube_channel_name = channel_info["title"]
        settings.youtube_channel_id = channel_info["channel_id"]
        settings.youtube_authenticated = True
        save_settings(settings)
        return channel_info

    settings.youtube_authenticated = True
    save_settings(settings)
    return {"authenticated": True, "title": "Connected Channel"}

def disconnect_youtube() -> bool:
    """Disconnects YouTube channel and deletes local tokens."""
    if TOKEN_FILE.exists():
        try:
            os.remove(TOKEN_FILE)
        except Exception:
            pass
    settings = load_settings()
    settings.youtube_authenticated = False
    settings.youtube_channel_name = ""
    settings.youtube_channel_id = ""
    save_settings(settings)
    return True

def get_youtube_service():
    """Authenticates and returns the YouTube Data API v3 service."""
    if not TOKEN_FILE.exists():
        raise ValueError("YouTube account is not connected. Please connect your channel in Settings.")

    creds = Credentials.from_authorized_user_file(str(TOKEN_FILE), SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            from google.auth.transport.requests import Request
            creds.refresh(Request())
            with open(TOKEN_FILE, "w", encoding="utf-8") as token:
                token.write(creds.to_json())
        else:
            raise ValueError("YouTube OAuth token expired or invalid. Please reconnect your channel.")

    return build("youtube", "v3", credentials=creds)

def upload_video_to_youtube(
    file_path: str,
    upload_req: YouTubeUploadRequest,
    progress_callback: Optional[Callable[[int, str], None]] = None
) -> Dict[str, Any]:
    """Uploads a video to YouTube with Shorts optimization & scheduling."""
    if progress_callback:
        progress_callback(10, "Connecting to YouTube Data API v3...")

    youtube = get_youtube_service()

    # Append #Shorts to title if not present
    final_title = upload_req.title
    if upload_req.is_short and "#Shorts" not in final_title and "#shorts" not in final_title:
        if len(final_title) <= 90:
            final_title += " #Shorts"

    # Status setup
    privacy = upload_req.privacy_status.lower()
    publish_at = None
    if upload_req.schedule_time:
        privacy = "private" # Must be private when scheduled
        publish_at = upload_req.schedule_time

    status_dict = {
        "privacyStatus": privacy,
        "selfDeclaredMadeForKids": upload_req.made_for_kids
    }
    if publish_at:
        status_dict["publishAt"] = publish_at

    body = {
        "snippet": {
            "title": final_title[:100],
            "description": upload_req.description,
            "tags": upload_req.tags,
            "categoryId": "22" # People & Blogs
        },
        "status": status_dict
    }

    if progress_callback:
        progress_callback(25, "Initiating resumable upload stream...")

    media = MediaFileUpload(
        file_path,
        mimetype="video/mp4",
        chunksize=1024 * 1024 * 4, # 4MB chunks
        resumable=True
    )

    request = youtube.videos().insert(
        part="snippet,status",
        body=body,
        media_body=media
    )

    response = None
    while response is None:
        status, response = request.next_chunk()
        if status:
            progress_pct = int(25 + status.progress() * 70)
            if progress_callback:
                progress_callback(progress_pct, f"Uploading to YouTube: {int(status.progress() * 100)}%")

    if progress_callback:
        progress_callback(100, "Upload completed successfully!")

    video_id = response.get("id")
    video_url = f"https://www.youtube.com/watch?v={video_id}"
    if upload_req.is_short:
        video_url = f"https://www.youtube.com/shorts/{video_id}"

    return {
        "youtube_video_id": video_id,
        "youtube_url": video_url,
        "title": final_title,
        "privacy": privacy,
        "status": "published" if not publish_at else "scheduled",
        "published_at": publish_at or datetime.datetime.now().isoformat()
    }

def get_queue() -> List[YouTubeQueueItem]:
    if QUEUE_FILE.exists():
        try:
            with open(QUEUE_FILE, "r", encoding="utf-8") as f:
                items = json.load(f)
                return [YouTubeQueueItem(**it) for it in items]
        except Exception:
            return []
    return []

def save_queue(items: List[YouTubeQueueItem]):
    with open(QUEUE_FILE, "w", encoding="utf-8") as f:
        json.dump([it.model_dump() for it in items], f, indent=2)

def add_to_queue(item: YouTubeQueueItem):
    queue = get_queue()
    queue.insert(0, item)
    save_queue(queue)

def get_uploaded_videos_stats(video_ids: List[str]) -> List[Dict[str, Any]]:
    """Fetches real-time view counts, likes, and comments for given YouTube video IDs."""
    if not video_ids:
        return []
    try:
        youtube = get_youtube_service()
        clean_ids = [v.strip() for v in video_ids if v and v.strip()]
        if not clean_ids:
            return []
        
        results = []
        for i in range(0, len(clean_ids), 50):
            chunk = clean_ids[i:i + 50]
            resp = youtube.videos().list(
                part="snippet,statistics",
                id=",".join(chunk)
            ).execute()
            
            for item in resp.get("items", []):
                snippet = item.get("snippet", {})
                stats = item.get("statistics", {})
                results.append({
                    "video_id": item.get("id"),
                    "title": snippet.get("title", ""),
                    "published_at": snippet.get("publishedAt", ""),
                    "view_count": int(stats.get("viewCount", 0)),
                    "like_count": int(stats.get("likeCount", 0)),
                    "comment_count": int(stats.get("commentCount", 0)),
                    "thumbnail": snippet.get("thumbnails", {}).get("medium", {}).get("url") or snippet.get("thumbnails", {}).get("default", {}).get("url")
                })
        return results
    except Exception as e:
        print(f"Error fetching video stats: {e}")
        return []

def get_recent_channel_uploads(max_results: int = 15) -> List[Dict[str, Any]]:
    """Retrieves recent videos uploaded to the authenticated channel with live view counts."""
    try:
        youtube = get_youtube_service()
        ch_resp = youtube.channels().list(mine=True, part="contentDetails").execute()
        items = ch_resp.get("items", [])
        if not items:
            return []
        uploads_playlist_id = items[0]["contentDetails"]["relatedPlaylists"]["uploads"]
        
        pl_resp = youtube.playlistItems().list(
            part="snippet,contentDetails",
            playlistId=uploads_playlist_id,
            maxResults=min(max_results, 50)
        ).execute()
        
        video_ids = [
            it["contentDetails"]["videoId"]
            for it in pl_resp.get("items", [])
            if "contentDetails" in it and "videoId" in it["contentDetails"]
        ]
        return get_uploaded_videos_stats(video_ids)
    except Exception as e:
        print(f"Error fetching channel uploads: {e}")
        return []
