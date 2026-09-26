import { VIDEO_SERVICE_URL } from "@/config/videoServiceConfig";
import { toVideoServiceUrl } from "@/utils/videoUrl";
import { videoWebSocket } from "./videoWebSocket";
import type { CameraOption, VideoService } from "./contract";
import type { Camera, Clip, ClipStatus, CreateClipRequest, EventType, MatchEvent, Period, RealtimeMessage, ServiceStatus } from "@/types/models";

export class VideoServiceError extends Error {
  constructor(message: string, public code: "OFFLINE" | "TIMEOUT" | "HTTP" | "INVALID", public status?: number) {
    super(message);
    this.name = "VideoServiceError";
  }
}

interface ApiOptions { method?: "GET" | "POST" | "DELETE"; body?: unknown; timeoutMs?: number }

/** fetch wrapper: prepends VIDEO_SERVICE_URL, parses JSON, throws VideoServiceError on any failure. */
export async function apiRequest<T = unknown>(path: string, { method = "GET", body, timeoutMs = 8000 }: ApiOptions = {}): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let res: Response;
  try {
    const headers: Record<string, string> = { Accept: "application/json" };
    const init: RequestInit = { method, signal: ctrl.signal, headers };
    if (body !== undefined) { headers["Content-Type"] = "application/json"; init.body = JSON.stringify(body); }
    res = await fetch(`${VIDEO_SERVICE_URL}${path}`, init);
  } catch {
    clearTimeout(timer);
    if (ctrl.signal.aborted) throw new VideoServiceError(`Video service timed out (${method} ${path}).`, "TIMEOUT");
    throw new VideoServiceError("Windows Video Service is not running.", "OFFLINE");
  }
  clearTimeout(timer);
  const text = await res.text().catch(() => "");
  let data: unknown = null;
  if (text) {
    try { data = JSON.parse(text); } catch {
      if (res["ok"]) throw new VideoServiceError(`Invalid response from video service (${path}).`, "INVALID", res["status"]);
    }
  }
  if (!res["ok"]) {
    const d = obj(data);
    const detail = d["detail"] ?? d["error"] ?? d["message"];
    const msg = typeof detail === "string" ? detail : detail ? JSON.stringify(detail) : `HTTP ${res["status"]}`;
    throw new VideoServiceError(msg, "HTTP", res["status"]);
  }
  return data as T;
}

// ---------- tolerant response mapping ----------
type Rec = Record<string, unknown>;
const obj = (v: unknown): Rec => (v && typeof v === "object" && !Array.isArray(v) ? (v as Rec) : {});
const str = (v: unknown, d = "") => (typeof v === "string" ? v : typeof v === "number" ? String(v) : d);
const num = (v: unknown, d = 0) => {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : d;
};
const list = (v: unknown, key: string): unknown[] => {
  if (Array.isArray(v)) return v;
  const inner = obj(v)[key];
  return Array.isArray(inner) ? inner : [];
};
const EVENT_TYPES: EventType[] = ["GOAL", "FOUL", "OUT", "CORNER", "HAND", "OTHER"];
const PERIODS: Period[] = ["1H", "HT", "2H", "ET"];
const asEventType = (v: unknown): EventType | null => {
  const t = str(v).toUpperCase() as EventType;
  return EVENT_TYPES.includes(t) ? t : null;
};

interface RawCamera { id: string; name: string; driver: string; connected: boolean }
let rawCameras: RawCamera[] = [];
let captureFormat = { width: 1920, height: 1080, fps: 30 };
let recording = false;
let recordingCamera: string | null = null;

function buildCameras(): Camera[] {
  return rawCameras.map((c) => ({
    id: c.id, name: c.name, driver: c.driver, ...captureFormat,
    state: !c.connected ? "DISCONNECTED" : recording && (!recordingCamera || recordingCamera === c.name) ? "RECORDING" : "CONNECTED",
  }));
}

function parseCameras(v: unknown): RawCamera[] {
  return list(v, "cameras").map((x, i) => {
    const o = typeof x === "string" ? { name: x } : obj(x);
    return { id: str(o["id"], String(i + 1)), name: str(o["name"], `Camera ${i + 1}`), driver: str(o["driver"]), connected: o["connected"] !== false };
  });
}

function applyRecording(r: Rec): Partial<ServiceStatus> {
  if ("recording" in r) recording = r["recording"] === true;
  if ("camera" in r) recordingCamera = r["camera"] ? str(r["camera"]) : null;
  const patch: Partial<ServiceStatus> = { recording, cameras: buildCameras() };
  if ("buffer_seconds" in r) patch.bufferSeconds = Math.round(num(r["buffer_seconds"]));
  if ("buffer_target_seconds" in r) patch.bufferCapacity = num(r["buffer_target_seconds"], 60);
  return patch;
}

function mapStatus(raw: unknown): Partial<ServiceStatus> {
  const o = obj(raw);
  if (!("recording" in o) && !("service" in o)) throw new VideoServiceError("Invalid status response from video service.", "INVALID");
  if (list(o["cameras"], "cameras").length) rawCameras = parseCameras(o["cameras"]);
  const r = o["recording"] && typeof o["recording"] === "object" ? obj(o["recording"]) : { recording: o["recording"] === true };
  return { ...applyRecording(r), connected: true, mode: "REAL", version: str(o["version"]) };
}

function mapEvent(raw: unknown, fallback?: MatchEvent): MatchEvent | null {
  const o = obj(raw);
  const type = asEventType(o["type"]) ?? fallback?.type;
  const id = str(o["id"], fallback?.id ?? "");
  if (!type || !id) return null;
  const period = str(o["period"]) as Period;
  const clipId = str(o["clip_id"] ?? o["clipId"]) || fallback?.clipId;
  return {
    id, type,
    matchId: str(o["match_id"] ?? o["matchId"], fallback?.matchId ?? ""),
    timestamp: num(o["match_clock"] ?? o["matchClock"], fallback?.timestamp ?? num(o["timestamp"])),
    period: PERIODS.includes(period) ? period : fallback?.period ?? "1H",
    cameraId: str(o["camera_id"] ?? o["cameraId"], fallback?.cameraId ?? ""),
    replayOffset: num(o["replay_offset"] ?? o["replayOffset"], fallback?.replayOffset ?? 15),
    note: str(o["note"], fallback?.note ?? ""),
    clipId,
  };
}

const CLIP_STATUS: Record<string, ClipStatus> = {
  completed: "READY", ready: "READY", done: "READY", failed: "FAILED", error: "FAILED", queued: "QUEUED", pending: "QUEUED",
};

function mapClip(raw: unknown, req?: CreateClipRequest): Clip {
  const o = obj(raw);
  const seconds = num(o["seconds"], req ? req.endTime - req.startTime : 0);
  const created = o["createdAt"] ?? o["created_at"];
  const createdAt = typeof created === "number"
    ? new Date(created < 1e12 ? created * 1000 : created).toISOString()
    : str(created) || new Date().toISOString();
  const start = req?.startTime ?? 0;
  return {
    id: str(o["id"]),
    eventId: str(o["eventId"] ?? o["event_id"]) || req?.eventId || null,
    eventType: asEventType(o["eventType"] ?? o["event_type"]) ?? req?.eventType ?? "OTHER",
    name: str(o["name"], req?.name ?? "Clip"),
    startTime: start,
    endTime: start + seconds,
    createdAt,
    cameraId: str(o["cameraId"] ?? o["camera_id"], req?.cameraId ?? ""),
    status: CLIP_STATUS[str(o["status"], "completed").toLowerCase()] ?? "ENCODING",
    url: toVideoServiceUrl(str(o["url"])) ?? undefined,
  };
}

function translate(raw: unknown): RealtimeMessage | null {
  const o = obj(raw);
  const data = obj(o["data"]);
  switch (o["type"]) {
    case "video_status":
    case "recording_status":
    case "status": {
      if (list(data["cameras"], "cameras").length) rawCameras = parseCameras(data["cameras"]);
      const r = data["recording"] && typeof data["recording"] === "object" ? obj(data["recording"]) : data;
      return { type: "video_status", data: { ...applyRecording(r), connected: true } };
    }
    case "clip_completed": return { type: "clip_completed", data: mapClip(data) };
    case "error": return { type: "error", data: { message: str(data["message"] ?? o["message"], "Video service error") } };
    default: return null;
  }
}

const handlers = new Set<(m: RealtimeMessage) => void>();
let offWs: (() => void) | null = null;

export const realVideoService: VideoService = {
  async getStatus() { return mapStatus(await apiRequest("/api/status", { timeoutMs: 4000 })); },
  async getCameras() {
    rawCameras = parseCameras(await apiRequest("/api/cameras"));
    return buildCameras();
  },
  async getCameraOptions(name) {
    const raw = await apiRequest(`/api/cameras/${encodeURIComponent(name)}/options`);
    const arr = Array.isArray(raw) ? raw : list(raw, "options").length ? list(raw, "options") : list(raw, "formats");
    const out: CameraOption[] = [];
    for (const x of arr) {
      const o = obj(x);
      const w = num(o["width"]), h = num(o["height"]);
      const fpsList = Array.isArray(o["fps"]) ? (o["fps"] as unknown[]).map((f) => num(f)) : [num(o["fps"] ?? o["max_fps"], 30)];
      for (const fps of fpsList) if (w && h && fps) out.push({ width: w, height: h, fps: Math.round(fps) });
    }
    return out;
  },
  async startRecording(opts) {
    const body = opts ?? { camera: rawCameras[0]?.name ?? "", ...captureFormat };
    captureFormat = { width: body.width, height: body.height, fps: body.fps };
    const res = obj(await apiRequest("/api/capture/start", { method: "POST", body, timeoutMs: 15_000 }));
    recording = true;
    recordingCamera = body.camera || null;
    if ("recording" in res) applyRecording(res);
  },
  async stopRecording() {
    await apiRequest("/api/capture/stop", { method: "POST", timeoutMs: 15_000 });
    recording = false;
  },
  async getLiveStream(cameraId) {
    // V2 has no live stream yet; /api/live is reserved for the future endpoint.
    try {
      const o = obj(await apiRequest(`/api/live?camera=${encodeURIComponent(cameraId)}`, { timeoutMs: 4000 }));
      const k = str(o["kind"]);
      return { cameraId, kind: k === "mjpeg" || k === "webrtc" ? k : "hls", url: toVideoServiceUrl(str(o["url"])) };
    } catch (e) {
      if (e instanceof VideoServiceError && (e.code === "HTTP" || e.code === "INVALID")) return { cameraId, kind: "mock", url: null };
      throw e;
    }
  },
  async getReplay(seconds) {
    const o = obj(await apiRequest("/api/replay", { method: "POST", body: { seconds }, timeoutMs: 60_000 }));
    const url = toVideoServiceUrl(str(o["url"]));
    if (!url) throw new VideoServiceError("Replay generation failed: no playable video was returned.", "INVALID");
    return { mode: "REPLAY", offset: num(o["seconds"], seconds), url };
  },
  async setReplaySpeed(speed) {
    const o = obj(await apiRequest("/api/replay/speed", { method: "POST", body: { speed }, timeoutMs: 60_000 }));
    return toVideoServiceUrl(str(o["url"]));
  },
  async goLive() { await apiRequest("/api/replay/live", { method: "POST", body: { mode: "live" } }); },
  async createEvent(ev) {
    const res = await apiRequest("/api/events", {
      method: "POST",
      body: { type: ev.type, timestamp: ev.timestamp, ...(ev.note ? { note: ev.note } : {}) },
    });
    return mapEvent(res, ev) ?? ev;
  },
  async getEvents() {
    return list(await apiRequest("/api/events"), "events").map((e) => mapEvent(e)).filter((e): e is MatchEvent => !!e);
  },
  async createClip(req, onProgress) {
    onProgress?.("PREPARING", 15);
    const t = setTimeout(() => onProgress?.("ENCODING", 60), 400);
    try {
      const raw = await apiRequest("/api/clips", {
        method: "POST",
        body: { seconds: Math.max(1, Math.round(req.endTime - req.startTime)), ...(req.name ? { name: req.name } : {}) },
        timeoutMs: 120_000,
      });
      onProgress?.("SAVING", 92);
      const clip = mapClip(raw, req);
      if (!clip.id) throw new VideoServiceError("Clip generation failed: invalid response.", "INVALID");
      if (clip.status === "FAILED") throw new VideoServiceError("Clip generation failed on the video service.", "HTTP");
      onProgress?.("COMPLETED", 100);
      return clip;
    } finally { clearTimeout(t); }
  },
  async getClips() { return list(await apiRequest("/api/clips"), "clips").map((c) => mapClip(c)).filter((c) => c.id); },
  async deleteClip(id) { await apiRequest(`/api/clips/${encodeURIComponent(id)}`, { method: "DELETE" }); },
  subscribe(h) {
    handlers.add(h);
    if (!offWs) offWs = videoWebSocket.onMessage((raw) => { const m = translate(raw); if (m) handlers.forEach((x) => x(m)); });
    videoWebSocket.open();
    return () => {
      handlers.delete(h);
      if (!handlers.size) { offWs?.(); offWs = null; videoWebSocket.close(); }
    };
  },
};
