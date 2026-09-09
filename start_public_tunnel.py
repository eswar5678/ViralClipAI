import os
import sys
import re
import time
import urllib.request
import subprocess
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
BIN_DIR = ROOT_DIR / "backend" / "data" / "bin"
CLOUDFLARED_EXE = BIN_DIR / "cloudflared.exe"
DOWNLOAD_URL = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"

def ensure_cloudflared():
    """Downloads official standalone cloudflared.exe if not present."""
    if CLOUDFLARED_EXE.exists() and CLOUDFLARED_EXE.stat().st_size > 1000000:
        return str(CLOUDFLARED_EXE)
    
    BIN_DIR.mkdir(parents=True, exist_ok=True)
    print("⏳ Downloading official Cloudflare Tunnel tool (cloudflared.exe)...")
    try:
        urllib.request.urlretrieve(DOWNLOAD_URL, str(CLOUDFLARED_EXE))
        print("✅ Downloaded cloudflared successfully!")
        return str(CLOUDFLARED_EXE)
    except Exception as e:
        print(f"❌ Failed to download cloudflared automatically: {e}")
        return None

def is_server_running(port=8000):
    """Checks if ViralClip AI backend is active on the given port."""
    try:
        req = urllib.request.Request(f"http://127.0.0.1:{port}/api/system/status", headers={'User-Agent': 'TunnelTester/1.0'})
        with urllib.request.urlopen(req, timeout=1) as response:
            return response.status == 200
    except Exception:
        return False

def start_tunnel(local_port=8000):
    """Starts a Cloudflare Quick Tunnel and extracts the live public HTTPS URL."""
    # Check if local backend is running, if not start it automatically
    backend_proc = None
    if not is_server_running(local_port):
        print(f"⚙️ ViralClip AI backend is not running on port {local_port}. Starting it automatically...")
        sub_env = os.environ.copy()
        sub_env["PYTHONIOENCODING"] = "utf-8"
        sub_env["PYTHONUTF8"] = "1"
        backend_cmd = [sys.executable, "-m", "uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", str(local_port)]
        backend_proc = subprocess.Popen(
            backend_cmd,
            cwd=str(ROOT_DIR),
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            env=sub_env
        )
        # Wait up to 10 seconds for backend to start
        for _ in range(20):
            if is_server_running(local_port):
                print("✅ ViralClip AI backend started successfully!")
                break
            time.sleep(0.5)

    exe_path = ensure_cloudflared()
    if not exe_path:
        print("Please check your internet connection and try again.")
        if backend_proc:
            backend_proc.terminate()
        return

    print("🚀 Connecting to Cloudflare Global Edge Network...")
    cmd = [exe_path, "tunnel", "--url", f"http://127.0.0.1:{local_port}"]
    
    proc = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        encoding="utf-8",
        errors="replace"
    )

    public_url = None
    start_wait = time.time()
    
    # Read stderr to grab the generated trycloudflare.com URL
    while time.time() - start_wait < 30:
        line = proc.stderr.readline()
        if not line and proc.poll() is not None:
            break
        
        # Match trycloudflare URL
        match = re.search(r'(https://[a-zA-Z0-9-]+\.trycloudflare\.com)', line)
        if match:
            public_url = match.group(1)
            break
        elif "Registered tunnel connection" in line:
            # Continue reading to find URL
            pass

    if public_url:
        print("\n" + "=" * 65)
        print("  🎉 YOUR VIRALCLIP AI WEBSITE IS LIVE WORLDWIDE FOR FREE!")
        print("=" * 65)
        print(f"\n👉 Public HTTPS Website URL:\n   \033[1;32m{public_url}\033[0m")
        print("\n📱 You can now open this link on your phone, laptop, or share")
        print("   it with anyone anywhere in the world!")
        print("🔒 Protected with Cloudflare SSL & Anti-DDoS.")
        print("⚡ Runs with full hardware acceleration from your computer!")
        print("\n👉 Keep this window open to maintain online access.")
        print("👉 Press Ctrl+C anytime to stop.\n" + "=" * 65 + "\n")
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\nStopping Cloudflare Tunnel...")
            proc.terminate()
            if backend_proc:
                print("Stopping local backend...")
                backend_proc.terminate()
    else:
        print("⚠️ Could not retrieve public URL from Cloudflare. Make sure port 8000 is running.")
        proc.terminate()
        if backend_proc:
            backend_proc.terminate()

if __name__ == "__main__":
    port = 8000
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            pass
    start_tunnel(port)
