/**
 * Shared shape for server-action results consumed by `useActionState`.
 * Kept free of server-only imports so client components can import it.
 */
export type FormState = {
  status: "idle" | "success" | "error";
  /** Human-readable message (error or success). */
  message?: string;
  /** Per-field validation messages keyed by input name. */
  fieldErrors?: Record<string, string>;
  /** Echo of submitted values so a failed submission does not wipe the form. */
  values?: Record<string, string>;
};

export const idleFormState: FormState = { status: "idle" };
