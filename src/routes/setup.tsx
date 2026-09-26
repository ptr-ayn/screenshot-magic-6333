import { useState, type FormEvent } from "react";
import { Field, inputCls } from "@/components/operator/Field";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { actions, getOperator } from "@/lib/operator-store";
import { PageHeader } from "@/components/operator/AppShell";
import { PERIOD_LABEL, type Period } from "@/types/models";

export const Route = createFileRoute("/setup")({
  head: () => ({
    meta: [
      { title: "Match Setup — Futsal Video Support" },
      { name: "description", content: "Create a futsal match: competition, teams, venue, date and period." },
      { property: "og:title", content: "Match Setup — Futsal Video Support" },
      { property: "og:description", content: "Create a futsal match before going live." },
    ],
  }),
  component: SetupPage,
});

function SetupPage() {
  const navigate = useNavigate();
  const [f, setF] = useState(() => {
    const { id: _id, status: _s, ...m } = getOperator().match;
    return m;
  });
  const bind = (k: keyof typeof f) => ({ value: f[k], onChange: (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value }) });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!f.homeTeam.trim() || !f.awayTeam.trim()) { toast.error("Home and away team are required"); return; }
    actions.createMatch(f);
    toast.success("Match created");
    navigate({ to: "/live" });
  };

  return (
    <div className="mx-auto max-w-3xl p-4">
      <PageHeader title="Match Setup" />
      <form onSubmit={submit} className="grid gap-4 rounded-sm border border-border bg-card p-5 sm:grid-cols-2">
        <div className="sm:col-span-2"><Field label="Competition"><input className={inputCls} {...bind("competition")} /></Field></div>
        <Field label="Home team"><input className={inputCls} {...bind("homeTeam")} required /></Field>
        <Field label="Away team"><input className={inputCls} {...bind("awayTeam")} required /></Field>
        <Field label="Match date"><input type="date" className={inputCls} {...bind("date")} /></Field>
        <Field label="Match time"><input type="time" className={inputCls} {...bind("time")} /></Field>
        <Field label="Venue"><input className={inputCls} {...bind("venue")} /></Field>
        <Field label="Match number"><input className={inputCls} {...bind("matchNumber")} /></Field>
        <Field label="Half / period">
          <select className={inputCls} value={f.period} onChange={(e) => setF({ ...f, period: e.target.value as Period })}>
            {(Object.keys(PERIOD_LABEL) as Period[]).map((p) => <option key={p} value={p}>{PERIOD_LABEL[p]}</option>)}
          </select>
        </Field>
        <div className="flex items-end justify-end gap-2 sm:col-span-2">
          <button type="button" onClick={() => navigate({ to: "/" })} className="h-12 rounded-sm border border-border px-6 font-display text-lg font-bold">CANCEL</button>
          <button type="submit" className="h-12 rounded-sm bg-primary px-8 font-display text-lg font-bold text-primary-foreground">CREATE MATCH</button>
        </div>
      </form>
    </div>
  );
}
