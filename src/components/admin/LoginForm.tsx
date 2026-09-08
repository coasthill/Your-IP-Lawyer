"use client";

import { useActionState } from "react";
import { Notice } from "@/components/ui/primitives";
import { idleFormState, type FormState } from "./form-state";

export function LoginForm({ action, next }: { action: (prev: FormState, formData: FormData) => Promise<FormState>; next: string }) {
  const [state, formAction, pending] = useActionState(action, idleFormState);
  return (
    <form action={formAction} className="space-y-6" noValidate>
      <input type="hidden" name="next" value={state.values?.next ?? next} />
      {state.status === "error" ? <Notice tone="error">{state.message}</Notice> : null}
      <div className="space-y-2">
        <label htmlFor="login-email" className="eyebrow-muted block">
          Email
        </label>
        <input id="login-email" name="email" type="email" autoComplete="username" required defaultValue={state.values?.email ?? ""} spellCheck={false} />
      </div>
      <div className="space-y-2">
        <label htmlFor="login-password" className="eyebrow-muted block">
          Password
        </label>
        <input id="login-password" name="password" type="password" autoComplete="current-password" required />
      </div>
      <button type="submit" className="btn btn-solid w-full justify-center" disabled={pending} aria-busy={pending || undefined}>
        {pending ? "Checking the record…" : "Sign in"}
      </button>
    </form>
  );
}
