import type { VideoService } from "./contract";
import type { Camera, Clip, RealtimeMessage, ServiceStatus } from "@/types/models";

const camera: Camera = { id: "cam-1", name: "Camera 1", state: "RECORDING", width: 1920, height: 1080, fps: 60 };

const status: ServiceStatus = {
  connected: true,
  mode: "MOCK",
  link: "DEMO",
  recording: true,
  bufferSeconds: 0,
  bufferCapacity: 60,
  storageFreeGb: 420,
  storageTotalGb: 512,
  cameras: [camera],
};

let clips: Clip[] = [
  { id: "clip-seed-1", eventId: "ev-seed-1", eventType: "GOAL", name: "Goal - 03:12", startTime: 177, endTime: 197, createdAt: "2026-09-26T12:03:40Z", cameraId: "cam-1", status: "READY" },
  { id: "clip-seed-2", eventId: "ev-seed-3", eventType: "CORNER", name: "Corner - 11:05", startTime: 655, endTime: 670, createdAt: "2026-09-26T12:11:30Z", cameraId: "cam-1", status: "READY" },
];

const handlers = new Set<(m: RealtimeMessage) => void>();
let ticker: ReturnType<typeof setInterval> | null = null;
const emit = (m: RealtimeMessage) => handlers.forEach((h) => h(m));
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const uid = () => Math.random().toString(36).slice(2, 10);

export const mockVideoService: VideoService = {
  async getStatus() { return { ...status, cameras: [...status.cameras] }; },
  async getCameras() { return [camera]; },
  async startRecording() { status.recording = true; camera.state = "RECORDING"; emit({ type: "recording_status", data: { recording: true } }); },
  async stopRecording() { status.recording = false; camera.state = "CONNECTED"; emit({ type: "recording_status", data: { recording: false } }); },
  async getLiveStream(cameraId) { return { cameraId, kind: "mock", url: null }; },
  async getReplay(seconds) { return { mode: "REPLAY", offset: Math.min(seconds, status.bufferSeconds || seconds) }; },
  async setReplaySpeed() {},
  async goLive() {},
  async createEvent(event) { return event; },
  async getEvents() { return []; },
  async createClip(req, onProgress) {
    const id = `clip-${uid()}`;
    const stages = [["PREPARING", 15], ["ENCODING", 70], ["SAVING", 92], ["COMPLETED", 100]] as const;
    for (const [stage, p] of stages) {
      onProgress?.(stage, p);
      emit({ type: "clip_progress", data: { clipId: id, stage, progress: p } });
      if (stage !== "COMPLETED") await wait(stage === "ENCODING" ? 1100 : 550);
    }
    const clip: Clip = { ...req, id, createdAt: new Date().toISOString(), status: "READY" };
    clips = [clip, ...clips];
    emit({ type: "clip_completed", data: clip });
    return clip;
  },
  async getClips() { return [...clips]; },
  async deleteClip(id) { clips = clips.filter((c) => c.id !== id); },
  subscribe(h) {
    handlers.add(h);
    if (!ticker) {
      ticker = setInterval(() => {
        if (status.recording) status.bufferSeconds = Math.min(status.bufferCapacity, status.bufferSeconds + 1);
        emit({ type: "buffer_status", data: { seconds: status.bufferSeconds, capacity: status.bufferCapacity } });
      }, 1000);
    }
    h({ type: "video_status", data: { ...status } });
    return () => {
      handlers.delete(h);
      if (!handlers.size && ticker) { clearInterval(ticker); ticker = null; }
    };
  },
};

export function setMockBufferCapacity(sec: number) { status.bufferCapacity = sec; status.bufferSeconds = Math.min(status.bufferSeconds, sec); }
