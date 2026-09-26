import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { actions, clockSeconds, fmtClock, getOperator } from "@/lib/operator-store";
import type { ClipStage, EventType } from "@/types/models";

const STAGE_LABEL: Record<ClipStage, string> = { PREPARING: "Preparing clip…", ENCODING: "Encoding…", SAVING: "Saving…", COMPLETED: "Completed." };

export function SaveClipDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [draft, setDraft] = useState<{ eventId: string | null; type: EventType; start: number; end: number } | null>(null);
  const [name, setName] = useState("");
  const [stage, setStage] = useState<ClipStage | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!open) return;
    const s = getOperator();
    const ev = s.events.find((e) => e.id === s.selectedEventId) ?? s.events[s.events.length - 1];
    const now = clockSeconds(s, Date.now());
    const d = ev
      ? { eventId: ev.id, type: ev.type, start: Math.max(0, ev.timestamp - ev.replayOffset), end: ev.timestamp + 5 }
      : { eventId: null, type: "OTHER" as EventType, start: Math.max(0, now - (s.replay.offset || s.settings.defaultReplay)), end: now };
    setDraft(d);
    setName(`${d.type[0]}${d.type.slice(1).toLowerCase()} - ${fmtClock(ev ? ev.timestamp : now)}`);
    setStage(null); setProgress(0);
  }, [open]);

  const busy = stage !== null && stage !== "COMPLETED";
  const save = async () => {
    if (!draft) return;
    try {
      await actions.saveClip(
        { eventId: draft.eventId, eventType: draft.type, startTime: draft.start, endTime: draft.end, name: name.trim() || "Clip", cameraId: getOperator().settings.cameraId },
        (st, p) => { setStage(st); setProgress(p); },
      );
      toast.success(`Clip saved: ${name}`);
      setTimeout(() => onOpenChange(false), 600);
    } catch { toast.error("Clip failed — video service unavailable"); setStage(null); }
  };

  const Row = ({ k, v }: { k: string; v: string }) => (
    <div className="flex justify-between border-b border-border py-1.5"><span className="text-muted-foreground">{k}</span><span className="font-mono font-semibold">{v}</span></div>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="max-w-md rounded-sm">
        <DialogHeader><DialogTitle className="font-display text-2xl tracking-wider">SAVE CLIP</DialogTitle></DialogHeader>
        {draft && (
          <div className="text-sm">
            <Row k="Event" v={draft.type} />
            <Row k="Start" v={fmtClock(draft.start)} />
            <Row k="End" v={fmtClock(draft.end)} />
            <Row k="Duration" v={`${draft.end - draft.start} sec`} />
            <label className="mt-3 block text-muted-foreground">Clip name</label>
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !stage && save()} disabled={!!stage}
              className="mt-1 h-10 w-full rounded-sm border border-input bg-background px-3 text-base" />
            {stage && (
              <div className="mt-4 space-y-1.5">
                <div className="flex justify-between font-mono text-xs"><span>{STAGE_LABEL[stage]}</span><span>{progress}%</span></div>
                <Progress value={progress} className="h-2 rounded-sm" />
              </div>
            )}
          </div>
        )}
        <DialogFooter className="gap-2">
          <button onClick={() => onOpenChange(false)} disabled={busy} className="h-11 rounded-sm border border-border px-5 font-display font-bold disabled:opacity-40">CANCEL</button>
          <button onClick={save} disabled={!!stage} className="h-11 rounded-sm bg-primary px-6 font-display font-bold text-primary-foreground disabled:opacity-50">SAVE CLIP</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
