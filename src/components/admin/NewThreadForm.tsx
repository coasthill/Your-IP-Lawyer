"use client";

import { useActionState, useId } from "react";
import { Notice } from "@/components/ui/primitives";
import { CheckField, FormField, describedBy } from "./FormBits";
import { idleFormState, type FormState } from "./form-state";

export function NewThreadForm({ action, categories, authorName }: { action: (prev: FormState, formData: FormData) => Promise<FormState>; categories: Array<{ id: string; name: string }>; authorName: string }) {
  const [state, formAction, pending] = useActionState(action, idleFormState);
  const uid = useId();
  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const v = state.values ?? {};

  return (
    <form action={formAction} className="space-y-6" noValidate>
      {state.status === "error" ? <Notice tone="error">{state.message}</Notice> : null}
      <FormField label="Title" htmlFor={`${uid}-title`} required error={errors.title}>
        <input id={`${uid}-title`} name="title" defaultValue={v.title ?? ""} maxLength={140} className="font-display text-xl" aria-invalid={Boolean(errors.title) || undefined} aria-describedby={describedBy(`${uid}-title`, errors.title)} />
      </FormField>
      <FormField label="Opening post" htmlFor={`${uid}-body`} required error={errors.body} hint="Plain text. **bold**, _italic_, `code` and > quotes are supported.">
        <textarea id={`${uid}-body`} name="body" rows={8} defaultValue={v.body ?? ""} maxLength={8000} aria-invalid={Boolean(errors.body) || undefined} aria-describedby={describedBy(`${uid}-body`, errors.body, true)} />
      </FormField>
      <div className="grid gap-6 md:grid-cols-3">
        <FormField label="Category" htmlFor={`${uid}-cat`} error={errors.categoryId}>
          <select id={`${uid}-cat`} name="categoryId" defaultValue={v.categoryId ?? ""}>
            <option value="">— none —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Tags" htmlFor={`${uid}-tags`} hint="Comma-separated.">
          <input id={`${uid}-tags`} name="tags" defaultValue={v.tags ?? ""} maxLength={400} />
        </FormField>
        <FormField label="Posted as" htmlFor={`${uid}-author`}>
          <input id={`${uid}-author`} name="authorName" defaultValue={v.authorName ?? authorName} maxLength={60} />
        </FormField>
      </div>
      <CheckField id={`${uid}-pinned`} name="pinned" label="Pin to the top of the forum" defaultChecked={v.pinned === "on"} />
      <button type="submit" className="btn btn-solid btn-sm" disabled={pending} aria-busy={pending || undefined}>
        {pending ? "Opening…" : "Open the discussion"}
      </button>
    </form>
  );
}
