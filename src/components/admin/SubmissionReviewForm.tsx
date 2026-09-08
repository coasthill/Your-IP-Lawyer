"use client";

import { useActionState, useId } from "react";
import { Notice } from "@/components/ui/primitives";
import { FormField } from "./FormBits";
import { idleFormState, type FormState } from "./form-state";

const STATUSES: Array<[string, string]> = [
  ["new", "New — not yet looked at"],
  ["reviewing", "Reviewing"],
  ["accepted", "Accepted"],
  ["declined", "Declined"],
];

export function SubmissionReviewForm({ action, status, adminNotes }: { action: (prev: FormState, formData: FormData) => Promise<FormState>; status: string; adminNotes: string }) {
  const [state, formAction, pending] = useActionState(action, idleFormState);
  const uid = useId();

  return (
    <form action={formAction} className="space-y-6" noValidate>
      {state.status === "error" ? <Notice tone="error">{state.message}</Notice> : null}
      {state.status === "success" ? <Notice tone="success">{state.message}</Notice> : null}
      <FormField label="Status" htmlFor={`${uid}-status`}>
        <select id={`${uid}-status`} name="status" defaultValue={status}>
          {STATUSES.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </FormField>
      <FormField label="Private notes" htmlFor={`${uid}-notes`} hint="For you and other admins only. The author never sees these.">
        <textarea id={`${uid}-notes`} name="adminNotes" rows={6} defaultValue={adminNotes} maxLength={4000} />
      </FormField>
      <button type="submit" className="btn btn-solid btn-sm" disabled={pending} aria-busy={pending || undefined}>
        {pending ? "Saving…" : "Save review"}
      </button>
    </form>
  );
}
