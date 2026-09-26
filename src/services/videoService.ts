import type { VideoService } from "./contract";
import { mockVideoService } from "./mockVideoService";
import { createLocalVideoService } from "./localVideoService";

export type { VideoService } from "./contract";
export { API } from "./contract";

/** Flip to "LOCAL" once the Windows FastAPI + FFmpeg service is running. */
export const SERVICE_MODE: "MOCK" | "LOCAL" = "MOCK";

export const videoService: VideoService =
  SERVICE_MODE === "MOCK" ? mockVideoService : createLocalVideoService();
