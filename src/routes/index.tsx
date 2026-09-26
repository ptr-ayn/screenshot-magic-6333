import { createFileRoute, Link } from "@tanstack/react-router";
import { MonitorPlay } from "lucide-react";
import type { ReactNode } from "react";
import { useOperator } from "@/lib/operator-store";
import { BufferStatus, CameraStatus, ConnectionStatus, Dot, RecordingStatus, StorageStatus } from "@/components/operator/status";
import { PERIOD_LABEL } from "@/types/models";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Futsal Video Support" },
      { name: "description", content: "Operator dashboard for the futsal video replay system: match, camera, recording and buffer status." },
      { property: "og:title", content: "Dashboard — Futsal Video Support" },
      { property: "og:description", content: "Operator dashboard for the futsal video replay system." },
    ],
  }),
  component: Dashboard,
});

function Tile({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-sm border border-border bg-card p-4 ${className ?? ""}`}>
      <div className="mb-2 font-display text-xs font-bold tracking-[0.2em] text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}

function Dashboard() {
  const match = useOperator((s) => s.match);
  const events = useOperator((s) => s.events.length);
  const clips = useOperator((s) => s.clips.length);
  const cam = useOperator((s) => s.status.cameras[0]);
  return (
    <div className="mx-auto max-w-[1600px] p-4">
      <div className="grid gap-3 lg:grid-cols-4">
        <Tile label="MATCH" className="lg:col-span-2">
          <div className="text-sm text-muted-foreground">{match.competition} · Match #{match.matchNumber}</div>
          <div className="font-display text-4xl font-bold">{match.homeTeam} <span className="text-muted-foreground">vs</span> {match.awayTeam}</div>
          <div className="mt-1 text-sm text-muted-foreground">{match.venue} · {match.date} {match.time}</div>
        </Tile>
        <Tile label="STATUS">
          <div className="flex items-center gap-2 font-display text-3xl font-bold text-live"><Dot t="live" pulse />{match.status}</div>
          <div className="mt-1 text-sm text-muted-foreground">{PERIOD_LABEL[match.period]}</div>
        </Tile>
        <Tile label="VIDEO SERVICE"><ConnectionStatus /></Tile>
        <Tile label="CAMERA"><CameraStatus camera={cam} /></Tile>
        <Tile label="RECORDING"><RecordingStatus /></Tile>
        <Tile label="BUFFER"><BufferStatus /></Tile>
        <Tile label="STORAGE"><StorageStatus /></Tile>
        <Tile label="EVENTS"><div className="font-mono text-4xl font-bold">{events}</div></Tile>
        <Tile label="SAVED CLIPS"><div className="font-mono text-4xl font-bold">{clips}</div></Tile>
        <Link to="/live" className="flex items-center justify-center gap-3 rounded-sm bg-primary p-4 font-display text-3xl font-bold tracking-wider text-primary-foreground hover:bg-primary/90 lg:col-span-2">
          <MonitorPlay className="size-8" />OPEN LIVE REPLAY
        </Link>
      </div>
    </div>
  );
}
