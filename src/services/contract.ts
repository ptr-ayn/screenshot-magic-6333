import type {
  Camera, Clip, ClipStage, CreateClipRequest, LiveStream, MatchEvent, RealtimeMessage, ReplayState, ServiceStatus,
} from "@/types/models";

/** Contract shared by the mock service and the future local FastAPI + FFmpeg service. */
export interface VideoService {
  getStatus(): Promise<ServiceStatus>;
  getCameras(): Promise<Camera[]>;
  startRecording(): Promise<void>;
  stopRecording(): Promise<void>;
  getLiveStream(cameraId: string): Promise<LiveStream>;
  getReplay(seconds: number): Promise<Partial<ReplayState>>;
  setReplaySpeed(speed: number): Promise<void>;
  goLive(): Promise<void>;
  createEvent(event: MatchEvent): Promise<MatchEvent>;
  createClip(req: CreateClipRequest, onProgress?: (stage: ClipStage, progress: number) => void): Promise<Clip>;
  getClips(): Promise<Clip[]>;
  deleteClip(id: string): Promise<void>;
  /** Realtime channel (WebSocket in local mode). Returns unsubscribe. */
  subscribe(handler: (msg: RealtimeMessage) => void): () => void;
}

export const API = {
  status: "GET /api/status",
  cameras: "GET /api/cameras",
  captureStart: "POST /api/capture/start",
  captureStop: "POST /api/capture/stop",
  live: "GET /api/live",
  replay: "POST /api/replay",
  replayLive: "POST /api/replay/live",
  replaySpeed: "POST /api/replay/speed",
  createEvent: "POST /api/events",
  events: "GET /api/events",
  createClip: "POST /api/clips",
  clips: "GET /api/clips",
  deleteClip: "DELETE /api/clips/:id",
  ws: "ws://localhost:8765/ws",
} as const;
