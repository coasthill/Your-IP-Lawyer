"use client";

import { useActionState, useId, useState } from "react";
import { reportForumContent } from "@/app/(site)/forum/[slug]/actions";
import type { ReportState } from "./types";

const initialState: ReportState = { status: "idle" };

/** Two-step "Report" control for a thread or a reply: a text link, then an inline confirmation with an optional reason. */
export function ReportButton({ targetType, targetId, threadSlug }: { targetType: "thread" | "reply"; targetId: string; threadSlug: string }) {
  const [state, formAction, pending] = useActionState(reportForumContent, initialState);
  const [confirming, setConfirming] = useState(false);
  const id = useId();
  const noun = targetType === "thread" ? "discussion" : "reply";

  if (state.status === "done") {
    return (
      <p role="status" className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-ash">
        Reported. Thank you.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        className="btn btn-sm btn-ghost text-slate hover:text-ink"
        aria-expanded={confirming}
        aria-controls={`${id}-confirm`}
        onClick={() => setConfirming((v) => !v)}
      >
        {confirming ? "Cancel" : "Report"}
      </button>
      <div id={`${id}-confirm`} hidden={!confirming} className="w-full sm:w-auto">
        {confirming ? (
          <form action={formAction} className="flex flex-wrap items-center gap-3 border-l-2 border-seal/60 pl-4">
            <input type="hidden" name="targetType" value={targetType} />
            <input type="hidden" name="targetId" value={targetId} />
            <input type="hidden" name="threadSlug" value={threadSlug} />
            <p className="w-full text-xs text-graphite sm:w-auto">Report this {noun} to the moderator?</p>
            <label htmlFor={`${id}-reason`} className="sr-only">
              Reason (optional)
            </label>
            <input id={`${id}-reason`} name="reason" type="text" maxLength={300} placeholder="Reason (optional)" className="w-full max-w-full py-1.5 text-xs sm:w-56" />
            <button type="submit" className="btn btn-sm btn-seal" disabled={pending}>
              {pending ? "Sending…" : "Confirm report"}
            </button>
            {state.status === "error" ? (
              <p role="alert" className="w-full text-xs text-seal">
                {state.error}
              </p>
            ) : null}
          </form>
        ) : null}
      </div>
    </div>
  );
}
