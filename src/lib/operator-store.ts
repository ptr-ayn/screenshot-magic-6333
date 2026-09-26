import { useEffect, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { videoService, videoServiceManager } from "@/services/videoService";
import { setMockBufferCapacity } from "@/services/mockVideoService";
import { VIDEO_SERVICE_URL, VIDEO_SERVICE_WS } from "@/config/videoServiceConfig";
import type {
  Camera, Clip, ClipStage, CreateClipRequest, EventType, LiveStream, Match, MatchEvent, Period, RealtimeMessage, ReplayState, ServiceStatus, Settings,
} from "@/types/models";

export interface OperatorState {
  match: Match;
  timer: { running: boolean; baseMs: number; startedAt: number | null };
  replay: ReplayState;
  events: MatchEvent[];
  clips: Clip[];
  selectedEventId: string | null;
  settings: Settings;
  status: ServiceStatus;
  live: LiveStream | null;
  operatorMode: boolean;
}

const initial: OperatorState = {
  match: {
    id: "match-1", competition: "Indonesia Futsal League", homeTeam: "Bintang Timur", awayTeam: "Black Steel",
    date: "2026-09-26", time: "19:30", venue: "GOR Among Rogo", matchNumber: "14", period: "1H", status: "LIVE",
  },
  timer: { running: false, baseMs: 14 * 60_000 + 20_000, startedAt: null },
  replay: { mode: "LIVE", offset: 0, speed: 1, startedAt: null, url: null, loading: false },
  events: [
    { id: "ev-seed-1", matchId: "match-1", type: "GOAL", timestamp: 192, period: "1H", cameraId: "cam-1", replayOffset: 15, note: "Bintang Timur", clipId: "clip-seed-1" },
    { id: "ev-seed-2", matchId: "match-1", type: "FOUL", timestamp: 437, period: "1H", cameraId: "cam-1", replayOffset: 10, note: "" },
    { id: "ev-seed-3", matchId: "match-1", type: "CORNER", timestamp: 665, period: "1H", cameraId: "cam-1", replayOffset: 10, note: "", clipId: "clip-seed-2" },
    { id: "ev-seed-4", matchId: "match-1", type: "OUT", timestamp: 781, period: "1H", cameraId: "cam-1", replayOffset: 10, note: "" },
  ],
  clips: [],
  selectedEventId: null,
  settings: {
    cameraId: "", resolution: "1920x1080", fps: 30, bufferDuration: 60, defaultReplay: 15, defaultSpeed: 1,
    recordingDir: "D:\\FutsalVideo\\recordings", clipsDir: "D:\\FutsalVideo\\clips",
    serviceUrl: VIDEO_SERVICE_URL, wsUrl: VIDEO_SERVICE_WS, autoReconnect: true, autoRecord: true,
  },
  status: {
    connected: false, mode: "MOCK", link: "CONNECTING", recording: false, bufferSeconds: 0, bufferCapacity: 60,
    storageFreeGb: 0, storageTotalGb: 0, cameras: [],
  },
  live: null,
  operatorMode: false,
};

let state = initial;
const listeners = new Set<() => void>();
const set = (patch: Partial<OperatorState> | ((s: OperatorState) => Partial<OperatorState>)) => {
  state = { ...state, ...(typeof patch === "function" ? patch(state) : patch) };
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };

export function useOperator<T>(select: (s: OperatorState) => T): T {
  return useSyncExternalStore(subscribe, () => select(state), () => select(initial));
}
export const getOperator = () => state;

export const clockSeconds = (s: OperatorState, now: number) =>
  Math.floor((s.timer.baseMs + (s.timer.running && s.timer.startedAt ? now - s.timer.startedAt : 0)) / 1000);

export const fmtClock = (sec: number) => {
  const m = Math.floor(Math.max(0, sec) / 60), s = Math.max(0, sec) % 60;
  return `${String(m).padStart(2, "0")}:${String(Math.floor(s)).padStart(2, "0")}`;
};

/** Re-renders at `ms` interval after hydration; returns null during SSR/first render. */
export function useNow(ms = 250) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => { setNow(Date.now()); const t = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(t); }, [ms]);
  return now;
}

export function useMatchClock() {
  const now = useNow(250);
  const s = useOperator((x) => x);
  return clockSeconds(s, now ?? 0);
}

const uid = () => Math.random().toString(36).slice(2, 10);
const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Unknown error");
const isReal = () => state.status.mode === "REAL";

/** Keep the selected camera valid when the camera list changes. */
const withCameras = (s: OperatorState, cameras: Camera[]): Partial<OperatorState> => {
  const first = cameras[0];
  const settings = first && !cameras.some((c) => c.id === s.settings.cameraId) ? { ...s.settings, cameraId: first.id } : s.settings;
  return { status: { ...s.status, cameras }, settings };
};

/** Fill in event type / match time for clips returned by the service. */
const enrichClip = (c: Clip, events: MatchEvent[]): Clip => {
  const ev = c.eventId ? events.find((e) => e.id === c.eventId) : undefined;
  if (!ev) return c;
  const dur = c.endTime - c.startTime;
  const start = c.startTime || Math.max(0, ev.timestamp - dur);
  return { ...c, eventType: c.eventType === "OTHER" ? ev.type : c.eventType, startTime: start, endTime: start + dur };
};

const applyStatus = (patch: Partial<ServiceStatus>) =>
  set((s) => {
    const status = { ...s.status, ...patch };
    return patch.cameras ? { ...withCameras({ ...s, status }, patch.cameras) } : { status };
  });

let loadedMode: ServiceStatus["mode"] | null = null;
let replayReq = 0;

function handleMessage(m: RealtimeMessage) {
  switch (m.type) {
    case "video_status": applyStatus(m.data); break;
    case "buffer_status": set((s) => ({ status: { ...s.status, bufferSeconds: m.data.seconds, bufferCapacity: m.data.capacity } })); break;
    case "recording_status": set((s) => ({ status: { ...s.status, recording: m.data.recording, cameras: s.status.cameras.map((c) => ({ ...c, state: m.data.recording ? "RECORDING" : "CONNECTED" })) } })); break;
    case "camera_status": set((s) => ({ status: { ...s.status, cameras: s.status.cameras.map((c) => (c.id === m.data.id ? m.data : c)) } })); break;
    case "clip_completed": set((s) => ({ clips: [enrichClip(m.data, s.events), ...s.clips.filter((c) => c.id !== m.data.id)] })); break;
    case "error": toast.error(m.data.message); break;
    case "link_status": {
      const { link, mode } = m.data;
      set((s) => ({ status: { ...s.status, link, mode, connected: link === "REAL" || link === "DEMO" } }));
      if (mode !== loadedMode) { loadedMode = mode; void actions.reloadFromService(); }
      break;
    }
  }
}

export const actions = {
  connectService() {
    const off = videoService.subscribe(handleMessage);
    videoServiceManager.start();
    return off;
  },
  /** Called whenever the service mode (REAL / DEMO) changes. */
  async reloadFromService() {
    if (isReal()) {
      replayReq++;
      set((s) => ({
        events: s.events.filter((e) => !e.id.startsWith("ev-seed")),
        clips: [],
        replay: { ...s.replay, mode: "LIVE", offset: 0, startedAt: null, url: null, loading: false },
        status: { ...s.status, storageFreeGb: 0, storageTotalGb: 0 },
      }));
    }
    await Promise.allSettled([actions.refreshCameras(), actions.refreshClips(), actions.loadEvents()]);
    await actions.loadLiveStream();
  },
  async refreshCameras() {
    try {
      const cameras = await videoService.getCameras();
      set((s) => withCameras(s, cameras));
    } catch (e) { if (isReal()) toast.error(`Could not load cameras: ${errMsg(e)}`); }
  },
  async refreshClips() {
    const clips = await videoService.getClips();
    set((s) => ({ clips: clips.map((c) => enrichClip(c, s.events)) }));
  },
  /** GET /api/events and merge into local events without duplicates. */
  async loadEvents() {
    try {
      const list = await videoService.getEvents();
      if (!list.length) return;
      set((s) => {
        const byId = new Map(s.events.map((e) => [e.id, e] as const));
        for (const e of list) {
          if (e.matchId && e.matchId !== s.match.id) continue;
          const prev = byId.get(e.id);
          byId.set(e.id, { ...e, clipId: e.clipId ?? prev?.clipId });
        }
        const events = [...byId.values()];
        return { events, clips: s.clips.map((c) => enrichClip(c, events)) };
      });
    } catch (e) { if (isReal()) console.warn("Could not load events:", errMsg(e)); }
  },
  async loadLiveStream() {
    const camId = state.settings.cameraId || state.status.cameras[0]?.id;
    if (!camId) { set({ live: null }); return; }
    try { set({ live: await videoService.getLiveStream(camId) }); } catch { set({ live: null }); }
  },
  async testConnection() {
    const r = await videoServiceManager.testConnection();
    if (r.ok) toast.success("Video service connected.");
    else toast.error("Windows Video Service is not running.", { description: r.message, action: { label: "Retry", onClick: () => void actions.testConnection() } });
    return r.ok;
  },
  createMatch(m: Omit<Match, "id" | "status">) {
    set({
      match: { ...m, id: `match-${uid()}`, status: "LIVE" },
      events: [], selectedEventId: null,
      timer: { running: false, baseMs: 0, startedAt: null },
    });
  },
  startTimer() { set((s) => (s.timer.running ? {} : { timer: { ...s.timer, running: true, startedAt: Date.now() } })); },
  pauseTimer() { set((s) => (!s.timer.running ? {} : { timer: { running: false, startedAt: null, baseMs: clockSeconds(s, Date.now()) * 1000 } })); },
  resetTimer() { set({ timer: { running: false, baseMs: 0, startedAt: null } }); },
  setPeriod(period: Period) { set((s) => ({ match: { ...s.match, period } })); },
  async goLive() {
    replayReq++;
    set({ replay: { mode: "LIVE", offset: 0, speed: state.settings.defaultSpeed, startedAt: null, url: null, loading: false } });
    await videoService.goLive().catch((e) => { if (isReal()) toast.error(`Return to live failed: ${errMsg(e)}`); });
  },
  async replay(seconds: number) {
    const req = ++replayReq;
    set((s) => ({ replay: { ...s.replay, mode: "REPLAY", offset: seconds, startedAt: Date.now(), url: null, loading: isReal() } }));
    try {
      const r = await videoService.getReplay(seconds);
      if (req !== replayReq) return;
      set((s) => ({ replay: { ...s.replay, ...r, startedAt: Date.now(), loading: false } }));
    } catch (e) {
      if (req !== replayReq) return;
      toast.error(`Replay failed: ${errMsg(e)}`);
      set((s) => ({ replay: { ...s.replay, mode: "LIVE", offset: 0, startedAt: null, url: null, loading: false } }));
    }
  },
  async setSpeed(speed: number) {
    set((s) => ({ replay: { ...s.replay, speed } }));
    await videoService.setReplaySpeed(speed).catch((e) => { if (isReal()) toast.error(`Speed change failed: ${errMsg(e)}`); });
  },
  addEvent(type: EventType) {
    const s = state;
    const ev: MatchEvent = {
      id: `ev-${uid()}`, matchId: s.match.id, type, timestamp: clockSeconds(s, Date.now()), period: s.match.period,
      cameraId: s.settings.cameraId, replayOffset: s.replay.mode === "REPLAY" ? s.replay.offset : s.settings.defaultReplay, note: "",
    };
    set({ events: [...s.events, ev], selectedEventId: ev.id });
    toast.success(`${type} tagged at ${fmtClock(ev.timestamp)}`, { duration: 1500 });
    videoService.createEvent(ev).then((saved) => {
      if (!saved.id || saved.id === ev.id) return;
      set((x) => ({
        events: x.events.filter((e) => e.id !== saved.id).map((e) => (e.id === ev.id ? { ...e, id: saved.id } : e)),
        selectedEventId: x.selectedEventId === ev.id ? saved.id : x.selectedEventId,
      }));
    }).catch((e) => toast.error(`${type} kept locally — not sent to video service: ${errMsg(e)}`));
    return ev;
  },
  selectEvent(id: string | null) { set({ selectedEventId: id }); },
  updateEvent(id: string, patch: Partial<MatchEvent>) { set((s) => ({ events: s.events.map((e) => (e.id === id ? { ...e, ...patch } : e)) })); },
  async saveClip(req: CreateClipRequest, onProgress: (stage: ClipStage, p: number) => void) {
    const clip = await videoService.createClip(req, onProgress);
    set((s) => ({
      clips: [enrichClip({ ...clip, eventType: req.eventType, startTime: req.startTime, endTime: req.startTime + (clip.endTime - clip.startTime) }, s.events), ...s.clips.filter((c) => c.id !== clip.id)],
      events: s.events.map((e) => (e.id === req.eventId ? { ...e, clipId: clip.id } : e)),
    }));
    return clip;
  },
  renameClip(id: string, name: string) { set((s) => ({ clips: s.clips.map((c) => (c.id === id ? { ...c, name } : c)) })); },
  async deleteClip(id: string) {
    try {
      await videoService.deleteClip(id);
    } catch (e) { toast.error(`Delete failed: ${errMsg(e)}`); return; }
    set((s) => ({ clips: s.clips.filter((c) => c.id !== id), events: s.events.map((e) => (e.clipId === id ? { ...e, clipId: undefined } : e)) }));
    toast.success("Clip deleted");
    if (isReal()) await actions.refreshClips().catch(() => {});
  },
  async setRecording(on: boolean) {
    const s = state;
    const cam = s.status.cameras.find((c) => c.id === s.settings.cameraId) ?? s.status.cameras[0];
    if (on && !cam) { toast.error("No camera available. Connect a camera and refresh the camera list."); return; }
    const [w, h] = s.settings.resolution.split("x").map(Number);
    try {
      if (on) await videoService.startRecording({ camera: cam?.name ?? "", width: w || 1920, height: h || 1080, fps: s.settings.fps });
      else await videoService.stopRecording();
      set((x) => ({ status: { ...x.status, recording: on } }));
      const st = await videoService.getStatus().catch(() => null);
      if (st) applyStatus(st);
      toast.success(on ? `Recording started on ${cam?.name}` : "Recording stopped");
    } catch (e) { toast.error(`${on ? "Start" : "Stop"} recording failed: ${errMsg(e)}`); }
  },
  updateSettings(patch: Partial<Settings>) {
    if (patch.bufferDuration) setMockBufferCapacity(patch.bufferDuration);
    set((s) => ({ settings: { ...s.settings, ...patch } }));
  },
  setOperatorMode(on: boolean) { set({ operatorMode: on }); },
};
