import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Kbd } from "./controls";

const ROWS: [string, string][] = [
  ["L / Space", "LIVE"], ["1", "10 second replay"], ["2", "15 second replay"], ["3", "30 second replay"],
  ["Q", "0.75x speed"], ["W", "0.50x speed"], ["E", "0.25x speed"], ["R", "1x speed"],
  ["G", "GOAL"], ["F", "FOUL"], ["O", "OUT"], ["C", "CORNER"],
  ["S", "SAVE CLIP"], ["?", "This help"],
];

export function KeyboardShortcutHelp({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-sm">
        <DialogHeader><DialogTitle className="font-display text-xl tracking-wider">KEYBOARD SHORTCUTS</DialogTitle></DialogHeader>
        <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
          {ROWS.map(([k, v]) => <div key={k} className="contents"><Kbd>{k}</Kbd><span>{v}</span></div>)}
        </div>
        <p className="text-xs text-muted-foreground">Shortcuts are ignored while typing in a field.</p>
      </DialogContent>
    </Dialog>
  );
}
