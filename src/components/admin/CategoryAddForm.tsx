"use client";

import { useActionState, useId } from "react";
import { Notice } from "@/components/ui/primitives";
import { FormField, describedBy } from "./FormBits";
import { idleFormState, type FormState } from "./form-state";

export function CategoryAddForm({ action }: { action: (prev: FormState, formData: FormData) => Promise<FormState> }) {
  const [state, formAction, pending] = useActionState(action, idleFormState);
  const uid = useId();
  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state.status === "error" ? <Notice tone="error">{state.message}</Notice> : null}
      {state.status === "success" ? <Notice tone="success">{state.message}</Notice> : null}
      <div className="grid gap-5 md:grid-cols-[1fr_1fr_10rem]">
        <FormField label="Name" htmlFor={`${uid}-name`} required error={errors.name} hint="The address (slug) is made from the name.">
          <input id={`${uid}-name`} name="name" defaultValue={state.values?.name ?? ""} maxLength={80} aria-invalid={Boolean(errors.name) || undefined} aria-describedby={describedBy(`${uid}-name`, errors.name, true)} />
        </FormField>
        <FormField label="Description" htmlFor={`${uid}-desc`}>
          <input id={`${uid}-desc`} name="description" defaultValue={state.values?.description ?? ""} maxLength={300} />
        </FormField>
        <FormField label="Scope" htmlFor={`${uid}-scope`}>
          <select id={`${uid}-scope`} name="scope" defaultValue={state.values?.scope ?? "both"}>
            <option value="both">Blog and forum</option>
            <option value="blog">Blog only</option>
            <option value="forum">Forum only</option>
          </select>
        </FormField>
      </div>
      <button type="submit" className="btn btn-sm" disabled={pending} aria-busy={pending || undefined}>
        {pending ? "Adding…" : "Add category"}
      </button>
    </form>
  );
}
