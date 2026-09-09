"use client";

import { useActionState, useId, useState } from "react";
import { reportComment } from "@/app/(site)/blog/[slug]/actions";
import type { ReportState } from "./types";

const initialState: ReportState = { status: "idle" };

/** Two-step "Report" control: a text link, then an inline confirmation with an optional reason. */
export function ReportButton({ commentId, postSlug }: { commentId: string; postSlug: string }) {
  const [state, formAction, pending] = useActionState(reportComment, initialState);
  const [confirming, setConfirming] = useState(false);
  const id = useId();

  if (state.status === "done") {
    return (
      <p role="status" className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-bone/70">
        Reported. Thank you.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        className="link-underline font-mono text-[0.62rem] uppercase tracking-[0.18em] text-ash transition-colors hover:text-bone"
        aria-expanded={confirming}
        aria-controls={`${id}-confirm`}
        onClick={() => setConfirming((v) => !v)}
      >
        {confirming ? "Cancel" : "Report"}
      </button>
      <div id={`${id}-confirm`} hidden={!confirming} className="w-full sm:w-auto">
        {confirming ? (
          <form action={formAction} className="flex flex-wrap items-center gap-3 border-l-2 border-seal-2/60 pl-4">
            <input type="hidden" name="commentId" value={commentId} />
            <input type="hidden" name="postSlug" value={postSlug} />
            <p className="w-full text-xs text-bone sm:w-auto">Report this comment to the moderator?</p>
            <label htmlFor={`${id}-reason`} className="sr-only">
              Reason (optional)
            </label>
            <input id={`${id}-reason`} name="reason" type="text" maxLength={300} placeholder="Reason (optional)" className="w-full max-w-full py-1.5 text-xs sm:w-56" />
            <button type="submit" className="btn btn-sm btn-seal" disabled={pending}>
              {pending ? "Sending…" : "Confirm report"}
            </button>
            {state.status === "error" ? (
              <p role="alert" className="w-full text-xs text-seal-2">
                {state.error}
              </p>
            ) : null}
          </form>
        ) : null}
      </div>
    </div>
  );
}
