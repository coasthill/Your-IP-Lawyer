"use client";

import { useId, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";

/**
 * Two-step destructive action for server-action forms. The first press arms the control and
 * reveals the real submit button plus a cancel; nothing is sent until the second press.
 */
export function ConfirmButton({
  children,
  confirmLabel = "Confirm",
  question = "Are you sure?",
  className,
  size = "sm",
}: {
  children: ReactNode;
  confirmLabel?: ReactNode;
  question?: ReactNode;
  className?: string;
  size?: "sm" | "md";
}) {
  const [armed, setArmed] = useState(false);
  const { pending } = useFormStatus();
  const regionId = useId();

  if (!armed) {
    return (
      <button
        type="button"
        className={cn("btn btn-seal", size === "sm" && "btn-sm", className)}
        aria-expanded={false}
        aria-controls={regionId}
        onClick={() => setArmed(true)}
        disabled={pending}
      >
        {children}
      </button>
    );
  }

  return (
    <span id={regionId} role="group" aria-label={typeof question === "string" ? question : "Confirm"} className="inline-flex flex-wrap items-center gap-2">
      <span className="font-mono text-[0.64rem] uppercase tracking-[0.14em] text-seal">{question}</span>
      <button type="submit" className={cn("btn btn-seal", size === "sm" && "btn-sm")} disabled={pending} aria-busy={pending || undefined} autoFocus>
        {pending ? "Working…" : confirmLabel}
      </button>
      <button type="button" className={cn("btn btn-ghost", size === "sm" && "btn-sm")} onClick={() => setArmed(false)} disabled={pending}>
        Cancel
      </button>
    </span>
  );
}
