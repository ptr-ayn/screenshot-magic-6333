const VIDEO_SERVICE_URL: string = (
  (import.meta.env.VITE_VIDEO_SERVICE_URL as string | undefined) || "http://127.0.0.1:8765"
).replace(/\/+$/, "");

const VIDEO_SERVICE_WS: string =
  (import.meta.env.VITE_VIDEO_SERVICE_WS as string | undefined) || "ws://127.0.0.1:8765/ws";

/** Fall back to DEMO MODE (mock service) when the Windows service can't be reached at startup. */
const VIDEO_SERVICE_DEMO_FALLBACK: boolean =
  (import.meta.env.VITE_VIDEO_SERVICE_DEMO_FALLBACK as string | undefined) !== "false";

export { VIDEO_SERVICE_URL, VIDEO_SERVICE_WS, VIDEO_SERVICE_DEMO_FALLBACK };
