import { useEffect, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { videoService } from "@/services/videoService";
import { setMockBufferCapacity } from "@/services/mockVideoService";
import type {
  Clip, ClipStage, CreateClipRequest, EventType, Match, MatchEvent, Period, ReplayState, ServiceStatus, Settings,
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
  operatorMode: boolean;
}

const initial: OperatorState = {
  match: {
    id: "match-1", competition: "Indonesia Futsal League", homeTeam: "Bintang Timur", awayTeam: "Black Steel",
    date: "2026-09-26", time: "19:30", venue: "GOR Among Rogo", matchNumber: "14", period: "1H", status: "LIVE",
  },
  timer: { running: false, baseMs: 14 * 60_000 + 20_000, startedAt: null },
  replay: { mode: "LIVE", offset: 0, speed: 1, startedAt: null },
  events: [
    { id: "ev-seed-1", matchId: "match-1", type: "GOAL", timestamp: 192, period: "1H", cameraId: "cam-1", replayOffset: 15, note: "Bintang Timur", clipId: "clip-seed-1" },
    { id: "ev-seed-2", matchId: "match-1", type: "FOUL", timestamp: 437, period: "1H", cameraId: "cam-1", replayOffset: 10, note: "" },
    { id: "ev-seed-3", matchId: "match-1", type: "CORNER", timestamp: 665, period: "1H", cameraId: "cam-1", replayOffset: 10, note: "", clipId: "clip-seed-2" },
    { id: "ev-seed-4", matchId: "match-1", type: "OUT", timestamp: 781, period: "1H", cameraId: "cam-1", replayOffset: 10, note: "" },
  ],
  clips: [],
  selectedEventId: null,
  settings: {
    cameraId: "cam-1", resolution: "1920x1080", fps: 60, bufferDuration: 60, defaultReplay: 15, defaultSpeed: 1,
    recordingDir: "D:\\FutsalVideo\\recordings", clipsDir: "D:\\FutsalVideo\\clips",
    serviceUrl: "http://localhost:8765", wsUrl: "ws://localhost:8765/ws", autoReconnect: true, autoRecord: true,
  },
  status: {
    connected: false, mode: "MOCK", recording: false, bufferSeconds: 0, bufferCapacity: 60,
    storageFreeGb: 420, storageTotalGb: 512, cameras: [],
  },
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

export const actions = {
  connectService() {
    videoService.getClips().then((clips) => set({ clips })).catch(() => {});
    return videoService.subscribe((m) => {
      switch (m.type) {
        case "video_status": set((s) => ({ status: { ...s.status, ...m.data } })); break;
        case "buffer_status": set((s) => ({ status: { ...s.status, bufferSeconds: m.data.seconds, bufferCapacity: m.data.capacity } })); break;
        case "recording_status": set((s) => ({ status: { ...s.status, recording: m.data.recording, cameras: s.status.cameras.map((c) => ({ ...c, state: m.data.recording ? "RECORDING" : "CONNECTED" })) } })); break;
        case "camera_status": set((s) => ({ status: { ...s.status, cameras: s.status.cameras.map((c) => (c.id === m.data.id ? m.data : c)) } })); break;
        case "error": toast.error(m.data.message); break;
      }
    });
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
    set({ replay: { mode: "LIVE", offset: 0, speed: state.settings.defaultSpeed, startedAt: null } });
    await videoService.goLive().catch(() => {});
  },
  async replay(seconds: number) {
    set((s) => ({ replay: { ...s.replay, mode: "REPLAY", offset: seconds, startedAt: Date.now() } }));
    await videoService.getReplay(seconds).catch(() => {});
  },
  async setSpeed(speed: number) {
    set((s) => ({ replay: { ...s.replay, speed } }));
    await videoService.setReplaySpeed(speed).catch(() => {});
  },
  addEvent(type: EventType) {
    const s = state;
    const ev: MatchEvent = {
      id: `ev-${uid()}`, matchId: s.match.id, type, timestamp: clockSeconds(s, Date.now()), period: s.match.period,
      cameraId: s.settings.cameraId, replayOffset: s.replay.mode === "REPLAY" ? s.replay.offset : s.settings.defaultReplay, note: "",
    };
    set({ events: [...s.events, ev], selectedEventId: ev.id });
    videoService.createEvent(ev).catch(() => {});
    toast.success(`${type} tagged at ${fmtClock(ev.timestamp)}`, { duration: 1500 });
    return ev;
  },
  selectEvent(id: string | null) { set({ selectedEventId: id }); },
  updateEvent(id: string, patch: Partial<MatchEvent>) { set((s) => ({ events: s.events.map((e) => (e.id === id ? { ...e, ...patch } : e)) })); },
  async saveClip(req: CreateClipRequest, onProgress: (stage: ClipStage, p: number) => void) {
    const clip = await videoService.createClip(req, onProgress);
    set((s) => ({
      clips: [clip, ...s.clips.filter((c) => c.id !== clip.id)],
      events: s.events.map((e) => (e.id === req.eventId ? { ...e, clipId: clip.id } : e)),
    }));
    return clip;
  },
  renameClip(id: string, name: string) { set((s) => ({ clips: s.clips.map((c) => (c.id === id ? { ...c, name } : c)) })); },
  async deleteClip(id: string) {
    await videoService.deleteClip(id).catch(() => {});
    set((s) => ({ clips: s.clips.filter((c) => c.id !== id), events: s.events.map((e) => (e.clipId === id ? { ...e, clipId: undefined } : e)) }));
  },
  async setRecording(on: boolean) { await (on ? videoService.startRecording() : videoService.stopRecording()).catch(() => toast.error("Video service unavailable")); },
  updateSettings(patch: Partial<Settings>) {
    if (patch.bufferDuration) setMockBufferCapacity(patch.bufferDuration);
    set((s) => ({ settings: { ...s.settings, ...patch } }));
  },
  setOperatorMode(on: boolean) { set({ operatorMode: on }); },
};
