import {
  VideoMetadata,
  ClipSuggestion,
  AppSettings,
  SystemStatus,
  YouTubeChannelInfo,
  YouTubeSearchResultItem,
  ChannelScanResult,
  AIDescriptionResult,
  AITagsResult,
  AIAnalyzeResult,
  RenderClipRequest,
  YouTubeUploadRequest,
  YouTubeQueueItem,
  WSProgressMessage,
  AutoPilotConfig,
  AutoPilotStatusResponse,
} from './types';

export const BACKEND_URL_STORAGE_KEY = 'viralclip_backend_url';

export function getCustomBackendUrl(): string {
  try {
    return localStorage.getItem(BACKEND_URL_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

export function setCustomBackendUrl(url: string) {
  try {
    if (!url || !url.trim()) {
      localStorage.removeItem(BACKEND_URL_STORAGE_KEY);
    } else {
      let clean = url.trim();
      if (clean.endsWith('/')) clean = clean.slice(0, -1);
      localStorage.setItem(BACKEND_URL_STORAGE_KEY, clean);
    }
  } catch (e) {
    console.error('Failed to save backend URL', e);
  }
}

export function getApiBaseUrl(): string {
  const custom = getCustomBackendUrl();
  if (custom) {
    return `${custom}/api`;
  }
  return '/api';
}

export function getWsUrl(): string {
  const custom = getCustomBackendUrl();
  if (custom) {
    const wsProtocol = custom.startsWith('https:') ? 'wss:' : 'ws:';
    const cleanHost = custom.replace(/^https?:\/\//, '');
    return `${wsProtocol}//${cleanHost}/ws`;
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  return `${protocol}//${host}/ws`;
}

export const api = {
  async testConnection(targetUrl?: string): Promise<{ success: boolean; message: string; data?: any }> {
    const base = targetUrl
      ? (targetUrl.endsWith('/') ? targetUrl.slice(0, -1) : targetUrl)
      : (getCustomBackendUrl() || window.location.origin);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`${base}/api/system/status`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        return { success: true, message: 'Connected to ViralClip AI backend!', data };
      }
      return { success: false, message: `Server returned HTTP ${res.status}` };
    } catch (e: any) {
      return {
        success: false,
        message: e.name === 'AbortError' ? 'Connection timed out' : (e.message || 'Cannot reach server'),
      };
    }
  },

  async getSystemStatus(): Promise<SystemStatus> {
    const res = await fetch(`${getApiBaseUrl()}/system/status`);
    if (!res.ok) throw new Error('Failed to fetch system status');
    return res.json();
  },

  async getSettings(): Promise<AppSettings> {
    const res = await fetch(`${getApiBaseUrl()}/settings`);
    if (!res.ok) throw new Error('Failed to fetch settings');
    return res.json();
  },

  async updateSettings(settings: AppSettings): Promise<{ status: string; settings: AppSettings }> {
    const res = await fetch(`${getApiBaseUrl()}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    if (!res.ok) throw new Error('Failed to update settings');
    return res.json();
  },

  async importVideoFile(file: File): Promise<VideoMetadata> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${getApiBaseUrl()}/video/import`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to upload video' }));
      throw new Error(err.detail || 'Upload failed');
    }
    return res.json();
  },

  async importYouTubeVideo(url: string): Promise<VideoMetadata> {
    const formData = new FormData();
    formData.append('youtube_url', url);
    const res = await fetch(`${getApiBaseUrl()}/video/import`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      let errorDetail = 'Failed to download YouTube video';
      try {
        const errJson = await res.json();
        errorDetail = errJson.detail || errJson.message || JSON.stringify(errJson);
      } catch {
        const errTxt = await res.text().catch(() => '');
        if (errTxt) errorDetail = errTxt;
      }
      throw new Error(errorDetail);
    }
    return res.json();
  },

  async processVideo(params: {
    source_type: string;
    url_or_path: string;
    clip_count?: number;
    min_duration?: number;
    max_duration?: number;
    subtitle_preset?: string;
    layout_preset?: string;
    translate_to_english?: boolean;
  }): Promise<{ status: string; video_id: string }> {
    const res = await fetch(`${getApiBaseUrl()}/video/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_type: params.source_type,
        url_or_path: params.url_or_path,
        clip_count: params.clip_count || 5,
        min_duration: params.min_duration || 20,
        max_duration: params.max_duration || 60,
        subtitle_preset: params.subtitle_preset || 'hormozi',
        layout_preset: params.layout_preset || 'active_speaker',
        use_ai: true,
        translate_to_english: params.translate_to_english !== undefined ? params.translate_to_english : true,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to start processing' }));
      throw new Error(err.detail || 'Processing failed');
    }
    return res.json();
  },

  async getClips(videoId: string): Promise<ClipSuggestion[]> {
    const res = await fetch(`${getApiBaseUrl()}/clips/${videoId}`);
    if (!res.ok) throw new Error('Failed to fetch clips');
    return res.json();
  },

  async renderClip(params: RenderClipRequest): Promise<{ status: string; clip_id: string; preview_url: string }> {
    const res = await fetch(`${getApiBaseUrl()}/clips/render`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Render failed' }));
      throw new Error(err.detail || 'Render failed');
    }
    return res.json();
  },

  async getYouTubeChannelInfo(): Promise<YouTubeChannelInfo> {
    const res = await fetch(`${getApiBaseUrl()}/youtube/channel`);
    if (!res.ok) throw new Error('Failed to fetch channel info');
    return res.json();
  },

  async connectYouTube(credentials?: { client_id?: string; client_secret?: string }): Promise<{ status: string; channel: YouTubeChannelInfo }> {
    const res = await fetch(`${getApiBaseUrl()}/youtube/auth/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials || {}),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to connect YouTube channel' }));
      throw new Error(err.detail || 'Connection failed');
    }
    return res.json();
  },

  async uploadClientSecrets(file: File): Promise<{ status: string; message: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${getApiBaseUrl()}/youtube/auth/upload_secrets`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to upload client_secrets.json' }));
      throw new Error(err.detail || 'Upload failed');
    }
    return res.json();
  },

  async uploadYouTubeToken(file: File): Promise<{ status: string; message: string; channel?: YouTubeChannelInfo }> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${getApiBaseUrl()}/youtube/auth/upload_token`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to upload youtube_token.json' }));
      throw new Error(err.detail || 'Upload failed');
    }
    return res.json();
  },

  async disconnectYouTube(): Promise<{ status: string; disconnected: boolean }> {
    const res = await fetch(`${getApiBaseUrl()}/youtube/auth/disconnect`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to disconnect YouTube account');
    return res.json();
  },

  async searchYouTubeVideos(params: {
    query: string;
    max_results?: number;
    order?: string;
    video_duration?: string;
  }): Promise<YouTubeSearchResultItem[]> {
    const res = await fetch(`${getApiBaseUrl()}/youtube/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to search YouTube' }));
      throw new Error(err.detail || 'Search failed');
    }
    return res.json();
  },

  async scanChannel(channelUrl: string, maxVideos: number = 10): Promise<ChannelScanResult> {
    const res = await fetch(`${getApiBaseUrl()}/channel/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel_url: channelUrl, max_videos: maxVideos }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to scan YouTube channel' }));
      throw new Error(err.detail || 'Channel scan failed');
    }
    return res.json();
  },

  async generateAIDescription(params: {
    title: string;
    transcript_summary?: string;
    tone?: string;
    keywords?: string[];
    call_to_action?: string;
  }): Promise<AIDescriptionResult> {
    const res = await fetch(`${getApiBaseUrl()}/ai/description`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error('Failed to generate AI description');
    return res.json();
  },

  async generateAITags(params: {
    title: string;
    topic?: string;
    transcript_summary?: string;
  }): Promise<AITagsResult> {
    const res = await fetch(`${getApiBaseUrl()}/ai/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error('Failed to generate AI tags');
    return res.json();
  },

  async analyzeVideoContent(params: {
    title: string;
    transcript_summary?: string;
  }): Promise<AIAnalyzeResult> {
    const res = await fetch(`${getApiBaseUrl()}/ai/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error('Failed to analyze video content');
    return res.json();
  },

  async uploadToYouTube(req: YouTubeUploadRequest): Promise<any> {
    const res = await fetch(`${getApiBaseUrl()}/youtube/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'YouTube upload failed' }));
      throw new Error(err.detail || 'Upload failed');
    }
    return res.json();
  },

  async getYouTubeQueue(): Promise<YouTubeQueueItem[]> {
    const res = await fetch(`${getApiBaseUrl()}/youtube/queue`);
    if (!res.ok) throw new Error('Failed to fetch YouTube queue');
    return res.json();
  },

  async deleteQueueItem(id: string): Promise<void> {
    await fetch(`${getApiBaseUrl()}/youtube/queue/${id}`, { method: 'DELETE' });
  },

  async uploadYouTubeCookies(file: File): Promise<{ status: string; message: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${getApiBaseUrl()}/youtube/cookies`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Failed to upload cookies');
    return res.json();
  },

  async deleteYouTubeCookies(): Promise<{ status: string; message: string }> {
    const res = await fetch(`${getApiBaseUrl()}/youtube/cookies`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to remove cookies');
    return res.json();
  },

  async testAiKey(provider: string, apiKey: string): Promise<{ valid: boolean; provider?: string; message: string; action_url?: string; tip?: string }> {
    const res = await fetch(`${getApiBaseUrl()}/ai/test-key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, api_key: apiKey }),
    });
    if (!res.ok) throw new Error('Failed to test AI key');
    return res.json();
  },

  async enhanceSubtitles(sentences: any[]): Promise<any[]> {
    const res = await fetch(`${getApiBaseUrl()}/ai/subtitles/enhance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sentences }),
    });
    if (!res.ok) throw new Error('Failed to enhance subtitles');
    return res.json();
  },

  async translateSubtitles(sentences: any[], targetLanguage: string = 'en'): Promise<any[]> {
    const res = await fetch(`${getApiBaseUrl()}/ai/subtitles/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sentences, target_language: targetLanguage }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to translate subtitles' }));
      throw new Error(err.detail || 'Failed to translate subtitles');
    }
    return res.json();
  },

  async updateClipSubtitles(
    clipId: string,
    params: { transcript_sentences: any[]; style_segments?: any[]; subtitle_style?: string }
  ): Promise<any> {
    const res = await fetch(`${getApiBaseUrl()}/clips/${clipId}/subtitles`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error('Failed to update clip subtitles');
    return res.json();
  },

  async chatWithAgent(params: {
    message: string;
    model?: string;
    history?: Array<{ role: string; content: string }>;
    context?: any;
  }): Promise<{
    reply: string;
    action: any;
    suggested_followups?: string[];
    model_used?: string;
    token_optimized?: boolean;
  }> {
    const res = await fetch(`${getApiBaseUrl()}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Chat turn failed' }));
      throw new Error(err.detail || 'Chat request failed');
    }
    return res.json();
  },

  async executeAgentAction(actionType: string, params: any): Promise<any> {
    const res = await fetch(`${getApiBaseUrl()}/chat/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action_type: actionType, params }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Action execution failed' }));
      throw new Error(err.detail || 'Action execution failed');
    }
    return res.json();
  },

  async getLocalAiStatus(url?: string): Promise<{
    available: boolean;
    url?: string;
    server_type?: string;
    models?: string[];
    message: string;
    download_url?: string;
    guide?: string;
  }> {
    const query = url ? `?url=${encodeURIComponent(url)}` : '';
    const res = await fetch(`${getApiBaseUrl()}/ai/local/status${query}`);
    if (!res.ok) throw new Error('Failed to check local AI status');
    return res.json();
  },

  createWebSocket(onMessage: (msg: WSProgressMessage) => void): WebSocket {
    const wsUrl = getWsUrl();
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (e) {
        console.error('Failed to parse WS message', e);
      }
    };

    return ws;
  },

  // 24/7 Auto-Pilot API methods
  async getAutoPilotStatus(): Promise<AutoPilotStatusResponse> {
    const res = await fetch(`${getApiBaseUrl()}/autopilot/status`);
    if (!res.ok) throw new Error('Failed to fetch Auto-Pilot status');
    return res.json();
  },

  async updateAutoPilotConfig(config: AutoPilotConfig): Promise<{ status: string; config: AutoPilotConfig }> {
    const res = await fetch(`${getApiBaseUrl()}/autopilot/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (!res.ok) throw new Error('Failed to save Auto-Pilot settings');
    return res.json();
  },

  async triggerAutoPilotRunNow(): Promise<{ status: string; message: string }> {
    const res = await fetch(`${getApiBaseUrl()}/autopilot/run-now`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to trigger Auto-Pilot cycle');
    return res.json();
  },

  async getAutoPilotLearnings(): Promise<any> {
    const res = await fetch(`${getApiBaseUrl()}/autopilot/learnings`);
    if (!res.ok) throw new Error('Failed to fetch Auto-Pilot learnings');
    return res.json();
  },
};
