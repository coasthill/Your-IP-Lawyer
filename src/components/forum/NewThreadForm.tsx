"use client";

import Link from "next/link";
import { useActionState, useId, useState } from "react";
import { submitThread } from "@/app/(site)/forum/new/actions";
import { Button, Field, Honeypot, Notice } from "@/components/ui/primitives";
import { Turnstile } from "@/components/ui/Turnstile";
import { cn } from "@/lib/utils";
import { MAX_TAGS, THREAD_BODY_MAX, splitTags } from "./format";
import type { CategoryOption, ThreadFormState } from "./types";

const initialState: ThreadFormState = { status: "idle" };

const COPY = {
  discussion: {
    titlePlaceholder: "A precise title. The point in one line.",
    bodyPlaceholder:
      "Set out the point. What is the question, which facts matter, what have you already read on it? Be as specific as a pleading and as readable as a letter.",
    submit: "Start the discussion",
    pending: "Filing…",
  },
  question: {
    titlePlaceholder: "The question, as you would put it to a senior.",
    bodyPlaceholder:
      "Ask it the way you would ask a senior in chambers: what you are trying to work out, what you have already tried, and where exactly you got stuck. Facts help; names of parties do not.",
    submit: "Ask the question",
    pending: "Filing…",
  },
} as const;

const nf = new Intl.NumberFormat("en-IN");

/**
 * The form to open a discussion. Fields are controlled so a validation error from the server
 * never costs the author an eight-thousand-character argument.
 */
export function NewThreadForm({ categories, kind = "discussion" }: { categories: CategoryOption[]; kind?: "discussion" | "question" }) {
  const [state, formAction, pending] = useActionState(submitThread, initialState);
  const id = useId();
  const copy = COPY[kind];

  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState(kind === "question" ? "question" : "");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const tagList = splitTags(tags);
  const tooManyTags = tagList.length > MAX_TAGS;
  const remaining = THREAD_BODY_MAX - body.length;

  if (state.status === "pending") {
    return (
      <div role="status" className="plate px-6 py-8 sm:px-8">
        <p className="eyebrow">Filed</p>
        <p className="mt-3 font-display text-3xl text-ink">Received.</p>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-slate">
          Discussions are reviewed before they appear. Yours is in the queue; it will be on the record once a moderator has read it.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/forum" className="btn btn-sm">
            Back to the record
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="relative space-y-8" aria-describedby={`${id}-note`}>
      <Honeypot />

      <Field label="Title" htmlFor={`${id}-title`} required hint="At least 8 characters, at most 140.">
        <input
          id={`${id}-title`}
          name="title"
          type="text"
          required
          minLength={8}
          maxLength={140}
          autoComplete="off"
          placeholder={copy.titlePlaceholder}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="font-display text-xl md:text-2xl"
        />
      </Field>

      <Field label="Category" htmlFor={`${id}-category`} hint="Optional. Where the discussion sits in the record.">
        <select id={`${id}-category`} name="categoryId" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">General — no particular category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>

      <Field
        label={kind === "question" ? "The question" : "Description"}
        htmlFor={`${id}-body`}
        required
        hint={
          <span className="flex flex-wrap justify-between gap-x-6 gap-y-1">
            <span>
              Plain text. <strong className="font-medium text-ink">**bold**</strong>, <em>_italic_</em>, <span className="font-mono">&gt;</span> quotes and links are understood. Links may
              hold the discussion for review.
            </span>
            <span aria-live="polite" className={cn("font-mono tabular-nums", remaining < 200 ? "text-seal" : "text-ash")}>
              {nf.format(body.length)} / {nf.format(THREAD_BODY_MAX)}
            </span>
          </span>
        }
      >
        <textarea
          id={`${id}-body`}
          name="body"
          required
          minLength={20}
          maxLength={THREAD_BODY_MAX}
          rows={12}
          placeholder={copy.bodyPlaceholder}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="leading-relaxed"
        />
      </Field>

      <Field
        label="Tags"
        htmlFor={`${id}-tags`}
        hint={
          <span className="flex flex-wrap justify-between gap-x-6 gap-y-1">
            <span>Optional. Comma-separated, up to {MAX_TAGS}. Example: passing off, interim injunction, Delhi High Court.</span>
            <span className={cn("font-mono tabular-nums", tooManyTags ? "text-seal" : "text-ash")}>
              {tagList.length} / {MAX_TAGS}
            </span>
          </span>
        }
      >
        <input
          id={`${id}-tags`}
          name="tags"
          type="text"
          maxLength={400}
          autoComplete="off"
          placeholder="passing off, interim injunction"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          aria-invalid={tooManyTags || undefined}
        />
      </Field>

      <div className="grid gap-8 sm:grid-cols-2">
        <Field label="Your name" htmlFor={`${id}-name`} hint="Optional. Left blank, you appear as “Guest Contributor”.">
          <input
            id={`${id}-name`}
            name="name"
            type="text"
            maxLength={60}
            autoComplete="name"
            placeholder="Your name, or a pseudonym"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label="Email" htmlFor={`${id}-email`} hint="Optional. Never shown, never shared.">
          <input
            id={`${id}-email`}
            name="email"
            type="email"
            maxLength={120}
            autoComplete="email"
            placeholder="you@example.in"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
      </div>

      <Turnstile />

      {state.status === "error" ? <Notice tone="error">{state.error}</Notice> : null}
      {tooManyTags ? (
        <Notice tone="info">
          Only the first {MAX_TAGS} tags will be kept. Trim the list if the order matters.
        </Notice>
      ) : null}

      <div className="flex flex-wrap items-center gap-x-6 gap-y-4 border-t pt-8">
        <Button type="submit" variant="solid" disabled={pending}>
          {pending ? copy.pending : copy.submit}
        </Button>
        <p id={`${id}-note`} className="max-w-sm text-xs leading-relaxed text-ash">
          Clean posts appear at once. Anything with links or heat may be held for a moderator first.
        </p>
      </div>
    </form>
  );
}
