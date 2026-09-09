import os
import sys
import time
import socket
import urllib.request
import webbrowser
import subprocess
from pathlib import Path

# Configure Windows console encoding for Unicode/Emojis
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass
if hasattr(sys.stderr, 'reconfigure'):
    try:
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

def get_lan_ip() -> str:
    """Detects the primary local network IP address for mobile devices to connect to."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        try:
            return socket.gethostbyname(socket.gethostname())
        except Exception:
            return "127.0.0.1"

def is_server_running(url="http://127.0.0.1:8000/api/system/status") -> bool:
    """Checks if ViralClip AI backend is already active."""
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'ViralClipLauncher/1.0'})
        with urllib.request.urlopen(req, timeout=1) as response:
            return response.status == 200
    except Exception:
        return False

def free_port_8000():
    """Frees port 8000 on Windows if an unresponsive process is lingering."""
    try:
        cmd = 'powershell -Command "Get-Process -Id (Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue).OwningProcess -ErrorAction SilentlyContinue | Stop-Process -Force"'
        subprocess.run(cmd, shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        time.sleep(0.5)
    except Exception:
        pass

def launch_app_window(url="http://127.0.0.1:8000"):
    """Launches app window in Edge/Chrome app mode or default browser."""
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
                subprocess.Popen([browser_exe, f"--app={url}", "--window-size=1440,920"])
                return
            except Exception:
                pass
    webbrowser.open(url)

def main():
    root_dir = Path(__file__).resolve().parent
    app_url = "http://127.0.0.1:8000"
    lan_ip = get_lan_ip()
    mobile_url = f"http://{lan_ip}:8000"

    print("=" * 65)
    print("  🚀 Starting ViralClip AI - Opus Studio & YouTube Auto-Poster")
    print("=" * 65)

    # Check if already running
    if is_server_running():
        print("⚡ ViralClip AI is already running! Opening application dashboard...")
        launch_app_window(app_url)
        print(f"\n✅ Local Desktop : {app_url}")
        print(f"📱 Mobile Device : {mobile_url}\n")
        return

    # Free port in case of stale socket
    free_port_8000()

    # Start FastAPI Backend on 0.0.0.0 for LAN & Mobile access
    print("[1/2] Launching Python AI & Video Processing Backend (0.0.0.0:8000)...")
    backend_cmd = [sys.executable, "-m", "uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
    
    sub_env = os.environ.copy()
    sub_env["PYTHONIOENCODING"] = "utf-8"
    sub_env["PYTHONUTF8"] = "1"

    server_proc = subprocess.Popen(
        backend_cmd,
        cwd=str(root_dir),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        encoding="utf-8",
        errors="replace",
        env=sub_env
    )

    # Wait for server to become responsive
    for _ in range(15):
        if is_server_running():
            break
        time.sleep(0.3)

    print(f"[2/2] Launching Desktop Application UI at {app_url}...")
    launch_app_window(app_url)

    print("\n✅ ViralClip AI is running successfully!")
    print(f"👉 Local Desktop URL : {app_url}")
    print(f"📱 Mobile Device URL  : {mobile_url} (same Wi-Fi)")
    print("🌐 Worldwide Web URL  : Run 'Launch_Online_Website.bat' for a free public HTTPS link from anywhere!")
    print("👉 Press Ctrl+C to stop the server anytime.\n")

    try:
        while True:
            line = server_proc.stdout.readline()
            if line:
                try:
                    print(f"[Engine] {line.strip()}")
                except UnicodeEncodeError:
                    clean_line = line.strip().encode('ascii', 'replace').decode('ascii')
                    print(f"[Engine] {clean_line}")
            elif server_proc.poll() is not None:
                break
    except KeyboardInterrupt:
        print("\nStopping ViralClip AI...")
        server_proc.terminate()
        sys.exit(0)

if __name__ == "__main__":
    main()
