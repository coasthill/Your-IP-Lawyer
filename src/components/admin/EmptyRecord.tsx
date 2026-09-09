import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Empty state for dashboard lists: hairlines and serif, no card. */
export function EmptyRecord({ title, body, action, className }: { title: ReactNode; body?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("border-y border-bronze/20 px-4 py-14 text-center", className)}>
      <p className="font-display text-2xl text-ivory">{title}</p>
      {body ? <p className="mx-auto mt-2 max-w-md text-sm text-bone/70">{body}</p> : null}
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}
