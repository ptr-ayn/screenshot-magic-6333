import type { ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Switch } from "@/components/ui/switch";
import { actions, useOperator } from "@/lib/operator-store";
import { PageHeader } from "@/components/operator/AppShell";
import { ConnectionStatus, StorageStatus } from "@/components/operator/status";
import { Field, inputCls } from "./setup";

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
  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4">
      <PageHeader title="Settings" />
      <Section title="VIDEO">
        <Field label="Camera"><select className={inputCls} value={s.cameraId} onChange={(e) => u({ cameraId: e.target.value })}><option value="cam-1">Camera 1</option></select></Field>
        <Field label="Resolution"><select className={inputCls} value={s.resolution} onChange={(e) => u({ resolution: e.target.value })}>{["1920x1080", "1280x720"].map((r) => <option key={r}>{r}</option>)}</select></Field>
        <Field label="FPS"><select className={inputCls} value={s.fps} onChange={(e) => u({ fps: num(e.target.value) })}>{[60, 50, 30, 25].map((r) => <option key={r} value={r}>{r}</option>)}</select></Field>
        <Field label="Rolling buffer"><select className={inputCls} value={s.bufferDuration} onChange={(e) => u({ bufferDuration: num(e.target.value) })}>{[30, 60, 120, 300].map((r) => <option key={r} value={r}>{r} sec</option>)}</select></Field>
        <Field label="Default replay"><select className={inputCls} value={s.defaultReplay} onChange={(e) => u({ defaultReplay: num(e.target.value) })}>{[10, 15, 30].map((r) => <option key={r} value={r}>{r} sec</option>)}</select></Field>
        <Field label="Default replay speed"><select className={inputCls} value={s.defaultSpeed} onChange={(e) => u({ defaultSpeed: num(e.target.value) })}>{[0.25, 0.5, 0.75, 1].map((r) => <option key={r} value={r}>{r}x</option>)}</select></Field>
      </Section>
      <Section title="STORAGE">
        <Field label="Recording directory"><input className={`${inputCls} font-mono text-sm`} value={s.recordingDir} onChange={(e) => u({ recordingDir: e.target.value })} /></Field>
        <Field label="Clips directory"><input className={`${inputCls} font-mono text-sm`} value={s.clipsDir} onChange={(e) => u({ clipsDir: e.target.value })} /></Field>
        <div className="sm:col-span-2"><Field label="Available disk space"><StorageStatus /></Field></div>
      </Section>
      <Section title="SYSTEM">
        <Field label="Video service URL"><input className={`${inputCls} font-mono text-sm`} value={s.serviceUrl} onChange={(e) => u({ serviceUrl: e.target.value })} /></Field>
        <Field label="WebSocket URL"><input className={`${inputCls} font-mono text-sm`} value={s.wsUrl} onChange={(e) => u({ wsUrl: e.target.value })} /></Field>
        <Field label="Connection status"><div className="flex h-11 items-center"><ConnectionStatus /></div></Field>
        <div className="space-y-3">
          <label className="flex items-center justify-between gap-3"><span className="font-semibold">Auto reconnect</span><Switch checked={s.autoReconnect} onCheckedChange={(v) => u({ autoReconnect: v })} /></label>
          <label className="flex items-center justify-between gap-3"><span className="font-semibold">Start recording automatically</span><Switch checked={s.autoRecord} onCheckedChange={(v) => { u({ autoRecord: v }); }} /></label>
        </div>
      </Section>
    </div>
  );
}
