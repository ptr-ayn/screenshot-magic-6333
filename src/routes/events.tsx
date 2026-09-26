import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { fmtClock, useOperator } from "@/lib/operator-store";
import { PageHeader } from "@/components/operator/AppShell";
import { EVENT_TYPES, eventMeta } from "@/components/operator/controls";
import { PERIOD_LABEL, type Period } from "@/types/models";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/events")({
  head: () => ({
    meta: [
      { title: "Event Log — Futsal Video Support" },
      { name: "description", content: "All tagged match events with camera, replay offset and clip status." },
      { property: "og:title", content: "Event Log — Futsal Video Support" },
      { property: "og:description", content: "All tagged match events with camera, replay offset and clip status." },
    ],
  }),
  component: EventsPage,
});

const sel = "h-10 rounded-sm border border-input bg-background px-2 text-sm";

function EventsPage() {
  return <div className="mx-auto max-w-[1600px] p-4"><PageHeader title="Events" /><EventLog /></div>;
}

function EventLog() {
  const events = useOperator((s) => s.events);
  const [type, setType] = useState("ALL");
  const [period, setPeriod] = useState("ALL");
  const [cam, setCam] = useState("ALL");
  const rows = events
    .filter((e) => (type === "ALL" || e.type === type) && (period === "ALL" || e.period === period) && (cam === "ALL" || e.cameraId === cam))
    .sort((a, b) => b.timestamp - a.timestamp);
  return (
    <div className="rounded-sm border border-border bg-card">
      <div className="flex flex-wrap gap-2 border-b border-border p-3">
        <select className={sel} value={type} onChange={(e) => setType(e.target.value)}><option value="ALL">All events</option>{EVENT_TYPES.map((t) => <option key={t.type}>{t.type}</option>)}</select>
        <select className={sel} value={period} onChange={(e) => setPeriod(e.target.value)}><option value="ALL">All periods</option>{(Object.keys(PERIOD_LABEL) as Period[]).map((p) => <option key={p} value={p}>{PERIOD_LABEL[p]}</option>)}</select>
        <select className={sel} value={cam} onChange={(e) => setCam(e.target.value)}><option value="ALL">All cameras</option><option value="cam-1">Camera 1</option></select>
        <span className="ml-auto self-center font-mono text-xs text-muted-foreground">{rows.length} of {events.length}</span>
      </div>
      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
          <tr>{["Time", "Event", "Period", "Camera", "Replay", "Clip", "Notes"].map((h) => <th key={h} className="px-3 py-2 font-bold">{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((e) => {
            const m = eventMeta(e.type); const Icon = m.icon;
            return (
              <tr key={e.id} className="border-t border-border hover:bg-accent/40">
                <td className="px-3 py-2.5 font-mono font-bold">{fmtClock(e.timestamp)}</td>
                <td className="px-3 py-2.5"><span className="flex items-center gap-2 font-display text-base font-bold"><span className={cn("size-2.5 rounded-full", m.dot)} /><Icon className="size-4" />{e.type}</span></td>
                <td className="px-3 py-2.5 text-muted-foreground">{PERIOD_LABEL[e.period]}</td>
                <td className="px-3 py-2.5">{e.cameraId === "cam-1" ? "Camera 1" : e.cameraId}</td>
                <td className="px-3 py-2.5 font-mono">{e.replayOffset} sec</td>
                <td className="px-3 py-2.5">{e.clipId ? <span className="text-success">Saved</span> : <span className="text-muted-foreground">Not saved</span>}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{e.note || "—"}</td>
              </tr>
            );
          })}
          {!rows.length && <tr><td colSpan={7} className="px-3 py-10 text-center text-muted-foreground">No events match these filters.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
