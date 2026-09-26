import { VIDEO_SERVICE_WS } from "@/config/videoServiceConfig";

export type WsState = "idle" | "connecting" | "open" | "closed";

/** Single, auto-reconnecting WebSocket to the Windows Video Service. */
class VideoWebSocket {
  private ws: WebSocket | null = null;
  private retry = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private wanted = false;
  private msgL = new Set<(data: unknown) => void>();
  private stateL = new Set<(s: WsState) => void>();
  state: WsState = "idle";

  constructor(private url: string) {}

  private setState(s: WsState) {
    if (this.state === s) return;
    this.state = s;
    this.stateL.forEach((l) => l(s));
  }

  open() {
    this.wanted = true;
    if (!this.ws && !this.timer) this.connect();
  }

  close() {
    this.wanted = false;
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    const ws = this.ws;
    this.ws = null;
    ws?.close();
    this.retry = 0;
    this.setState("idle");
  }

  private connect() {
    if (typeof WebSocket === "undefined") return;
    this.setState("connecting");
    let ws: WebSocket;
    try { ws = new WebSocket(this.url); } catch { this.setState("closed"); this.scheduleRetry(); return; }
    this.ws = ws;
    ws.onopen = () => { this.retry = 0; this.setState("open"); };
    ws.onmessage = (e) => {
      let data: unknown;
      try { data = JSON.parse(String(e.data)); } catch { return; }
      this.msgL.forEach((l) => l(data));
    };
    ws.onerror = () => { /* onclose follows */ };
    ws.onclose = () => {
      if (this.ws !== ws) return;
      this.ws = null;
      if (this.wanted) { this.setState("closed"); this.scheduleRetry(); }
    };
  }

  private scheduleRetry() {
    if (!this.wanted || this.timer) return;
    const delay = Math.min(10_000, 1000 * 2 ** this.retry++);
    this.timer = setTimeout(() => { this.timer = null; if (this.wanted && !this.ws) this.connect(); }, delay);
  }

  onMessage(l: (data: unknown) => void) { this.msgL.add(l); return () => { this.msgL.delete(l); }; }
  onState(l: (s: WsState) => void) { this.stateL.add(l); return () => { this.stateL.delete(l); }; }
}

export const videoWebSocket = new VideoWebSocket(VIDEO_SERVICE_WS);
