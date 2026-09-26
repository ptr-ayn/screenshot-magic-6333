const VIDEO_SERVICE_URL: string = (
  (import.meta.env["VITE_VIDEO_SERVICE_URL"] as string | undefined) || "http://127.0.0.1:8765"
).replace(/\/+$/, "");

const VIDEO_SERVICE_WS: string =
  (import.meta.env["VITE_VIDEO_SERVICE_WS"] as string | undefined) || "ws://127.0.0.1:8765/ws";

export { VIDEO_SERVICE_URL, VIDEO_SERVICE_WS };
