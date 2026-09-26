import { VIDEO_SERVICE_URL } from "@/config/videoServiceConfig";

/** Matches local filesystem paths (C:\..., D:/..., \\share\...) that must never reach the browser. */
const LOCAL_PATH = /^(?:[a-zA-Z]:[\\/]|\\\\|file:)/;

/** Turns a URL returned by the Windows service into a browser-playable URL. Returns null for local paths. */
export function toVideoServiceUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (LOCAL_PATH.test(url)) return null;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/")) return `${VIDEO_SERVICE_URL}${url}`;
  return url;
}
