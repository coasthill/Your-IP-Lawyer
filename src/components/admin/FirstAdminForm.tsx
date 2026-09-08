"use client";

import { useActionState } from "react";
import { Notice } from "@/components/ui/primitives";
import { idleFormState, type FormState } from "./form-state";

/**
 * First-run setup: shown on /admin/login only while NO admin account exists.
 * Lets the owner create the first account from the browser instead of a terminal.
 */
export function FirstAdminForm({ action }: { action: (prev: FormState, formData: FormData) => Promise<FormState> }) {
  const [state, formAction, pending] = useActionState(action, idleFormState);
  return (
    <form action={formAction} className="space-y-6" noValidate>
      {state.status === "error" ? <Notice tone="error">{state.message}</Notice> : null}
      <div className="space-y-2">
        <label htmlFor="setup-name" className="eyebrow-muted block">
          Your name
        </label>
        <input id="setup-name" name="name" type="text" autoComplete="name" required defaultValue={state.values?.name ?? ""} />
      </div>
      <div className="space-y-2">
        <label htmlFor="setup-email" className="eyebrow-muted block">
          Email
        </label>
        <input id="setup-email" name="email" type="email" autoComplete="username" required defaultValue={state.values?.email ?? ""} spellCheck={false} />
      </div>
      <div className="space-y-2">
        <label htmlFor="setup-password" className="eyebrow-muted block">
          Password
        </label>
        <input id="setup-password" name="password" type="password" autoComplete="new-password" required minLength={12} />
        <p className="text-xs opacity-60">At least 12 characters, with a letter and a number.</p>
      </div>
      <button type="submit" className="btn btn-solid w-full justify-center" disabled={pending} aria-busy={pending || undefined}>
        {pending ? "Creating the account…" : "Create the first admin account"}
      </button>
    </form>
  );
}
