import { CircleDot, Flag, Goal, Hand, MoveUpRight, ShieldAlert, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { actions, fmtClock, useMatchClock, useOperator } from "@/lib/operator-store";
import { PERIOD_LABEL, type EventType, type Period } from "@/types/models";

export const EVENT_TYPES: { type: EventType; key: string; icon: LucideIcon; cls: string; dot: string }[] = [
  { type: "GOAL", key: "Q", icon: Goal, cls: "border-success text-success hover:bg-success/15", dot: "bg-success" },
  { type: "FOUL", key: "W", icon: ShieldAlert, cls: "border-warning text-warning hover:bg-warning/15", dot: "bg-warning" },
  { type: "OUT", key: "E", icon: MoveUpRight, cls: "border-border text-foreground hover:bg-accent", dot: "bg-muted-foreground" },
  { type: "CORNER", key: "R", icon: Flag, cls: "border-border text-foreground hover:bg-accent", dot: "bg-primary" },
  { type: "HAND", key: "T", icon: Hand, cls: "border-border text-foreground hover:bg-accent", dot: "bg-live" },
  { type: "OTHER", key: "Y", icon: CircleDot, cls: "border-border text-foreground hover:bg-accent", dot: "bg-foreground" },
];
export const eventMeta = (t: EventType) => EVENT_TYPES.find((e) => e.type === t)!;

export const Kbd = ({ children }: { children: string }) => (
  <kbd className="rounded-sm border border-border bg-background px-1.5 font-mono text-[11px] font-normal text-muted-foreground">{children}</kbd>
);

const bigBtn = "flex items-center justify-center gap-2 rounded-sm border-2 font-display font-bold tracking-wider transition-colors active:translate-y-px";

export function ReplayControls({ large }: { large?: boolean }) {
  const r = useOperator((s) => s.replay);
  const h = large ? "h-20 text-2xl" : "h-16 text-xl";
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-4 gap-2">
        <button onClick={() => actions.goLive()} className={cn(bigBtn, h, r.mode === "LIVE" ? "border-live bg-live text-live-foreground" : "border-live text-live hover:bg-live/15")}>LIVE <Kbd>Space</Kbd></button>
        {[10, 15, 30].map((s, i) => (
          <button key={s} onClick={() => actions.replay(s)} className={cn(bigBtn, h, r.mode === "REPLAY" && r.offset === s ? "border-primary bg-primary text-primary-foreground" : "border-border bg-secondary hover:border-primary")}>
            {s} SEC <Kbd>{String(i + 1)}</Kbd>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-2">
        {[0.25, 0.5, 0.75, 1].map((sp) => (
          <button key={sp} onClick={() => actions.setSpeed(sp)} className={cn(bigBtn, "h-11 text-lg", r.speed === sp ? "border-primary bg-primary/20 text-primary" : "border-border bg-card text-muted-foreground hover:text-foreground")}>
            {sp === 1 ? "1.0" : sp}x
          </button>
        ))}
      </div>
    </div>
  );
}

export function EventButtons({ large }: { large?: boolean }) {
  return (
    <div className="grid grid-cols-3 gap-2 xl:grid-cols-6">
      {EVENT_TYPES.map(({ type, key, icon: Icon, cls }) => (
        <button key={type} onClick={() => actions.addEvent(type)} className={cn(bigBtn, large ? "h-20 text-2xl" : "h-16 text-xl", "bg-card", cls)}>
          <Icon className="size-6 shrink-0" />{type}<Kbd>{key}</Kbd>
        </button>
      ))}
    </div>
  );
}

const PERIODS: Period[] = ["1H", "HT", "2H", "ET"];

export function MatchTimer() {
  const sec = useMatchClock();
  const running = useOperator((s) => s.timer.running);
  const period = useOperator((s) => s.match.period);
  return (
    <div className="flex items-center gap-4 rounded-sm border border-border bg-card px-4 py-2">
      <div className="min-w-0">
        <select value={period} onChange={(e) => actions.setPeriod(e.target.value as Period)} className="bg-transparent font-display text-sm font-bold tracking-wider text-primary outline-hidden">
          {PERIODS.map((p) => <option key={p} value={p} className="bg-popover">{PERIOD_LABEL[p]}</option>)}
        </select>
        <div className="font-mono text-4xl font-bold leading-none tabular-nums">{fmtClock(sec)}</div>
      </div>
      <div className="flex gap-1.5">
        {running
          ? <button onClick={actions.pauseTimer} className="h-10 rounded-sm border border-warning px-3 font-display font-bold text-warning hover:bg-warning/15">PAUSE</button>
          : <button onClick={actions.startTimer} className="h-10 rounded-sm border border-success px-3 font-display font-bold text-success hover:bg-success/15">START</button>}
        <button onClick={actions.resetTimer} className="h-10 rounded-sm border border-border px-3 font-display font-bold text-muted-foreground hover:text-foreground">RESET</button>
      </div>
    </div>
  );
}
