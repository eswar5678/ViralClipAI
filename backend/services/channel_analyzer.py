import os
import re
from typing import List, Dict, Any, Optional
import yt_dlp

def normalize_channel_url(input_str: str) -> str:
    """Normalizes handle, username, or URL into full YouTube videos URL."""
    input_str = input_str.strip()
    if input_str.startswith("@"):
        return f"https://www.youtube.com/{input_str}/videos"
    elif not input_str.startswith("http://") and not input_str.startswith("https://"):
        if "/" in input_str:
            return f"https://www.youtube.com/{input_str}/videos"
        return f"https://www.youtube.com/@{input_str}/videos"
    
    # If it's a channel URL without /videos at the end
    if "youtube.com" in input_str or "youtu.be" in input_str:
        if not input_str.endswith("/videos") and not input_str.endswith("/featured"):
            input_str = input_str.rstrip("/") + "/videos"
    return input_str

from backend.config import load_settings

def parse_iso8601_duration(duration_str: str) -> int:
    """Parses ISO 8601 duration (e.g. PT2H33M43S, PT15M20S, PT45S) to total seconds."""
    if not duration_str:
        return 0
    match = re.match(r'PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?', duration_str)
    if not match:
        return 0
    h, m, s = match.groups()
    return (int(h or 0) * 3600) + (int(m or 0) * 60) + int(s or 0)

def extract_channel_identifier(input_str: str) -> Dict[str, str]:
    """Extracts handle, channel_id, or username from various YouTube URL formats."""
    s = input_str.strip()
    if s.startswith("@"):
        return {"type": "handle", "value": s[1:]}
    if "/@" in s:
        handle = s.split("/@")[1].split("/")[0].split("?")[0]
        return {"type": "handle", "value": handle}
    if "/channel/" in s:
        cid = s.split("/channel/")[1].split("/")[0].split("?")[0]
        return {"type": "id", "value": cid}
    if "/c/" in s or "/user/" in s:
        user = s.split("/c/" if "/c/" in s else "/user/")[1].split("/")[0].split("?")[0]
        return {"type": "forUsername", "value": user}
    if "/" not in s:
        return {"type": "handle", "value": s}
    return {"type": "url", "value": s}

def fetch_channel_via_api(channel_url: str, max_videos: int, api_key: str) -> Optional[Dict[str, Any]]:
    """Fetches channel and video data using official Google YouTube Data API v3."""
    try:
        import requests
        ident = extract_channel_identifier(channel_url)
        
        # 1. Fetch Channel Info
        ch_params: Dict[str, Any] = {
            "part": "snippet,contentDetails,statistics",
            "key": api_key
        }
        if ident["type"] == "handle":
            ch_params["forHandle"] = ident["value"]
        elif ident["type"] == "id":
            ch_params["id"] = ident["value"]
        elif ident["type"] == "forUsername":
            ch_params["forUsername"] = ident["value"]
        else:
            return None

        ch_res = requests.get("https://www.googleapis.com/youtube/v3/channels", params=ch_params, timeout=10)
        if ch_res.status_code != 200:
            return None
        
        ch_data = ch_res.json()
        items = ch_data.get("items", [])
        if not items:
            return None

        channel_obj = items[0]
        channel_title = channel_obj["snippet"]["title"]
        channel_id = channel_obj["id"]
        avatar_url = channel_obj["snippet"]["thumbnails"].get("high", {}).get("url") or channel_obj["snippet"]["thumbnails"].get("default", {}).get("url", "")
        uploads_playlist_id = channel_obj["contentDetails"]["relatedPlaylists"]["uploads"]

        # 2. Fetch Latest Uploads Playlist Items
        pl_params = {
            "part": "snippet,contentDetails",
            "playlistId": uploads_playlist_id,
            "maxResults": min(max_videos, 50),
            "key": api_key
        }
        pl_res = requests.get("https://www.googleapis.com/youtube/v3/playlistItems", params=pl_params, timeout=10)
        if pl_res.status_code != 200:
            return None
        
        pl_items = pl_res.json().get("items", [])
        if not pl_items:
            return {
                "channel_title": channel_title,
                "channel_id": channel_id,
                "channel_url": f"https://www.youtube.com/channel/{channel_id}",
                "avatar_url": avatar_url,
                "videos": [],
                "total_fetched": 0
            }

        video_ids = [it["contentDetails"]["videoId"] for it in pl_items]
        
        # 3. Fetch detailed statistics and duration for these videos
        vid_params = {
            "part": "snippet,contentDetails,statistics",
            "id": ",".join(video_ids),
            "key": api_key
        }
        vid_res = requests.get("https://www.googleapis.com/youtube/v3/videos", params=vid_params, timeout=10)
        videos_dict = {}
        if vid_res.status_code == 200:
            for v in vid_res.json().get("items", []):
                videos_dict[v["id"]] = v

        videos = []
        for it in pl_items:
            v_id = it["contentDetails"]["videoId"]
            v_detail = videos_dict.get(v_id)
            snippet = v_detail["snippet"] if v_detail else it["snippet"]
            stats = v_detail.get("statistics", {}) if v_detail else {}
            content_details = v_detail.get("contentDetails", {}) if v_detail else {}
            
            dur_seconds = parse_iso8601_duration(content_details.get("duration", ""))
            view_count = int(stats.get("viewCount", 0))
            upload_date = snippet.get("publishedAt", "")[:10]
            
            thumb_url = snippet.get("thumbnails", {}).get("maxres", {}).get("url") or \
                        snippet.get("thumbnails", {}).get("high", {}).get("url") or \
                        snippet.get("thumbnails", {}).get("medium", {}).get("url", f"https://i.ytimg.com/vi/{v_id}/hqdefault.jpg")

            videos.append({
                "video_id": v_id,
                "title": snippet.get("title", "Untitled Video"),
                "url": f"https://www.youtube.com/watch?v={v_id}",
                "thumbnail_url": thumb_url,
                "duration": dur_seconds,
                "duration_formatted": _format_duration(dur_seconds),
                "view_count": view_count,
                "view_count_formatted": _format_views(view_count),
                "upload_date": upload_date,
            })

        return {
            "channel_title": channel_title,
            "channel_id": channel_id,
            "channel_url": f"https://www.youtube.com/channel/{channel_id}",
            "avatar_url": avatar_url,
            "videos": videos,
            "total_fetched": len(videos)
        }
    except Exception as e:
        print(f"YouTube Data API error: {e}")
        return None

def fetch_channel_latest_videos(channel_url: str, max_videos: int = 10) -> Dict[str, Any]:
    """Fetches channel information and latest videos using YouTube Data API v3 with yt-dlp fallback."""
    settings = load_settings()
    api_key = settings.youtube_api_key or "AIzaSyBZYh2zhmgKucpo5274IQNnCcW_JLXDO-Y"
    
    # Try official YouTube Data API v3 first
    if api_key and api_key.strip():
        api_res = fetch_channel_via_api(channel_url, max_videos, api_key.strip())
        if api_res and api_res.get("videos"):
            return api_res

    # Fallback to yt-dlp
    normalized_url = normalize_channel_url(channel_url)
    
    ydl_opts = {
        'extract_flat': 'in_playlist',
        'playlist_items': f'1:{max_videos}',
        'quiet': True,
        'no_warnings': True,
        'nocheckcertificate': True,
        'ignoreerrors': True,
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(normalized_url, download=False)
        if not info:
            raise ValueError(f"Could not fetch channel information from {channel_url}")

        channel_title = info.get('title') or info.get('uploader') or "YouTube Channel"
        channel_title = re.sub(r'\s*-\s*Videos$', '', channel_title)
        
        channel_id = info.get('id') or info.get('channel_id') or ""
        channel_url_final = info.get('channel_url') or info.get('webpage_url') or normalized_url
        
        thumbnails = info.get('thumbnails', [])
        avatar_url = thumbnails[-1]['url'] if thumbnails else f"https://www.youtube.com/s/desktop/f675685d/img/favicon_144x144.png"

        raw_entries = info.get('entries', []) or []
        videos = []

        for entry in raw_entries:
            if not entry:
                continue
            v_id = entry.get('id')
            if not v_id:
                continue

            v_title = entry.get('title') or "Untitled Video"
            v_dur = entry.get('duration') or 0
            v_views = entry.get('view_count') or 0
            v_date = entry.get('upload_date') or ""
            
            if v_date and len(v_date) == 8:
                v_date = f"{v_date[:4]}-{v_date[4:6]}-{v_date[6:]}"

            v_thumbs = entry.get('thumbnails', [])
            v_thumb_url = f"https://i.ytimg.com/vi/{v_id}/hqdefault.jpg"
            if v_thumbs:
                v_thumb_url = v_thumbs[-1].get('url', v_thumb_url)

            videos.append({
                "video_id": v_id,
                "title": v_title,
                "url": f"https://www.youtube.com/watch?v={v_id}",
                "thumbnail_url": v_thumb_url,
                "duration": v_dur,
                "duration_formatted": _format_duration(v_dur),
                "view_count": v_views,
                "view_count_formatted": _format_views(v_views),
                "upload_date": v_date,
            })

        return {
            "channel_title": channel_title,
            "channel_id": channel_id,
            "channel_url": channel_url_final,
            "avatar_url": avatar_url,
            "videos": videos,
            "total_fetched": len(videos)
        }

def _format_duration(seconds: int) -> str:
    if not seconds:
        return "0:00"
    m, s = divmod(int(seconds), 60)
    h, m = divmod(m, 60)
    if h > 0:
        return f"{h}:{m:02d}:{s:02d}"
    return f"{m}:{s:02d}"

def _format_views(views: int) -> str:
    if not views:
        return "0 views"
    if views >= 1_000_000:
        return f"{views / 1_000_000:.1f}M views"
    if views >= 1_000:
        return f"{views / 1_000:.1f}K views"
    return f"{views} views"
