import { useRef, type ReactNode } from "react";
import { Maximize } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNow, useOperator } from "@/lib/operator-store";
import { Dot } from "./status";

function timecode(ms: number | null) {
  if (ms == null) return "--:--:--:--";
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}:${p(Math.floor(d.getMilliseconds() / (1000 / 60)))}`;
}

function Pitch() {
  return (
    <svg viewBox="0 0 400 200" className="absolute inset-0 h-full w-full opacity-25" preserveAspectRatio="none" aria-hidden>
      <g fill="none" stroke="currentColor" strokeWidth="1.2" className="text-muted-foreground">
        <rect x="10" y="10" width="380" height="180" />
        <line x1="200" y1="10" x2="200" y2="190" />
        <circle cx="200" cy="100" r="28" />
        <path d="M10 55 A45 45 0 0 1 55 100 A45 45 0 0 1 10 145" />
        <path d="M390 55 A45 45 0 0 0 345 100 A45 45 0 0 0 390 145" />
      </g>
    </svg>
  );
}

function Panel({ label, badge, sub, children, footer, accent }: { label: string; badge: ReactNode; sub: string; children?: ReactNode; footer: ReactNode; accent: "live" | "replay" | "idle" }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div ref={ref} className={cn("relative flex min-w-0 flex-col overflow-hidden rounded-sm border-2 bg-panel", accent === "live" ? "border-live" : accent === "replay" ? "border-primary" : "border-border")}>
      <div className="relative aspect-video w-full">
        <Pitch />
        {children}
        <div className="absolute left-3 top-3 flex items-center gap-2">
          <span className="bg-background/80 px-2 py-1 font-display text-sm font-bold tracking-wider">{label}</span>
          {badge}
        </div>
        <div className="absolute right-3 top-3 flex items-center gap-2">
          <span className="bg-background/80 px-2 py-1 font-mono text-xs">{sub}</span>
          <button onClick={() => (document.fullscreenElement ? document.exitFullscreen() : ref.current?.requestFullscreen())} className="bg-background/80 p-1.5 hover:bg-accent" aria-label={`Fullscreen ${label}`}>
            <Maximize className="size-4" />
          </button>
        </div>
        <div className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-2">{footer}</div>
      </div>
    </div>
  );
}

export function LiveVideoPanel() {
  const now = useNow(1000 / 30);
  const cam = useOperator((s) => s.status.cameras[0]);
  const ok = cam && cam.state !== "DISCONNECTED" && cam.state !== "ERROR";
  return (
    <Panel
      label={cam?.name.toUpperCase() ?? "CAMERA 1"}
      accent="live"
      badge={<span className="flex items-center gap-1.5 bg-live px-2 py-1 font-display text-sm font-bold text-live-foreground"><Dot t="ok" pulse />LIVE</span>}
      sub={cam ? `${cam.height}p${cam.fps}` : "NO SIGNAL"}
      footer={<><span className="flex items-center gap-2 bg-background/80 px-2 py-1 text-xs"><Dot t={ok ? "ok" : "off"} />{ok ? "Signal OK" : "Camera disconnected"}</span><span className="bg-background/80 px-2 py-1 font-mono text-sm">{timecode(now)}</span></>}
    >
      {!ok && <div className="absolute inset-0 grid place-items-center font-display text-2xl font-bold tracking-widest text-muted-foreground">NO SIGNAL</div>}
    </Panel>
  );
}

export function ReplayVideoPanel() {
  const now = useNow(1000 / 30);
  const r = useOperator((s) => s.replay);
  const isReplay = r.mode === "REPLAY";
  const elapsed = isReplay && r.startedAt && now ? (now - r.startedAt) / 1000 : 0;
  const lag = r.offset + elapsed * (1 - r.speed);
  const pos = Math.min(1, (elapsed * r.speed) / Math.max(1, r.offset));
  return (
    <Panel
      label="REPLAY"
      accent={isReplay ? "replay" : "idle"}
      badge={isReplay ? <span className="bg-primary px-2 py-1 font-display text-sm font-bold text-primary-foreground">{r.offset} SECONDS AGO</span> : <span className="bg-secondary px-2 py-1 font-display text-sm font-bold text-muted-foreground">STANDBY</span>}
      sub={`${r.speed.toFixed(2)}x`}
      footer={isReplay ? (
        <div className="w-full bg-background/80 px-2 py-1.5">
          <div className="mb-1 flex justify-between font-mono text-xs"><span>−{lag.toFixed(1)}s behind live</span><span>{timecode(now ? now - lag * 1000 : null)}</span></div>
          <div className="h-1.5 w-full bg-muted"><div className="h-full bg-primary" style={{ width: `${pos * 100}%` }} /></div>
        </div>
      ) : <span className="bg-background/80 px-2 py-1 text-xs text-muted-foreground">Select 10 / 15 / 30 SEC to start a replay</span>}
    >
      {!isReplay && <div className="absolute inset-0 grid place-items-center font-display text-3xl font-bold tracking-widest text-muted-foreground/60">SYNCED TO LIVE</div>}
    </Panel>
  );
}
