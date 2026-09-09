import re
import json
import requests
from typing import Dict, Any, List, Optional
from backend.config import load_settings

def get_local_ai_status(url: Optional[str] = None) -> Dict[str, Any]:
    """Checks if a local AI server (Ollama, LM Studio, LocalAI) is active on the PC and lists available models."""
    settings = load_settings()
    base_url = (url or settings.local_ai_url or "http://localhost:11434/v1").rstrip("/")

    # Check 1: Standard OpenAI-compatible /models endpoint
    try:
        models_url = f"{base_url}/models"
        res = requests.get(models_url, timeout=2)
        if res.status_code == 200:
            data = res.json()
            models = []
            for m in data.get("data", []):
                if isinstance(m, dict) and "id" in m:
                    models.append(m["id"])
                elif isinstance(m, str):
                    models.append(m)

            server_type = "LM Studio / OpenAI Local"
            if "11434" in base_url:
                server_type = "Ollama (OpenAI API)"

            return {
                "available": True,
                "url": base_url,
                "server_type": server_type,
                "models": models if models else ["llama3:latest", "mistral:latest"],
                "message": f"Connected to {server_type} ({len(models)} models loaded) 🚀"
            }
    except Exception:
        pass

    # Check 2: Native Ollama /api/tags endpoint
    try:
        ollama_native = base_url.replace("/v1", "") + "/api/tags"
        res = requests.get(ollama_native, timeout=2)
        if res.status_code == 200:
            data = res.json()
            models = [m.get("name") for m in data.get("models", []) if isinstance(m, dict)]
            return {
                "available": True,
                "url": base_url,
                "server_type": "Ollama Local AI",
                "models": models if models else ["llama3:latest"],
                "message": f"Connected to Ollama on PC ({len(models)} models found) 🚀"
            }
    except Exception:
        pass

    return {
        "available": False,
        "url": base_url,
        "server_type": "None",
        "models": [],
        "message": f"Local AI server is not active at {base_url}.",
        "download_url": "https://ollama.com",
        "guide": "Install Ollama from https://ollama.com and run 'ollama run llama3' in PowerShell / Command Prompt."
    }

def call_local_llm(
    system_prompt: str,
    user_prompt: str,
    url: Optional[str] = None,
    model: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    """Calls a local AI server on the PC via OpenAI-compatible API."""
    settings = load_settings()
    base_url = (url or settings.local_ai_url or "http://localhost:11434/v1").rstrip("/")
    model_name = model or settings.local_ai_model or "llama3:latest"

    endpoint = f"{base_url}/chat/completions"
    headers = {"Content-Type": "application/json"}
    payload = {
        "model": model_name,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "temperature": 0.3,
        "stream": False
    }

    try:
        res = requests.post(endpoint, headers=headers, json=payload, timeout=90)
        if res.status_code == 200:
            data = res.json()
            content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
            # Clean JSON if wrapped in markdown blocks
            clean = re.sub(r"^```(?:json)?", "", content.strip(), flags=re.MULTILINE)
            clean = re.sub(r"```$", "", clean.strip(), flags=re.MULTILINE).strip()
            return json.loads(clean)
    except Exception as e:
        print(f"Local AI call error ({base_url}): {e}")

    return None
