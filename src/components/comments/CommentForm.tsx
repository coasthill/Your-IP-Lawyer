"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import { submitComment } from "@/app/(site)/blog/[slug]/actions";
import { Button, Field, Honeypot, Notice } from "@/components/ui/primitives";
import { Turnstile } from "@/components/ui/Turnstile";
import type { CommentFormState } from "./types";

const initialState: CommentFormState = { status: "idle" };

export function CommentForm({
  postId,
  postSlug,
  parentId = null,
  replyingTo,
  onCancel,
  focusOnMount = false,
}: {
  postId: string;
  postSlug: string;
  parentId?: string | null;
  replyingTo?: string;
  onCancel?: () => void;
  /** Move keyboard focus into the form when it appears (inline replies). */
  focusOnMount?: boolean;
}) {
  const [state, formAction, pending] = useActionState(submitComment, initialState);
  const id = useId();
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (focusOnMount) nameRef.current?.focus();
  }, [focusOnMount]);

  if (state.status === "approved" || state.status === "pending") {
    const approved = state.status === "approved";
    return (
      <div role="status" className="plate px-6 py-6">
        <p className="font-display text-2xl text-ivory">{approved ? "Filed. Thank you." : "Received."}</p>
        <p className="mt-2 text-sm text-bone">{approved ? "Your comment is on the record." : "Comments are reviewed before they appear."}</p>
        {onCancel ? (
          <Button type="button" size="sm" className="mt-5" onClick={onCancel}>
            Close
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <form action={formAction} className="relative space-y-6" aria-describedby={`${id}-note`}>
      <input type="hidden" name="postId" value={postId} />
      <input type="hidden" name="postSlug" value={postSlug} />
      {parentId ? <input type="hidden" name="parentId" value={parentId} /> : null}
      <Honeypot />

      {replyingTo ? <p className="eyebrow-muted">Replying to {replyingTo}</p> : null}

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Name" htmlFor={`${id}-name`} required>
          <input ref={nameRef} id={`${id}-name`} name="name" type="text" required minLength={2} maxLength={60} autoComplete="name" placeholder="Your name, or a pseudonym" />
        </Field>
        <Field label="Email" htmlFor={`${id}-email`} hint="Optional. Never shown.">
          <input id={`${id}-email`} name="email" type="email" maxLength={120} autoComplete="email" placeholder="you@example.in" />
        </Field>
      </div>

      <Field label="Comment" htmlFor={`${id}-body`} required hint="Plain text. **bold**, _italic_ and > quotes are understood; links are allowed but may hold the comment for review.">
        <textarea id={`${id}-body`} name="body" required minLength={3} maxLength={4000} rows={parentId ? 4 : 6} placeholder={parentId ? "Your reply" : "Your comment"} />
      </Field>

      <Turnstile />

      {state.status === "error" ? <Notice tone="error">{state.error}</Notice> : null}

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" variant="solid" disabled={pending}>
          {pending ? "Filing…" : parentId ? "File reply" : "File comment"}
        </Button>
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
        ) : null}
        <p id={`${id}-note`} className="text-xs text-bone/70">
          Comments may be held for moderation before they appear.
        </p>
      </div>
    </form>
  );
}
