"use client";

import type { ComponentProps, ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";

type Variant = "outline" | "solid" | "seal" | "ghost";

/**
 * Submit button that reflects the enclosing form's pending state.
 * Works for plain server-action forms (no `useActionState` needed).
 */
export function SubmitButton({
  children,
  pendingLabel,
  variant = "outline",
  size = "sm",
  className,
  ...rest
}: Omit<ComponentProps<"button">, "type"> & { pendingLabel?: ReactNode; variant?: Variant; size?: "sm" | "md" }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || rest.disabled}
      aria-busy={pending || undefined}
      className={cn(
        "btn",
        variant === "solid" && "btn-solid",
        variant === "seal" && "btn-seal",
        variant === "ghost" && "btn-ghost",
        size === "sm" && "btn-sm",
        className,
      )}
      {...rest}
    >
      {pending ? (pendingLabel ?? "Working…") : children}
    </button>
  );
}
