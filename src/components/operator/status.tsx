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
  return (
    <div>
      <div className="font-mono text-sm"><span className="font-bold">{f} GB</span><span className="text-muted-foreground"> available of {t} GB</span></div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-sm bg-muted"><div className="h-full bg-success" style={{ width: `${((t - f) / t) * 100}%` }} /></div>
    </div>
  );
}

export function ConnectionStatus() {
  const { connected, mode } = useOperator((x) => x.status);
  return <span className="flex items-center gap-2 text-sm font-semibold"><Dot t={connected ? "ok" : "warn"} pulse={!connected} />{connected ? `Video service connected${mode === "MOCK" ? " (demo)" : ""}` : "Connecting…"}</span>;
}
