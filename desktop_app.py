import sys
import os
import time
import threading
import subprocess
from pathlib import Path
import uvicorn

# Fix Windows console encoding
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

# Ensure working directory is application root
BASE_DIR = Path(__file__).resolve().parent
os.chdir(BASE_DIR)
sys.path.insert(0, str(BASE_DIR))

# Ensure FFmpeg is found
try:
    from backend.config import get_ffmpeg_path
    get_ffmpeg_path()
except Exception:
    pass

def start_server():
    """Runs FastAPI backend on 127.0.0.1:8000."""
    try:
        from backend.main import app
        uvicorn.run(app, host="127.0.0.1", port=8000, log_level="warning")
    except Exception as e:
        print(f"[Server Error] {e}")

import urllib.request

def wait_for_server(url="http://127.0.0.1:8000/api/system/status", timeout=15) -> bool:
    """Waits until the backend server is ready to accept HTTP connections."""
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'ViralClipLauncher/1.0'})
            with urllib.request.urlopen(req, timeout=1) as response:
                if response.status == 200:
                    return True
        except Exception:
            time.sleep(0.2)
    return False

def launch_native_app_window(url="http://127.0.0.1:8000"):
    """Launches an app-mode window using Microsoft Edge or Google Chrome (no browser URL bars)."""
    chrome_paths = [
        os.path.expandvars(r"%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"),
        os.path.expandvars(r"%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"),
        os.path.expandvars(r"%ProgramFiles%\Google\Chrome\Application\chrome.exe"),
        os.path.expandvars(r"%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"),
        os.path.expandvars(r"%LocalAppData%\Microsoft\Edge\Application\msedge.exe"),
        os.path.expandvars(r"%LocalAppData%\Google\Chrome\Application\chrome.exe"),
    ]
    
    for browser_exe in chrome_paths:
        if os.path.exists(browser_exe):
            try:
                proc = subprocess.Popen([
                    browser_exe,
                    f"--app={url}",
                    "--window-size=1440,920",
                    "--window-position=50,50",
                    "--disable-background-timer-throttling",
                ])
                return proc
            except Exception:
                pass
    return None

def main():
    print("=" * 60)
    print("  🎬 Starting ViralClip AI - Windows Desktop Application")
    print("=" * 60)

    # 1. Start Server in background thread
    server_thread = threading.Thread(target=start_server, daemon=True)
    server_thread.start()

    # 2. Actively wait for server to become ready
    print("[Engine] Waiting for backend AI services to initialize...")
    ready = wait_for_server(timeout=15)
    if ready:
        print("✅ Backend AI Engine is ONLINE (http://127.0.0.1:8000)")
    else:
        print("⚠️ Backend server took longer than expected, launching window now...")

    # 3. Launch App Mode Window (Ultra-fast, hardware accelerated, native dark titlebar)
    app_proc = launch_native_app_window("http://127.0.0.1:8000")
    if app_proc:
        try:
            app_proc.wait()
            sys.exit(0)
        except KeyboardInterrupt:
            sys.exit(0)

    # 4. Fallback: Default system browser
    import webbrowser
    webbrowser.open("http://127.0.0.1:8000")
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        sys.exit(0)

    # Keep main thread alive if browser app mode launched
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        sys.exit(0)

if __name__ == "__main__":
    main()
