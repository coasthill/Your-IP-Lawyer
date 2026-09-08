"use client";

import { useActionState, useId, useState } from "react";
import { submitSubmission } from "@/app/(site)/submission-guidelines/actions";
import { Button, Field, Honeypot, Notice } from "@/components/ui/primitives";
import { Turnstile } from "@/components/ui/Turnstile";
import { siteConfig } from "@/config/site";
import { ABSTRACT_MAX, ABSTRACT_MIN, SUBMISSION_KIND_OPTIONS, type SubmissionFormState } from "./types";

const initialState: SubmissionFormState = { status: "idle" };
const ACCEPT = ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function formatMb(bytes: number): string {
  const mb = bytes / 1024 / 1024;
  return `${mb >= 10 ? Math.round(mb) : Math.round(mb * 10) / 10} MB`;
}

/**
 * The submission form. Uncontrolled inputs, a server action through useActionState, and a
 * client-side wrapper so transport failures (a file over the request limit, a dropped
 * connection) become an inline notice instead of an error page.
 */
export function SubmissionForm({ maxFileBytes }: { maxFileBytes: number }) {
  const id = useId();
  const [state, formAction, pending] = useActionState(async (prev: SubmissionFormState, formData: FormData): Promise<SubmissionFormState> => {
    try {
      return await submitSubmission(prev, formData);
    } catch {
      const values = {
        name: String(formData.get("name") ?? ""),
        email: String(formData.get("email") ?? ""),
        affiliation: String(formData.get("affiliation") ?? ""),
        title: String(formData.get("title") ?? ""),
        kind: String(formData.get("kind") ?? "article"),
        abstract: String(formData.get("abstract") ?? ""),
      };
      return {
        status: "error",
        error: `The submission could not be sent. If you attached a file, it may be too large for this form; try again without it, or email it to ${siteConfig.submissionsEmail}.`,
        values,
      };
    }
  }, initialState);

  const values = state.status === "error" ? state.values : undefined;
  const [abstractLength, setAbstractLength] = useState(values?.abstract.length ?? 0);
  const [fileNote, setFileNote] = useState<string | null>(null);

  if (state.status === "received") {
    return (
      <div role="status" className="plate px-8 py-10">
        <p className="eyebrow">Filed</p>
        <p className="display-sm mt-3">Received. Counsel will revert.</p>
        <p className="mt-4 max-w-md text-sm text-bone">
          Your submission is on the record. You will hear from us at the address you gave; if a fortnight passes in silence, a polite reminder to{" "}
          <a href={`mailto:${siteConfig.submissionsEmail}`} className="link-underline text-ivory">
            {siteConfig.submissionsEmail}
          </a>{" "}
          is entirely in order.
        </p>
      </div>
    );
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const file = input.files?.[0];
    if (!file) {
      input.setCustomValidity("");
      setFileNote(null);
      return;
    }
    if (file.size > maxFileBytes) {
      input.setCustomValidity(`The file is too large (max ${formatMb(maxFileBytes)}).`);
      setFileNote(`${file.name} is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is ${formatMb(maxFileBytes)}.`);
      return;
    }
    input.setCustomValidity("");
    setFileNote(`${file.name} · ${(file.size / 1024).toFixed(0)} KB`);
  }

  return (
    <form action={formAction} className="relative space-y-7" aria-describedby={`${id}-note`} noValidate={false}>
      <Honeypot />

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Name" htmlFor={`${id}-name`} required>
          <input id={`${id}-name`} name="name" type="text" required minLength={2} maxLength={80} autoComplete="name" defaultValue={values?.name ?? ""} placeholder="As it should appear in print" />
        </Field>
        <Field label="Email" htmlFor={`${id}-email`} required hint="For the reply. Never published.">
          <input id={`${id}-email`} name="email" type="email" required maxLength={120} autoComplete="email" defaultValue={values?.email ?? ""} placeholder="you@example.in" />
        </Field>
      </div>

      <Field label="Affiliation" htmlFor={`${id}-affiliation`} hint="Optional. Firm, chambers, university, or none.">
        <input id={`${id}-affiliation`} name="affiliation" type="text" maxLength={120} autoComplete="organization" defaultValue={values?.affiliation ?? ""} placeholder="Where you practise or study" />
      </Field>

      <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_14rem]">
        <Field label="Title" htmlFor={`${id}-title`} required>
          <input id={`${id}-title`} name="title" type="text" required minLength={5} maxLength={200} defaultValue={values?.title ?? ""} placeholder="A working title is fine" />
        </Field>
        <Field label="Kind" htmlFor={`${id}-kind`} required>
          <select id={`${id}-kind`} name="kind" required defaultValue={values?.kind ?? "article"}>
            {SUBMISSION_KIND_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field
        label="Abstract"
        htmlFor={`${id}-abstract`}
        required
        hint={
          <span className="flex flex-wrap justify-between gap-x-4">
            <span>
              What the piece argues, in a paragraph or two. {ABSTRACT_MIN}–{ABSTRACT_MAX} characters.
            </span>
            <span className="font-mono tabular-nums" aria-live="polite">
              {abstractLength}/{ABSTRACT_MAX}
            </span>
          </span>
        }
      >
        <textarea
          id={`${id}-abstract`}
          name="abstract"
          required
          minLength={ABSTRACT_MIN}
          maxLength={ABSTRACT_MAX}
          rows={7}
          defaultValue={values?.abstract ?? ""}
          onChange={(e) => setAbstractLength(e.currentTarget.value.length)}
          placeholder="The question, the answer you propose, and why a reader should care."
        />
      </Field>

      <Field label="Manuscript" htmlFor={`${id}-file`} hint={fileNote ?? `Optional. .pdf, .doc or .docx, up to ${formatMb(maxFileBytes)}. You can also send it by email later.`}>
        <input
          id={`${id}-file`}
          name="file"
          type="file"
          accept={ACCEPT}
          onChange={onFileChange}
          className="file:mr-4 file:cursor-pointer file:border-0 file:border-r file:border-bronze/30 file:bg-transparent file:pr-4 file:font-mono file:text-[0.66rem] file:uppercase file:tracking-[0.18em] file:text-bronze-2"
        />
      </Field>

      <Turnstile />

      {state.status === "error" ? <Notice tone="error">{state.error}</Notice> : null}

      <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
        <Button type="submit" variant="solid" disabled={pending}>
          {pending ? "Filing…" : "File submission"}
        </Button>
        <p id={`${id}-note`} className="max-w-md text-xs leading-relaxed text-bone/70">
          Submissions are stored securely and read by the editor. Nothing is published without your agreement.
        </p>
      </div>
    </form>
  );
}
