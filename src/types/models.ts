export type Period = "1H" | "HT" | "2H" | "ET";
export const PERIOD_LABEL: Record<Period, string> = {
  "1H": "1ST HALF",
  HT: "HALF TIME",
  "2H": "2ND HALF",
  ET: "EXTRA TIME",
};

export interface Match {
  id: string;
  competition: string;
  homeTeam: string;
  awayTeam: string;
  date: string;
  time: string;
  venue: string;
  matchNumber: string;
  period: Period;
  status: "SCHEDULED" | "LIVE" | "FINISHED";
}

export type CameraState = "CONNECTED" | "DISCONNECTED" | "RECONNECTING" | "RECORDING" | "ERROR";

export interface Camera {
  id: string;
  name: string;
  state: CameraState;
  width: number;
  height: number;
  fps: number;
}

export type EventType = "GOAL" | "FOUL" | "OUT" | "CORNER" | "HAND" | "OTHER";

export interface MatchEvent {
  id: string;
  matchId: string;
  type: EventType;
  /** Match clock in seconds when the event was tagged */
  timestamp: number;
  period: Period;
  cameraId: string;
  /** Seconds of pre-roll to use when replaying / clipping */
  replayOffset: number;
  note: string;
  clipId?: string;
}

export type ClipStatus = "QUEUED" | "ENCODING" | "READY" | "FAILED";

export interface Clip {
  id: string;
  eventId: string | null;
  eventType: EventType;
  name: string;
  startTime: number;
  endTime: number;
  createdAt: string;
  cameraId: string;
  status: ClipStatus;
}

export interface CreateClipRequest {
  eventId: string | null;
  eventType: EventType;
  startTime: number;
  endTime: number;
  name: string;
  cameraId: string;
}

export type ClipStage = "PREPARING" | "ENCODING" | "SAVING" | "COMPLETED";

export interface ReplayState {
  mode: "LIVE" | "REPLAY";
  offset: number;
  speed: number;
  /** epoch ms when replay started (client only) */
  startedAt: number | null;
}

export interface ServiceStatus {
  connected: boolean;
  mode: "MOCK" | "LOCAL";
  recording: boolean;
  bufferSeconds: number;
  bufferCapacity: number;
  storageFreeGb: number;
  storageTotalGb: number;
  cameras: Camera[];
}

export interface LiveStream {
  cameraId: string;
  kind: "mock" | "mjpeg" | "hls" | "webrtc";
  url: string | null;
}

export interface Settings {
  cameraId: string;
  resolution: string;
  fps: number;
  bufferDuration: number;
  defaultReplay: number;
  defaultSpeed: number;
  recordingDir: string;
  clipsDir: string;
  serviceUrl: string;
  wsUrl: string;
  autoReconnect: boolean;
  autoRecord: boolean;
}

export type RealtimeMessage =
  | { type: "video_status"; data: Partial<ServiceStatus> }
  | { type: "camera_status"; data: Camera }
  | { type: "recording_status"; data: { recording: boolean } }
  | { type: "buffer_status"; data: { seconds: number; capacity: number } }
  | { type: "replay_status"; data: Partial<ReplayState> }
  | { type: "clip_progress"; data: { clipId: string; stage: ClipStage; progress: number } }
  | { type: "clip_completed"; data: Clip }
  | { type: "error"; data: { message: string } };
