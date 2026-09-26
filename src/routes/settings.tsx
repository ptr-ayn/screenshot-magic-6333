import { useState, type ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";
import { Switch } from "@/components/ui/switch";
import { actions, useOperator } from "@/lib/operator-store";
import { PageHeader } from "@/components/operator/AppShell";
import { ConnectionStatus, RecordingStatus, StorageStatus } from "@/components/operator/status";
import { Field, inputCls } from "@/components/operator/Field";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Futsal Video Support" },
      { name: "description", content: "Camera, buffer, replay, storage and video service settings." },
      { property: "og:title", content: "Settings — Futsal Video Support" },
      { property: "og:description", content: "Camera, buffer, replay, storage and video service settings." },
    ],
  }),
  component: SettingsPage,
});

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-sm border border-border bg-card p-5">
      <h2 className="mb-4 font-display text-sm font-bold tracking-[0.2em] text-muted-foreground">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function SettingsPage() {
  const s = useOperator((x) => x.settings);
  const u = actions.updateSettings;
  const num = (v: string) => Number(v);
  const cameras = useOperator((x) => x.status.cameras);
  const link = useOperator((x) => x.status.link);
  const version = useOperator((x) => x.status.version);
  const recording = useOperator((x) => x.status.recording);
  const [testing, setTesting] = useState(false);
  const [recBusy, setRecBusy] = useState(false);
  const btn = "flex h-11 items-center justify-center gap-2 rounded-sm border border-border px-4 font-display text-sm font-bold tracking-wider hover:bg-accent disabled:opacity-50";
  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4">
      <PageHeader title="Settings" />
      <Section title="VIDEO">
        <Field label="Camera">
          <div className="flex gap-2">
            <select className={inputCls} value={s.cameraId} disabled={!cameras.length} onChange={(e) => { u({ cameraId: e.target.value }); void actions.loadLiveStream(); }}>
              {cameras.length ? cameras.map((c) => <option key={c.id} value={c.id} disabled={c.state === "DISCONNECTED"}>{c.name}{c.driver ? ` (${c.driver})` : ""}{c.state === "DISCONNECTED" ? " — disconnected" : ""}</option>) : <option value="">No cameras found</option>}
            </select>
            <button className={btn} onClick={() => void actions.refreshCameras()} aria-label="Refresh camera list"><RefreshCw className="size-4" /></button>
          </div>
        </Field>
        <Field label="Resolution"><select className={inputCls} value={s.resolution} onChange={(e) => u({ resolution: e.target.value })}>{["1920x1080", "1280x720"].map((r) => <option key={r}>{r}</option>)}</select></Field>
        <Field label="FPS"><select className={inputCls} value={s.fps} onChange={(e) => u({ fps: num(e.target.value) })}>{[30, 60].map((r) => <option key={r} value={r}>{r}</option>)}</select></Field>
        <Field label="Rolling buffer"><select className={inputCls} value={s.bufferDuration} onChange={(e) => u({ bufferDuration: num(e.target.value) })}>{[30, 60, 120, 300].map((r) => <option key={r} value={r}>{r} sec</option>)}</select></Field>
        <Field label="Default replay"><select className={inputCls} value={s.defaultReplay} onChange={(e) => u({ defaultReplay: num(e.target.value) })}>{[10, 15, 30].map((r) => <option key={r} value={r}>{r} sec</option>)}</select></Field>
        <Field label="Recording">
          <div className="flex items-center gap-3">
            <button className={btn} disabled={recBusy} onClick={async () => { setRecBusy(true); await actions.setRecording(!recording); setRecBusy(false); }}>{recording ? "STOP RECORDING" : "START RECORDING"}</button>
            <RecordingStatus />
          </div>
        </Field>
        <Field label="Default replay speed"><select className={inputCls} value={s.defaultSpeed} onChange={(e) => u({ defaultSpeed: num(e.target.value) })}>{[0.25, 0.5, 0.75, 1].map((r) => <option key={r} value={r}>{r}x</option>)}</select></Field>
      </Section>
      <Section title="STORAGE">
        <Field label="Recording directory"><input className={`${inputCls} font-mono text-sm`} value={s.recordingDir} onChange={(e) => u({ recordingDir: e.target.value })} /></Field>
        <Field label="Clips directory"><input className={`${inputCls} font-mono text-sm`} value={s.clipsDir} onChange={(e) => u({ clipsDir: e.target.value })} /></Field>
        <div className="sm:col-span-2"><Field label="Available disk space"><StorageStatus /></Field></div>
      </Section>
      <Section title="VIDEO SERVICE">
        <Field label="Status">
          <div className="flex h-11 items-center gap-3">
            <span className={`font-display text-lg font-bold tracking-wider ${link === "REAL" ? "text-success" : link === "DEMO" || link === "CONNECTING" ? "text-warning" : "text-live"}`}>{link === "REAL" ? "CONNECTED" : link === "CONNECTING" ? "CONNECTING" : link === "DEMO" ? "DEMO MODE" : "OFFLINE"}</span>
            <ConnectionStatus />{version && <span className="font-mono text-xs text-muted-foreground">v{version}</span>}
          </div>
        </Field>
        <Field label="Connection">
          <button className={btn} disabled={testing} onClick={async () => { setTesting(true); await actions.testConnection(); setTesting(false); }}>{testing ? "TESTING…" : "TEST CONNECTION"}</button>
        </Field>
        <Field label="Video service URL"><input readOnly className={`${inputCls} font-mono text-sm opacity-80`} value={s.serviceUrl} /></Field>
        <Field label="WebSocket URL"><input readOnly className={`${inputCls} font-mono text-sm opacity-80`} value={s.wsUrl} /></Field>
        <div className="space-y-3">
          <label className="flex items-center justify-between gap-3"><span><span className="font-semibold">Demo Mode</span><span className="block text-xs text-muted-foreground">Use simulated video instead of the Windows Video Service</span></span><Switch checked={link === "DEMO"} onCheckedChange={(v) => actions.setDemoMode(v)} /></label>
          <label className="flex items-center justify-between gap-3"><span className="font-semibold">Auto reconnect</span><Switch checked={s.autoReconnect} onCheckedChange={(v) => u({ autoReconnect: v })} /></label>
          <label className="flex items-center justify-between gap-3"><span className="font-semibold">Start recording automatically</span><Switch checked={s.autoRecord} onCheckedChange={(v) => { u({ autoRecord: v }); }} /></label>
        </div>
      </Section>
    </div>
  );
}
