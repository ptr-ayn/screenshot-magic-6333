import type { VideoService } from "./contract";
import type { Clip, RealtimeMessage } from "@/types/models";

/** REST + WebSocket client for the future local Windows service (FastAPI + FFmpeg + DirectShow). */
export function createLocalVideoService(baseUrl = "http://localhost:8765", wsUrl = "ws://localhost:8765/ws"): VideoService {
  const req = async <T>(method: string, path: string, body?: unknown): Promise<T> => {
    const init: RequestInit = { method };
    if (body) { init.headers = { "Content-Type": "application/json" }; init.body = JSON.stringify(body); }
    const res = await fetch(`${baseUrl}${path}`, init);
    if (!res.ok) throw new Error(`${method} ${path} failed: ${res.status}`);
    return res.status === 204 ? (undefined as T) : res.json();
  };
  const handlers = new Set<(m: RealtimeMessage) => void>();
  let ws: WebSocket | null = null;
  const connect = () => {
    ws = new WebSocket(wsUrl);
    ws.onmessage = (e) => { try { const m = JSON.parse(e.data); handlers.forEach((h) => h(m)); } catch { /* ignore */ } };
    ws.onclose = () => { ws = null; if (handlers.size) setTimeout(connect, 2000); };
  };

  return {
    getStatus: () => req("GET", "/api/status"),
    getCameras: () => req("GET", "/api/cameras"),
    startRecording: () => req("POST", "/api/capture/start"),
    stopRecording: () => req("POST", "/api/capture/stop"),
    getLiveStream: (cameraId) => req("GET", `/api/live?camera=${encodeURIComponent(cameraId)}`),
    getReplay: (seconds) => req("POST", "/api/replay", { seconds }),
    setReplaySpeed: (speed) => req("POST", "/api/replay/speed", { speed }),
    goLive: () => req("POST", "/api/replay/live"),
    createEvent: (event) => req("POST", "/api/events", event),
    createClip: async (body, onProgress) => {
      const clip = await req<Clip>("POST", "/api/clips", body);
      if (!onProgress) return clip;
      return new Promise((resolve) => {
        const off = (m: RealtimeMessage) => {
          if (m.type === "clip_progress" && m.data.clipId === clip.id) onProgress(m.data.stage, m.data.progress);
          if (m.type === "clip_completed" && m.data.id === clip.id) { handlers.delete(off); resolve(m.data); }
        };
        handlers.add(off);
      });
    },
    getClips: () => req("GET", "/api/clips"),
    deleteClip: (id) => req("DELETE", `/api/clips/${id}`),
    subscribe: (h) => {
      handlers.add(h);
      if (!ws) connect();
      return () => { handlers.delete(h); if (!handlers.size) ws?.close(); };
    },
  };
}
