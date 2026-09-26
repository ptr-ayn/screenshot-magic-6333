import type { ReactNode } from "react";

export const inputCls = "h-11 w-full rounded-sm border border-input bg-background px-3 text-base focus:border-primary outline-hidden";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block"><span className="mb-1 block text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</span>{children}</label>;
}
