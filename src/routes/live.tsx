import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { HelpCircle, Maximize2, Minimize2, Save } from "lucide-react";
import { actions, useBusy, useOperator, useReadOnly } from "@/lib/operator-store";
import { LiveVideoPanel, ReplayVideoPanel } from "@/components/operator/video-panels";
import { EVENT_TYPES, EventButtons, Kbd, MatchTimer, ReplayControls } from "@/components/operator/controls";
import { EventTimeline } from "@/components/operator/EventTimeline";
import { SaveClipDialog } from "@/components/operator/SaveClipDialog";
import { KeyboardShortcutHelp } from "@/components/operator/KeyboardShortcutHelp";
import { CameraStatus } from "@/components/operator/status";

export const Route = createFileRoute("/live")({
  head: () => ({
    meta: [
      { title: "Live / Replay — Futsal Video Support" },
      { name: "description", content: "Live camera and instant replay control with event tagging and clip saving." },
      { property: "og:title", content: "Live / Replay — Futsal Video Support" },
      { property: "og:description", content: "Live camera and instant replay control with event tagging and clip saving." },
    ],
  }),
  component: LivePage,
});

function LivePage() {
  const [saveOpen, setSaveOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const operatorMode = useOperator((s) => s.operatorMode);
  const match = useOperator((s) => s.match);
  const cam = useOperator((s) => s.status.cameras[0]);
  const readOnly = useReadOnly();
  const clipBusy = useBusy("clip");

  const toggleOperator = () => {
    const on = !operatorMode;
    actions.setOperatorMode(on);
    if (on) document.documentElement.requestFullscreen?.().catch(() => {});
    else if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select, [contenteditable=true]") || e.ctrlKey || e.metaKey || e.altKey) return;
      if (saveOpen || helpOpen) return;
      const k = e.key.toUpperCase();
      if (e.key === " " || k === "L") { e.preventDefault(); actions.goLive(); return; }
      if (k === "Q") return void actions.setSpeed(0.75);
      if (k === "W") return void actions.setSpeed(0.5);
      if (k === "E") return void actions.setSpeed(0.25);
      if (k === "R") return void actions.setSpeed(1);
      if (k === "1") return void actions.replay(10);
      if (k === "2") return void actions.replay(15);
      if (k === "3") return void actions.replay(30);
      if (k === "S") { e.preventDefault(); if (!readOnly && !clipBusy) setSaveOpen(true); return; }
      if (e.key === "?") return setHelpOpen(true);
      const ev = k && EVENT_TYPES.find((x) => x.key === k);
      if (ev) actions.addEvent(ev.type);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => { void actions.loadEvents(); }, []);

  useEffect(() => {
    const onFs = () => { if (!document.fullscreenElement && operatorMode) actions.setOperatorMode(false); };
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, [operatorMode]);

  return (
    <div className="mx-auto flex max-w-[1920px] flex-col gap-3 p-3">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="flex min-w-0 items-center gap-4">
          <MatchTimer />
          <div className="hidden min-w-0 md:block">
            <div className="truncate text-xs uppercase tracking-wider text-muted-foreground">{match.competition}</div>
            <div className="truncate font-display text-xl font-bold">{match.homeTeam} vs {match.awayTeam}</div>
          </div>
          <div className="hidden lg:block"><CameraStatus camera={cam} /></div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button onClick={() => setHelpOpen(true)} className="flex h-12 items-center gap-2 rounded-sm border border-border px-3 text-sm font-semibold hover:bg-accent" aria-label="Keyboard shortcuts"><HelpCircle className="size-5" /><span className="hidden xl:inline">Shortcuts</span></button>
          <button onClick={toggleOperator} className="flex h-12 items-center gap-2 rounded-sm border border-border px-3 text-sm font-semibold hover:bg-accent">
            {operatorMode ? <Minimize2 className="size-5" /> : <Maximize2 className="size-5" />}<span className="hidden xl:inline">{operatorMode ? "Exit operator mode" : "Operator mode"}</span>
          </button>
          <CameraButton />
          <button disabled={readOnly || clipBusy} onClick={() => setSaveOpen(true)} className="flex h-12 disabled:opacity-40 items-center gap-2 rounded-sm bg-primary px-5 font-display text-xl font-bold tracking-wider text-primary-foreground hover:bg-primary/90">
            <Save className="size-5" />SAVE CLIP<Kbd>S</Kbd>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <LiveVideoPanel />
        <ReplayVideoPanel />
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <ReplayControls large={operatorMode} />
        <EventButtons large={operatorMode} />
      </div>

      <EventTimeline />

      <SaveClipDialog open={saveOpen} onOpenChange={setSaveOpen} />
      <KeyboardShortcutHelp open={helpOpen} onOpenChange={setHelpOpen} />
    </div>
  );
}

function CameraButton() {
  const recording = useOperator((s) => s.status.recording);
  const busy = useBusy("recording");
  const readOnly = useReadOnly();
  return (
    <button disabled={readOnly || busy} onClick={() => void actions.setRecording(!recording)}
      className={`flex h-12 items-center gap-2 rounded-sm border-2 px-3 font-display text-sm font-bold tracking-wider disabled:opacity-40 ${recording ? "border-live text-live hover:bg-live/15" : "border-success text-success hover:bg-success/15"}`}>
      {busy ? "…" : recording ? "STOP CAMERA" : "START CAMERA"}
    </button>
  );
}
