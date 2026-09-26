import { VIDEO_SERVICE_DEMO_FALLBACK } from "@/config/videoServiceConfig";
import type { VideoService } from "./contract";
import { mockVideoService } from "./mockVideoService";
import { realVideoService, VideoServiceError } from "./realVideoService";
import { videoWebSocket } from "./videoWebSocket";
import type { LinkState, RealtimeMessage } from "@/types/models";

type Mode = "REAL" | "DEMO";

let mode: Mode = "DEMO";
let link: LinkState = "CONNECTING";
let started = false;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let probeTimer: ReturnType<typeof setTimeout> | null = null;
let backendOff: (() => void) | null = null;
const handlers = new Set<(m: RealtimeMessage) => void>();

const active = (): VideoService => (mode === "REAL" ? realVideoService : mockVideoService);
const emit = (m: RealtimeMessage) => handlers.forEach((h) => h(m));
const linkMsg = (): RealtimeMessage => ({ type: "link_status", data: { link, mode: mode === "REAL" ? "REAL" : "MOCK" } });

function rebind() {
  backendOff?.();
  backendOff = handlers.size ? active().subscribe(emit) : null;
}

function setLink(l: LinkState, m: Mode = mode) {
  const modeChanged = m !== mode;
  if (l === link && !modeChanged) return;
  link = l;
  if (modeChanged) { mode = m; rebind(); }
  emit(linkMsg());
}

async function pollOnce() {
  try {
    const st = await realVideoService.getStatus();
    emit({ type: "video_status", data: st });
    if (videoWebSocket.state === "open" || link !== "REAL") setLink("REAL");
  } catch { setLink("OFFLINE"); }
}

function startPolling() {
  if (pollTimer) return;
  pollTimer = setInterval(pollOnce, 5000);
}
function stopPolling() { if (pollTimer) { clearInterval(pollTimer); pollTimer = null; } }

function onReachable(st: Awaited<ReturnType<VideoService["getStatus"]>>) {
  if (probeTimer) { clearTimeout(probeTimer); probeTimer = null; }
  setLink("REAL", "REAL");
  emit({ type: "video_status", data: st });
}

async function probe() {
  try {
    onReachable(await realVideoService.getStatus());
  } catch {
    if (VIDEO_SERVICE_DEMO_FALLBACK) {
      setLink("DEMO", "DEMO");
      probeTimer = setTimeout(() => { probeTimer = null; if (mode === "DEMO") void probe(); }, 10_000);
    } else {
      setLink("OFFLINE", "REAL");
      startPolling();
    }
  }
}

videoWebSocket.onState((s) => {
  if (mode !== "REAL") return;
  if (s === "open") { stopPolling(); setLink("REAL"); }
  if (s === "closed") { if (link === "REAL") setLink("CONNECTING"); startPolling(); void pollOnce(); }
});

async function call<T>(fn: (s: VideoService) => Promise<T>): Promise<T> {
  const svc = active();
  try { return await fn(svc); } catch (e) {
    if (svc === realVideoService && e instanceof VideoServiceError && e.code === "OFFLINE") { setLink("OFFLINE"); startPolling(); }
    throw e;
  }
}

/** Delegates to the real Windows service (REAL MODE) or the mock (DEMO MODE). */
export const videoService: VideoService = {
  getStatus: () => call((s) => s.getStatus()),
  getCameras: () => call((s) => s.getCameras()),
  startRecording: (o) => call((s) => s.startRecording(o)),
  stopRecording: () => call((s) => s.stopRecording()),
  getLiveStream: (id) => call((s) => s.getLiveStream(id)),
  getReplay: (sec) => call((s) => s.getReplay(sec)),
  setReplaySpeed: (sp) => call((s) => s.setReplaySpeed(sp)),
  goLive: () => call((s) => s.goLive()),
  createEvent: (e) => call((s) => s.createEvent(e)),
  getEvents: () => call((s) => s.getEvents()),
  createClip: (r, p) => call((s) => s.createClip(r, p)),
  getClips: () => call((s) => s.getClips()),
  deleteClip: (id) => call((s) => s.deleteClip(id)),
  subscribe(h) {
    handlers.add(h);
    if (!backendOff) backendOff = active().subscribe(emit);
    h(linkMsg());
    return () => {
      handlers.delete(h);
      if (!handlers.size) { backendOff?.(); backendOff = null; }
    };
  },
};

export const videoServiceManager = {
  /** Idempotent: probes the Windows service and picks REAL or DEMO mode. */
  start() {
    if (started || typeof window === "undefined") return;
    started = true;
    void probe();
  },
  getMode: () => mode,
  getLink: () => link,
  /** GET /api/status; switches to REAL MODE on success. */
  async testConnection(): Promise<{ ok: true } | { ok: false; message: string }> {
    try {
      const st = await realVideoService.getStatus();
      if (mode !== "REAL") onReachable(st);
      else { emit({ type: "video_status", data: st }); setLink("REAL"); if (videoWebSocket.state !== "open") videoWebSocket.open(); }
      return { ok: true };
    } catch (e) {
      if (mode === "REAL") setLink("OFFLINE");
      return { ok: false, message: e instanceof Error ? e.message : "Unknown error" };
    }
  },
};
