"use client";

import { useActionState, useId } from "react";
import { Notice } from "@/components/ui/primitives";
import { FormField, describedBy } from "./FormBits";
import { idleFormState, type FormState } from "./form-state";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

export function AddAdminForm({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState(action, idleFormState);
  const uid = useId();
  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const v = state.values ?? {};
  return (
    <form action={formAction} className="plate space-y-5 p-6" noValidate>
      {state.status === "error" ? <Notice tone="error">{state.message}</Notice> : null}
      {state.status === "success" ? <Notice tone="success">{state.message}</Notice> : null}
      <FormField label="Name" htmlFor={`${uid}-name`} required error={errors.name}>
        <input id={`${uid}-name`} name="name" defaultValue={v.name ?? ""} maxLength={80} autoComplete="off" aria-invalid={Boolean(errors.name) || undefined} aria-describedby={describedBy(`${uid}-name`, errors.name)} />
      </FormField>
      <FormField label="Email" htmlFor={`${uid}-email`} required error={errors.email}>
        <input id={`${uid}-email`} name="email" type="email" defaultValue={v.email ?? ""} maxLength={200} autoComplete="off" spellCheck={false} aria-invalid={Boolean(errors.email) || undefined} aria-describedby={describedBy(`${uid}-email`, errors.email)} />
      </FormField>
      <FormField label="Password" htmlFor={`${uid}-password`} required error={errors.password} hint="At least 12 characters, with a letter and a number.">
        <input id={`${uid}-password`} name="password" type="password" autoComplete="new-password" aria-invalid={Boolean(errors.password) || undefined} aria-describedby={describedBy(`${uid}-password`, errors.password, true)} />
      </FormField>
      <FormField label="Confirm password" htmlFor={`${uid}-confirm`} required error={errors.confirm}>
        <input id={`${uid}-confirm`} name="confirm" type="password" autoComplete="new-password" aria-invalid={Boolean(errors.confirm) || undefined} aria-describedby={describedBy(`${uid}-confirm`, errors.confirm)} />
      </FormField>
      <button type="submit" className="btn btn-solid btn-sm" disabled={pending} aria-busy={pending || undefined}>
        {pending ? "Adding…" : "Add admin"}
      </button>
    </form>
  );
}

export function ChangePasswordForm({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState(action, idleFormState);
  const uid = useId();
  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  return (
    <form action={formAction} className="plate space-y-5 p-6" noValidate>
      {state.status === "error" ? <Notice tone="error">{state.message}</Notice> : null}
      {state.status === "success" ? <Notice tone="success">{state.message}</Notice> : null}
      <FormField label="Current password" htmlFor={`${uid}-current`} required error={errors.current}>
        <input id={`${uid}-current`} name="current" type="password" autoComplete="current-password" aria-invalid={Boolean(errors.current) || undefined} aria-describedby={describedBy(`${uid}-current`, errors.current)} />
      </FormField>
      <FormField label="New password" htmlFor={`${uid}-password`} required error={errors.password} hint="At least 12 characters, with a letter and a number.">
        <input id={`${uid}-password`} name="password" type="password" autoComplete="new-password" aria-invalid={Boolean(errors.password) || undefined} aria-describedby={describedBy(`${uid}-password`, errors.password, true)} />
      </FormField>
      <FormField label="Confirm new password" htmlFor={`${uid}-confirm`} required error={errors.confirm}>
        <input id={`${uid}-confirm`} name="confirm" type="password" autoComplete="new-password" aria-invalid={Boolean(errors.confirm) || undefined} aria-describedby={describedBy(`${uid}-confirm`, errors.confirm)} />
      </FormField>
      <button type="submit" className="btn btn-solid btn-sm" disabled={pending} aria-busy={pending || undefined}>
        {pending ? "Changing…" : "Change password"}
      </button>
    </form>
  );
}
