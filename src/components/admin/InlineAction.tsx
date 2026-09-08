import type { ReactNode } from "react";
import { ConfirmButton } from "./ConfirmButton";
import { SubmitButton } from "./SubmitButton";

type Action = (formData: FormData) => void | Promise<void>;

/** One-button server-action form, for table rows and entry lists. */
export function InlineAction({
  action,
  children,
  pendingLabel,
  variant = "outline",
  title,
}: {
  action: Action;
  children: ReactNode;
  pendingLabel?: ReactNode;
  variant?: "outline" | "solid" | "seal" | "ghost";
  title?: string;
}) {
  return (
    <form action={action} className="inline-flex">
      <SubmitButton variant={variant} pendingLabel={pendingLabel} title={title}>
        {children}
      </SubmitButton>
    </form>
  );
}

/** Two-step destructive server action. */
export function InlineDelete({ action, children = "Delete", question = "Delete for good?", confirmLabel = "Delete" }: { action: Action; children?: ReactNode; question?: ReactNode; confirmLabel?: ReactNode }) {
  return (
    <form action={action} className="inline-flex">
      <ConfirmButton question={question} confirmLabel={confirmLabel}>
        {children}
      </ConfirmButton>
    </form>
  );
}
