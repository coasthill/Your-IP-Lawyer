import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Label + control + (error | hint). Error text is announced and linked via aria-describedby. */
export function FormField({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
  className,
}: {
  label: ReactNode;
  htmlFor: string;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <label htmlFor={htmlFor} className="eyebrow-muted block">
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-xs text-seal" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="text-xs text-ash">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** aria-describedby value matching FormField's ids. */
export function describedBy(id: string, error?: string, hint?: unknown): string | undefined {
  if (error) return `${id}-error`;
  if (hint) return `${id}-hint`;
  return undefined;
}

export function CheckField({ id, name, label, hint, checked, defaultChecked, onChange }: { id: string; name: string; label: ReactNode; hint?: ReactNode; checked?: boolean; defaultChecked?: boolean; onChange?: (checked: boolean) => void }) {
  return (
    <div className="flex items-start gap-3">
      <input
        id={id}
        name={name}
        type="checkbox"
        className="mt-1 h-4 w-4 shrink-0 accent-lapis"
        checked={checked}
        defaultChecked={defaultChecked}
        onChange={onChange ? (e) => onChange(e.target.checked) : undefined}
      />
      <label htmlFor={id} className="text-sm text-ink">
        <span className="block">{label}</span>
        {hint ? <span className="block text-xs text-ash">{hint}</span> : null}
      </label>
    </div>
  );
}
