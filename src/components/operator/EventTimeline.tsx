import { Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { actions, fmtClock, getOperator, useMatchClock, useOperator } from "@/lib/operator-store";
import { eventMeta } from "./controls";

export function EventTimeline() {
  const now = useMatchClock();
  const events = useOperator((s) => s.events);
  const selectedId = useOperator((s) => s.selectedEventId);
  const bufferSec = useOperator((s) => s.status.bufferSeconds);
  const span = Math.max(20 * 60, now + 60);
  const sel = events.find((e) => e.id === selectedId);
  const pct = (t: number) => `${(t / span) * 100}%`;

  const loadReplay = () => {
    if (!sel) return;
    const back = now - sel.timestamp + sel.replayOffset;
    if (back > bufferSec) { actions.replay(Math.min(sel.replayOffset, Math.max(1, bufferSec))); return; }
    actions.replay(back);
  };

  return (
    <div className="rounded-sm border border-border bg-card p-3">
      <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
        <span className="font-display font-bold tracking-wider">TIMELINE</span>
        <span className="font-mono">{events.length} events · {fmtClock(now)}</span>
      </div>
      <div className="relative h-20 select-none">
        <div className="absolute inset-x-0 top-6 h-1 bg-muted" />
        <div className="absolute left-0 top-6 h-1 bg-primary/60" style={{ width: pct(now) }} />
        {[0, 5, 10, 15, 20].map((m) => (
          <span key={m} className="absolute top-10 -translate-x-1/2 font-mono text-[10px] text-muted-foreground" style={{ left: pct(m * 60) }}>{String(m).padStart(2, "0")}:00</span>
        ))}
        <div className="absolute top-3 h-7 w-0.5 bg-live" style={{ left: pct(now) }} />
        {events.map((e) => {
          const m = eventMeta(e.type);
          const Icon = m.icon;
          return (
            <button key={e.id} onClick={() => actions.selectEvent(e.id === selectedId ? null : e.id)}
              className={cn("absolute top-0 flex -translate-x-1/2 flex-col items-center", e.id === selectedId && "z-10")} style={{ left: pct(e.timestamp) }} title={`${e.type} ${fmtClock(e.timestamp)}`}>
              <span className={cn("grid size-7 place-items-center rounded-full border-2 border-background", m.dot, e.id === selectedId && "ring-2 ring-foreground")}>
                <Icon className="size-3.5 text-background" />
              </span>
              <span className="mt-8 whitespace-nowrap font-display text-[11px] font-bold tracking-wide">{e.type}</span>
            </button>
          );
        })}
      </div>
      {sel && (
        <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border pt-2 text-sm">
          <span className="font-display text-lg font-bold">{sel.type}</span>
          <span className="font-mono">{fmtClock(sel.timestamp)}</span>
          <span className="text-muted-foreground">{sel.cameraId === "cam-1" ? "Camera 1" : sel.cameraId} · {sel.replayOffset}s pre-roll · {sel.clipId ? "Clip saved" : "No clip"}</span>
          <input defaultValue={sel.note} key={sel.id} placeholder="Note / team…" onBlur={(ev) => actions.updateEvent(sel.id, { note: ev.target.value })}
            className="h-8 min-w-40 flex-1 rounded-sm border border-input bg-background px-2 text-sm" />
          <button onClick={loadReplay} className="flex h-8 items-center gap-1.5 rounded-sm border border-primary px-3 font-display font-bold text-primary hover:bg-primary/15"><Play className="size-4" />LOAD REPLAY</button>
        </div>
      )}
    </div>
  );
}

export const _getOperator = getOperator;
