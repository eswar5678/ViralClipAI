# 🚀 ViralClip AI - Opus Studio & YouTube Auto-Poster (Windows)

An advanced AI-powered video clipping, auto-reframing, dynamic subtitle generator, and automated YouTube Shorts publishing tool for Windows.

---

## ✨ Key Features

1. **🎬 Smart Video Ingestion**:
   - Drag & Drop local video files (`.mp4`, `.mov`, `.mkv`, `.webm`)
   - 1-Click YouTube Video / Podcast URL Downloader via `yt-dlp`

2. **🧠 AI Virality & Hook Scoring (Opus Clip Engine)**:
   - Evaluates video transcripts with **Google Gemini Flash** / **OpenAI GPT-4o**
   - Automatically detects 3-second opening curiosity hooks
   - Scores clips from 0 to 100 with Hook Strength, Engagement Flow, and Retention Breakdown
   - Auto-generates 3 click-worthy YouTube Short titles with emojis, SEO descriptions, and trending hashtags

3. **🗣️ Word-Level Karaoke Subtitles (Alex Hormozi Style)**:
   - Word-by-word active glow animations
   - Presets: *Alex Hormozi Gold*, *Cyber Neon*, *Beast Mode*, *Clean Minimalist*
   - Automatic emoji injection on key sentiment keywords (💰, 🔥, 🚀, 😱, 🧠, ⚡)
   - Real-time subtitle styling customizer (colors, fonts, outlines, sizes)

4. **📐 9:16 Vertical Auto-Reframing**:
   - Smart active speaker face tracking (panning & center crop)
   - Blur mirror background fill
   - Split-screen podcast layout (Top Host / Bottom Guest)

5. **⚡ Hardware GPU Accelerated Rendering**:
   - Auto-detects NVIDIA NVENC (`h264_nvenc`), Intel QuickSync (`h264_qsv`), AMD AMF, or multi-threaded CPU
   - 1080x1920 60fps Full HD output

6. **📅 YouTube Data API v3 Auto-Poster & Scheduler**:
   - OAuth 2.0 direct integration with your YouTube channel
   - 1-Click publish or schedule future date/time (`publishAt`)
   - Resumable chunked upload with live progress tracking
   - Publishing queue manager and history viewer

---

## 🛠️ Quick Start

### 1. Launch the Application
Double-click `start_app.bat` or run:
```bash
python start_app.py
```
This launches the FastAPI engine and opens the interactive Studio UI in your browser at `http://127.0.0.1:8000`.

---

## 🔑 API Keys & YouTube OAuth Setup

1. **Google Gemini API Key (Recommended)**:
   - Get a free key at [Google AI Studio](https://aistudio.google.com/app/apikey).
   - Enter it in the **Settings** menu.

2. **YouTube Data API v3 OAuth**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/).
   - Create a project and enable **YouTube Data API v3**.
   - Under **OAuth Consent Screen**, set User Type to External and add your email as a Test User.
   - Create an **OAuth Client ID** (Application Type: *Desktop App*).
   - Copy your **Client ID** and **Client Secret** into the app's **Settings** modal.

---

## 📂 Project Architecture

```
d:/folder/ClipperTool/
├── backend/
│   ├── main.py                  # FastAPI server + WebSocket progress broadcaster
│   ├── config.py                # Settings & path management
│   ├── models.py                # Pydantic data schemas
│   └── services/
│       ├── downloader.py        # yt-dlp & local metadata extractor
│       ├── transcriber.py       # Whisper word-level timestamp transcriber
│       ├── virality_analyzer.py # Gemini/OpenAI virality scoring & hook detection
│       ├── face_tracker.py      # 9:16 vertical layout & speaker pan calculator
│       ├── subtitle_engine.py   # ASS karaoke animated subtitle engine
│       ├── video_renderer.py    # Hardware-accelerated FFmpeg renderer
│       └── youtube_publisher.py # YouTube Data API v3 OAuth & uploader
├── frontend/
│   ├── src/                     # React + Vite + Tailwind CSS desktop UI
│   └── dist/                    # Production bundle
├── electron/
│   └── main.cjs                 # Optional Electron wrapper
├── start_app.bat                # 1-Click Windows batch launcher
└── start_app.py                 # Universal app launcher script
```
