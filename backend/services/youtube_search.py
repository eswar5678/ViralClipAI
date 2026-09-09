import html
import re
from typing import List, Dict, Any, Optional
import requests
import yt_dlp
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

def format_duration(seconds: int) -> str:
    if not seconds:
        return "0:00"
    m, s = divmod(int(seconds), 60)
    h, m = divmod(m, 60)
    if h > 0:
        return f"{h}:{m:02d}:{s:02d}"
    return f"{m}:{s:02d}"

def format_views(views: int) -> str:
    if not views:
        return "0 views"
    if views >= 1_000_000:
        return f"{views / 1_000_000:.1f}M views"
    if views >= 1_000:
        return f"{views / 1_000:.1f}K views"
    return f"{views} views"

def search_youtube_api(
    query: str,
    max_results: int = 12,
    order: str = "relevance",
    video_duration: str = "any",
    api_key: str = ""
) -> Optional[List[Dict[str, Any]]]:
    """Searches YouTube videos using official Google YouTube Data API v3."""
    try:
        search_params: Dict[str, Any] = {
            "part": "snippet",
            "type": "video",
            "q": query,
            "maxResults": min(max_results, 50),
            "order": order,
            "key": api_key
        }
        if video_duration in ["short", "medium", "long"]:
            search_params["videoDuration"] = video_duration

        search_res = requests.get("https://www.googleapis.com/youtube/v3/search", params=search_params, timeout=10)
        if search_res.status_code != 200:
            return None

        items = search_res.json().get("items", [])
        if not items:
            return []

        video_ids = [it["id"]["videoId"] for it in items if "id" in it and "videoId" in it["id"]]
        if not video_ids:
            return []

        # Fetch detailed duration, statistics, and high-res thumbnails
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

        results = []
        for it in items:
            v_id = it.get("id", {}).get("videoId")
            if not v_id:
                continue

            v_detail = videos_dict.get(v_id)
            snippet = v_detail["snippet"] if v_detail else it.get("snippet", {})
            stats = v_detail.get("statistics", {}) if v_detail else {}
            content_details = v_detail.get("contentDetails", {}) if v_detail else {}

            dur_seconds = parse_iso8601_duration(content_details.get("duration", ""))
            view_count = int(stats.get("viewCount", 0))
            upload_date = snippet.get("publishedAt", "")[:10]
            raw_title = snippet.get("title", "Untitled Video")
            title = html.unescape(raw_title)
            channel_title = html.unescape(snippet.get("channelTitle", "YouTube Creator"))
            description = html.unescape(snippet.get("description", ""))

            thumb_url = snippet.get("thumbnails", {}).get("maxres", {}).get("url") or \
                        snippet.get("thumbnails", {}).get("high", {}).get("url") or \
                        snippet.get("thumbnails", {}).get("medium", {}).get("url", f"https://i.ytimg.com/vi/{v_id}/hqdefault.jpg")

            results.append({
                "video_id": v_id,
                "title": title,
                "channel_title": channel_title,
                "channel_id": snippet.get("channelId", ""),
                "description": description,
                "url": f"https://www.youtube.com/watch?v={v_id}",
                "thumbnail_url": thumb_url,
                "duration": dur_seconds,
                "duration_formatted": format_duration(dur_seconds),
                "view_count": view_count,
                "view_count_formatted": format_views(view_count),
                "upload_date": upload_date,
            })

        return results
    except Exception as e:
        print(f"YouTube Search API error: {e}")
        return None

def search_youtube_ytdlp(query: str, max_results: int = 12) -> List[Dict[str, Any]]:
    """Fallback search using yt-dlp flat extraction."""
    ydl_opts = {
        'extract_flat': 'in_playlist',
        'playlist_items': f'1:{max_results}',
        'quiet': True,
        'no_warnings': True,
        'nocheckcertificate': True,
        'ignoreerrors': True,
    }

    search_query = f"ytsearch{max_results}:{query}"
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(search_query, download=False)
        entries = info.get('entries', []) if info else []
        results = []

        for e in entries:
            if not e:
                continue
            v_id = e.get('id')
            if not v_id:
                continue

            v_dur = e.get('duration') or 0
            v_views = e.get('view_count') or 0
            v_date = e.get('upload_date') or ""
            if v_date and len(v_date) == 8:
                v_date = f"{v_date[:4]}-{v_date[4:6]}-{v_date[6:]}"

            v_thumbs = e.get('thumbnails', [])
            v_thumb_url = f"https://i.ytimg.com/vi/{v_id}/hqdefault.jpg"
            if v_thumbs:
                v_thumb_url = v_thumbs[-1].get('url', v_thumb_url)

            results.append({
                "video_id": v_id,
                "title": html.unescape(e.get('title', 'Untitled Video')),
                "channel_title": html.unescape(e.get('uploader') or e.get('channel') or "YouTube Creator"),
                "channel_id": e.get('channel_id', ''),
                "description": html.unescape(e.get('description', '') or ''),
                "url": f"https://www.youtube.com/watch?v={v_id}",
                "thumbnail_url": v_thumb_url,
                "duration": v_dur,
                "duration_formatted": format_duration(v_dur),
                "view_count": v_views,
                "view_count_formatted": format_views(v_views),
                "upload_date": v_date,
            })

        return results

def search_youtube(
    query: str,
    max_results: int = 12,
    order: str = "relevance",
    video_duration: str = "any"
) -> List[Dict[str, Any]]:
    """Hybrid search function trying official YouTube API first then yt-dlp."""
    settings = load_settings()
    api_key = settings.youtube_api_key or "AIzaSyBZYh2zhmgKucpo5274IQNnCcW_JLXDO-Y"

    if api_key and api_key.strip():
        api_results = search_youtube_api(
            query=query,
            max_results=max_results,
            order=order,
            video_duration=video_duration,
            api_key=api_key.strip()
        )
        if api_results is not None:
            return api_results

    return search_youtube_ytdlp(query=query, max_results=max_results)
