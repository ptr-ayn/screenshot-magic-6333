import type { VideoService } from "./contract";
import { mockVideoService } from "./mockVideoService";
import { realVideoService, VideoServiceError } from "./realVideoService";
import { videoWebSocket } from "./videoWebSocket";
import type { LinkState, RealtimeMessage } from "@/types/models";

type Mode = "REAL" | "DEMO";
const DEMO_KEY = "fvs.demoMode";

let mode: Mode = "REAL";
let link: LinkState = "CONNECTING";
let started = false;
let pollTimer: ReturnType<typeof setInterval> | null = null;
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

/** GET /api/status once; drives CONNECTED / OFFLINE. */
async function pollOnce() {
  if (mode !== "REAL") return;
  try {
    const st = await realVideoService.getStatus();
    if (mode !== "REAL") return;
    emit({ type: "video_status", data: st });
    setLink("REAL");
  } catch { if (mode === "REAL") setLink("OFFLINE"); }
}

/** Status is polled every 1s while the WebSocket isn't delivering updates. */
function startPolling() {
  if (pollTimer || mode !== "REAL") return;
  pollTimer = setInterval(pollOnce, 1000);
}
function stopPolling() { if (pollTimer) { clearInterval(pollTimer); pollTimer = null; } }

videoWebSocket.onState((s) => {
  if (mode !== "REAL") return;
  if (s === "open") { stopPolling(); void pollOnce(); }
  if (s === "closed") { startPolling(); void pollOnce(); }
});

async function call<T>(fn: (s: VideoService) => Promise<T>): Promise<T> {
  const svc = active();
  try { return await fn(svc); } catch (e) {
    if (svc === realVideoService && e instanceof VideoServiceError && (e.code === "OFFLINE" || e.code === "TIMEOUT")) { setLink("OFFLINE"); startPolling(); }
    throw e;
  }
}

/** Delegates to the Windows service, or to the mock only when Demo Mode is explicitly enabled. */
export const videoService: VideoService = {
  getStatus: () => call((s) => s.getStatus()),
  getCameras: () => call((s) => s.getCameras()),
  getCameraOptions: (name) => call((s) => s.getCameraOptions(name)),
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
  /** Idempotent: connects to the Windows service (or Demo Mode if the operator enabled it). */
  start() {
    if (started || typeof window === "undefined") return;
    started = true;
    if (localStorage.getItem(DEMO_KEY) === "true") { setLink("DEMO", "DEMO"); return; }
    link = "CONNECTING";
    emit(linkMsg());
    startPolling();
    void pollOnce();
  },
  getMode: () => mode,
  getLink: () => link,
  isDemo: () => mode === "DEMO",
  setDemoMode(on: boolean) {
    if (typeof window !== "undefined") localStorage.setItem(DEMO_KEY, String(on));
    if (on) { stopPolling(); videoWebSocket.close(); setLink("DEMO", "DEMO"); return; }
    setLink("CONNECTING", "REAL");
    startPolling();
    void pollOnce();
  },
  async testConnection(): Promise<{ ok: true } | { ok: false; message: string }> {
    try {
      const st = await realVideoService.getStatus();
      if (mode === "REAL") { emit({ type: "video_status", data: st }); setLink("REAL"); if (videoWebSocket.state !== "open") videoWebSocket.open(); }
      return { ok: true };
    } catch (e) {
      if (mode === "REAL") setLink("OFFLINE");
      return { ok: false, message: e instanceof Error ? e.message : "Unknown error" };
    }
  },
};
