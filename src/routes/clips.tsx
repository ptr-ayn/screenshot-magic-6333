import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, Film, Pencil, Play, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { actions, fmtClock, useOperator } from "@/lib/operator-store";
import { PageHeader } from "@/components/operator/AppShell";
import { eventMeta } from "@/components/operator/controls";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Clip } from "@/types/models";

export const Route = createFileRoute("/clips")({
  head: () => ({
    meta: [
      { title: "Saved Clips — Futsal Video Support" },
      { name: "description", content: "Browse, play, rename, export and delete saved replay clips." },
      { property: "og:title", content: "Saved Clips — Futsal Video Support" },
      { property: "og:description", content: "Browse, play, rename, export and delete saved replay clips." },
    ],
  }),
  component: ClipsPage,
});

function ClipsPage() {
  return <div className="mx-auto max-w-[1600px] p-4"><PageHeader title="Clips" /><ClipList /></div>;
}

const act = "flex h-9 items-center gap-1.5 rounded-sm border border-border px-2.5 text-xs font-bold hover:bg-accent";

function ClipList() {
  const clips = useOperator((s) => s.clips);
  const cameras = useOperator((s) => s.status.cameras);
  useEffect(() => { actions.refreshClips().catch((e) => toast.error(`Could not load clips: ${e instanceof Error ? e.message : "unknown error"}`)); }, []);
  const [playing, setPlaying] = useState<Clip | null>(null);
  if (!clips.length) return <div className="rounded-sm border border-border bg-card p-10 text-center text-muted-foreground">No clips yet. Press SAVE REPLAY on the Live screen.</div>;
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {clips.map((c) => {
          const m = eventMeta(c.eventType); const Icon = m.icon;
          return (
            <div key={c.id} className="overflow-hidden rounded-sm border border-border bg-card">
              <button onClick={() => setPlaying(c)} className="relative grid aspect-video w-full place-items-center bg-panel text-muted-foreground hover:text-foreground">
                <Film className="size-10 opacity-40" />
                <span className="absolute bottom-2 right-2 bg-background/80 px-1.5 font-mono text-xs">{fmtClock(c.endTime - c.startTime)}</span>
                <span className="absolute left-2 top-2 flex items-center gap-1 bg-background/80 px-1.5 py-0.5 font-display text-xs font-bold"><Icon className="size-3.5" />{c.eventType}</span>
              </button>
              <div className="space-y-1 p-3">
                <div className="truncate font-display text-lg font-bold">{c.name}</div>
                <div className="flex flex-wrap gap-x-3 font-mono text-xs text-muted-foreground">
                  <span>@ {fmtClock(c.startTime)}</span><span>{cameras.find((x) => x.id === c.cameraId)?.name ?? (c.cameraId || "Camera")}</span>
                  <span>{new Date(c.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  <span className={c.status === "READY" ? "text-success" : "text-warning"}>{c.status}</span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-2">
                  <button className={act} onClick={() => setPlaying(c)}><Play className="size-3.5" />PLAY</button>
                  <button className={act} onClick={() => { const n = prompt("Rename clip", c.name); if (n?.trim()) actions.renameClip(c.id, n.trim()); }}><Pencil className="size-3.5" />RENAME</button>
                  <button className={act} onClick={() => toast.success(`Export queued: ${c.name}.mp4`)}><Download className="size-3.5" />EXPORT</button>
                  <button className={`${act} text-destructive`} onClick={() => { if (confirm(`Delete "${c.name}"?`)) actions.deleteClip(c.id); }}><Trash2 className="size-3.5" />DELETE</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <Dialog open={!!playing} onOpenChange={(o) => !o && setPlaying(null)}>
        <DialogContent className="max-w-3xl rounded-sm">
          <DialogHeader><DialogTitle className="font-display text-xl">{playing?.name}</DialogTitle></DialogHeader>
          {playing?.url ? (
            <video key={playing.url} src={playing.url} controls autoPlay playsInline className="aspect-video w-full bg-panel" onError={() => toast.error("Clip video could not be loaded from the video service")} />
          ) : <div className="grid aspect-video place-items-center bg-panel text-center text-sm text-muted-foreground">
            <div><Film className="mx-auto mb-2 size-10 opacity-40" />Playback is served by the local video service.<br />Demo mode: {playing && fmtClock(playing.endTime - playing.startTime)} clip from {playing && fmtClock(playing.startTime)}.</div>
          </div>}
        </DialogContent>
      </Dialog>
    </>
  );
}
