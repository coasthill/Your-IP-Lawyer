"use client";

import { useActionState, useId } from "react";
import { Notice } from "@/components/ui/primitives";
import { FormField, describedBy } from "./FormBits";
import { idleFormState, type FormState } from "./form-state";

export function DocumentUploadForm({ action, limits }: { action: (prev: FormState, formData: FormData) => Promise<FormState>; limits: { imageMb: number; docMb: number } }) {
  const [state, formAction, pending] = useActionState(action, idleFormState);
  const uid = useId();
  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};

  return (
    <form action={formAction} className="space-y-6" noValidate>
      {state.status === "error" ? <Notice tone="error">{state.message}</Notice> : null}
      {state.status === "success" ? <Notice tone="success">{state.message}</Notice> : null}

      <div className="grid gap-6 md:grid-cols-2">
        <FormField label="File" htmlFor={`${uid}-file`} required error={errors.file} hint={`Images (JPG, PNG, WebP, AVIF, GIF) up to ${limits.imageMb} MB; PDF or Word up to ${limits.docMb} MB. Files are checked by their content, not just their name.`}>
          <input
            id={`${uid}-file`}
            name="file"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif,image/gif,application/pdf,.pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="text-sm file:mr-3 file:border file:border-bronze/40 file:bg-transparent file:px-3 file:py-1.5 file:font-mono file:text-[0.62rem] file:uppercase file:tracking-[0.16em] file:text-ivory"
            aria-invalid={Boolean(errors.file) || undefined}
            aria-describedby={describedBy(`${uid}-file`, errors.file, true)}
          />
        </FormField>
        <FormField label="Title" htmlFor={`${uid}-title`} hint="Optional. Shown in the library and as the document name on the site.">
          <input id={`${uid}-title`} name="title" defaultValue={state.values?.title ?? ""} maxLength={200} />
        </FormField>
        <FormField label="Alt text" htmlFor={`${uid}-alt`} hint="For images: a short description for readers who cannot see it.">
          <input id={`${uid}-alt`} name="altText" defaultValue={state.values?.altText ?? ""} maxLength={300} />
        </FormField>
        <FormField label="Description" htmlFor={`${uid}-desc`} hint="Optional note for your own reference.">
          <input id={`${uid}-desc`} name="description" defaultValue={state.values?.description ?? ""} maxLength={500} />
        </FormField>
      </div>

      <button type="submit" className="btn btn-solid btn-sm" disabled={pending} aria-busy={pending || undefined}>
        {pending ? "Uploading…" : "Upload"}
      </button>
    </form>
  );
}
