import { cn } from "@/lib/utils";
import type { Camera, CameraState } from "@/types/models";
import { useOperator } from "@/lib/operator-store";

const tone = { ok: "bg-success", live: "bg-live", warn: "bg-warning", off: "bg-muted-foreground" } as const;

export function Dot({ t, pulse }: { t: keyof typeof tone; pulse?: boolean }) {
  return <span className={cn("inline-block size-2.5 shrink-0 rounded-full", tone[t], pulse && "animate-pulse")} />;
}

const camMap: Record<CameraState, { t: keyof typeof tone; label: string }> = {
  CONNECTED: { t: "ok", label: "Connected" },
  RECORDING: { t: "live", label: "Recording" },
  RECONNECTING: { t: "warn", label: "Reconnecting" },
  DISCONNECTED: { t: "off", label: "Camera disconnected" },
  ERROR: { t: "live", label: "Camera error" },
};

export function CameraStatus({ camera, compact }: { camera?: Camera | undefined; compact?: boolean }) {
  const st = camera ? camMap[camera.state] : camMap.DISCONNECTED;
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Dot t={st.t} pulse={camera?.state === "RECORDING"} />
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold">{camera ? `${camera.name} · ${st.label}` : st.label}</div>
        {!compact && camera && <div className="font-mono text-xs text-muted-foreground">{camera.height}p{camera.fps} · {camera.width}×{camera.height}</div>}
      </div>
    </div>
  );
}

export function RecordingStatus() {
  const rec = useOperator((s) => s.status.recording);
  return <span className="flex items-center gap-2 text-sm font-semibold"><Dot t={rec ? "live" : "off"} pulse={rec} />{rec ? "Recording" : "Not recording"}</span>;
}

export function BufferStatus({ bar = true }: { bar?: boolean }) {
  const { bufferSeconds: s, bufferCapacity: c } = useOperator((x) => x.status);
  return (
    <div className="min-w-0">
      <div className="font-mono text-sm"><span className="font-bold">{s}</span><span className="text-muted-foreground"> / {c} sec</span></div>
      {bar && <div className="mt-1 h-1.5 w-full overflow-hidden rounded-sm bg-muted"><div className="h-full bg-primary transition-[width]" style={{ width: `${(s / c) * 100}%` }} /></div>}
    </div>
  );
}

export function StorageStatus() {
  const { storageFreeGb: f, storageTotalGb: t } = useOperator((x) => x.status);
  if (!t) return <div className="text-sm text-muted-foreground">Not reported by video service</div>;
  return (
    <div>
      <div className="font-mono text-sm"><span className="font-bold">{f} GB</span><span className="text-muted-foreground"> available of {t} GB</span></div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-sm bg-muted"><div className="h-full bg-success" style={{ width: `${((t - f) / t) * 100}%` }} /></div>
    </div>
  );
}

const LINK = {
  REAL: { t: "ok", label: "REAL MODE", text: "Video service connected", cls: "border-success/50 text-success" },
  DEMO: { t: "warn", label: "DEMO MODE", text: "Demo mode — video service not found", cls: "border-warning/50 text-warning" },
  CONNECTING: { t: "warn", label: "CONNECTING...", text: "Connecting…", cls: "border-warning/50 text-warning" },
  OFFLINE: { t: "live", label: "SERVICE OFFLINE", text: "Video service offline", cls: "border-live/50 text-live" },
} as const;

export function ConnectionStatus() {
  const link = useOperator((x) => x.status.link);
  const l = LINK[link];
  return <span className="flex items-center gap-2 whitespace-nowrap text-sm font-semibold"><Dot t={l.t} pulse={link === "CONNECTING"} />{l.text}</span>;
}

export function ModeIndicator() {
  const link = useOperator((x) => x.status.link);
  const l = LINK[link];
  return <span className={cn("flex shrink-0 items-center gap-1.5 rounded-sm border px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-widest", l.cls)}><Dot t={l.t} pulse={link === "CONNECTING"} />{l.label}</span>;
}
