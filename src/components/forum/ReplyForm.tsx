"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { submitReply } from "@/app/(site)/forum/[slug]/actions";
import { Button, Field, Honeypot, Notice } from "@/components/ui/primitives";
import { Turnstile } from "@/components/ui/Turnstile";
import { cn } from "@/lib/utils";
import { REPLY_BODY_MAX } from "./format";
import type { ReplyFormState } from "./types";

const initialState: ReplyFormState = { status: "idle" };
const nf = new Intl.NumberFormat("en-IN");

export function ReplyForm({
  threadId,
  threadSlug,
  parentId = null,
  replyingTo,
  onCancel,
  focusOnMount = false,
}: {
  threadId: string;
  threadSlug: string;
  parentId?: string | null;
  replyingTo?: string;
  onCancel?: () => void;
  /** Move keyboard focus into the form when it appears (inline replies). */
  focusOnMount?: boolean;
}) {
  const [state, formAction, pending] = useActionState(submitReply, initialState);
  const id = useId();
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [body, setBody] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (focusOnMount) bodyRef.current?.focus();
  }, [focusOnMount]);

  if (state.status === "approved" || state.status === "pending") {
    const approved = state.status === "approved";
    return (
      <div role="status" className="plate px-6 py-6">
        <p className="font-display text-2xl text-ink">{approved ? "Filed. Thank you." : "Received."}</p>
        <p className="mt-2 text-sm text-slate">{approved ? "Your reply is on the record." : "Replies are reviewed before they appear."}</p>
        {onCancel ? (
          <Button type="button" size="sm" className="mt-5" onClick={onCancel}>
            Close
          </Button>
        ) : null}
      </div>
    );
  }

  const remaining = REPLY_BODY_MAX - body.length;

  return (
    <form action={formAction} className="relative space-y-6" aria-describedby={`${id}-note`}>
      <input type="hidden" name="threadId" value={threadId} />
      <input type="hidden" name="threadSlug" value={threadSlug} />
      {parentId ? <input type="hidden" name="parentId" value={parentId} /> : null}
      <Honeypot />

      {replyingTo ? <p className="eyebrow-muted">Replying to {replyingTo}</p> : null}

      <Field
        label="Reply"
        htmlFor={`${id}-body`}
        required
        hint={
          <span className="flex flex-wrap justify-between gap-x-6 gap-y-1">
            <span>Plain text. **bold**, _italic_ and &gt; quotes are understood; links may hold the reply for review.</span>
            <span aria-live="polite" className={cn("font-mono tabular-nums", remaining < 200 ? "text-seal" : "text-ash")}>
              {nf.format(body.length)} / {nf.format(REPLY_BODY_MAX)}
            </span>
          </span>
        }
      >
        <textarea
          ref={bodyRef}
          id={`${id}-body`}
          name="body"
          required
          minLength={3}
          maxLength={REPLY_BODY_MAX}
          rows={parentId ? 4 : 7}
          placeholder={parentId ? "Your reply" : "Your contribution to the argument"}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="leading-relaxed"
        />
      </Field>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Name" htmlFor={`${id}-name`} hint="Optional. Left blank, you appear as “Guest Contributor”.">
          <input id={`${id}-name`} name="name" type="text" maxLength={60} autoComplete="name" placeholder="Your name, or a pseudonym" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Email" htmlFor={`${id}-email`} hint="Optional. Never shown.">
          <input id={`${id}-email`} name="email" type="email" maxLength={120} autoComplete="email" placeholder="you@example.in" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
      </div>

      <Turnstile />

      {state.status === "error" ? <Notice tone="error">{state.error}</Notice> : null}

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" variant="solid" disabled={pending}>
          {pending ? "Filing…" : "File reply"}
        </Button>
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
        ) : null}
        <p id={`${id}-note`} className="text-xs text-ash">
          Replies may be held for moderation before they appear.
        </p>
      </div>
    </form>
  );
}
