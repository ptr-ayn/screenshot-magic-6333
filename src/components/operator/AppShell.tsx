import { useEffect, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Clapperboard, LayoutDashboard, ListOrdered, MonitorPlay, Settings, SquarePen } from "lucide-react";
import { actions, useOperator } from "@/lib/operator-store";
import { ModeIndicator, RecordingStatus } from "./status";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/setup", label: "Match Setup", icon: SquarePen },
  { to: "/live", label: "Live / Replay", icon: MonitorPlay },
  { to: "/events", label: "Events", icon: ListOrdered },
  { to: "/clips", label: "Clips", icon: Clapperboard },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const operatorMode = useOperator((s) => s.operatorMode);
  const link = useOperator((s) => s.status.link);
  const match = useOperator((s) => s.match);
  useEffect(() => actions.connectService(), []);

  if (operatorMode) return <main className="min-h-screen bg-background">{children}</main>;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-12 shrink-0 items-center gap-4 border-b border-border bg-sidebar px-3">
        <div className="flex shrink-0 items-center gap-2 font-display text-lg font-bold tracking-wider">
          <span className="grid size-7 place-items-center rounded-sm bg-primary text-primary-foreground">FV</span>
          <span className="hidden lg:inline">FUTSAL VIDEO SUPPORT</span>
        </div>
        <nav className="flex min-w-0 items-center gap-0.5 overflow-x-auto">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} activeOptions={{ exact: to === "/" }}
              className="flex h-9 shrink-0 items-center gap-1.5 rounded-sm px-3 text-sm font-semibold text-muted-foreground hover:bg-sidebar-accent hover:text-foreground data-[status=active]:bg-sidebar-accent data-[status=active]:text-primary">
              <Icon className="size-4" />{label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto hidden min-w-0 items-center gap-4 xl:flex">
          <span className="truncate text-sm text-muted-foreground">{match.homeTeam} vs {match.awayTeam}</span>
          <RecordingStatus />
        </div>
        <ModeIndicator />
      </header>
      {link === "OFFLINE" && (
        <div className="flex items-center gap-3 border-b border-live/40 bg-live/10 px-3 py-1.5 text-sm">
          <span className="font-display font-bold tracking-wider text-live">VIDEO SERVICE OFFLINE</span>
          <span className="text-muted-foreground">The Windows Video Service is not running. Retrying automatically…</span>
          <button onClick={() => void actions.testConnection()} className="ml-auto rounded-sm border border-border px-3 py-1 text-xs font-bold hover:bg-accent">RETRY</button>
        </div>
      )}
      <main className="flex-1">{children}</main>
    </div>
  );
}

export function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-4">
      <h1 className="font-display text-3xl font-bold tracking-wide">{title}</h1>
      {children}
    </div>
  );
}
