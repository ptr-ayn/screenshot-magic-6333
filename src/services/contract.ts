import type {
  Camera, Clip, ClipStage, CreateClipRequest, LiveStream, MatchEvent, RealtimeMessage, ReplayState, ServiceStatus,
} from "@/types/models";

/** Contract shared by the mock service (DEMO MODE) and the Windows Video Service V2 adapter (REAL MODE). */
export interface CameraOption { width: number; height: number; fps: number }
export interface StartRecordingOptions { camera: string; width: number; height: number; fps: number }

export interface VideoService {
  getStatus(): Promise<Partial<ServiceStatus>>;
  getCameras(): Promise<Camera[]>;
  getCameraOptions(cameraName: string): Promise<CameraOption[]>;
  startRecording(opts?: StartRecordingOptions): Promise<void>;
  stopRecording(): Promise<void>;
  getLiveStream(cameraId: string): Promise<LiveStream>;
  getReplay(seconds: number): Promise<Partial<ReplayState>>;
  /** Returns the URL of the speed-adjusted replay, if the service produced one. */
  setReplaySpeed(speed: number): Promise<string | null>;
  goLive(): Promise<void>;
  createEvent(event: MatchEvent): Promise<MatchEvent>;
  getEvents(): Promise<MatchEvent[]>;
  createClip(req: CreateClipRequest, onProgress?: (stage: ClipStage, progress: number) => void): Promise<Clip>;
  getClips(): Promise<Clip[]>;
  deleteClip(id: string): Promise<void>;
  /** Realtime channel (WebSocket in local mode). Returns unsubscribe. */
  subscribe(handler: (msg: RealtimeMessage) => void): () => void;
}

export const API = {
  status: "GET /api/status",
  cameras: "GET /api/cameras",
  cameraOptions: "GET /api/cameras/{camera_name}/options",
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
  /** Reserved for the future live-stream endpoint (not in V2). */
} as const;
