import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Empty state for dashboard lists: hairlines and serif, no card. */
export function EmptyRecord({ title, body, action, className }: { title: ReactNode; body?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("border-y px-4 py-14 text-center", className)}>
      <p className="font-display text-2xl text-ink">{title}</p>
      {body ? <p className="mx-auto mt-2 max-w-md text-sm text-slate">{body}</p> : null}
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}
