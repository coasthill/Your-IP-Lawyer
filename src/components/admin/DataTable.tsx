import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Dense editorial table. Always wrapped in its own horizontal scroller so the page never scrolls sideways. */
export function DataTable({ children, className, caption }: { children: ReactNode; className?: string; caption?: string }) {
  return (
    <div className="-mx-[var(--page-x)] overflow-x-auto px-[var(--page-x)]">
      <table className={cn("w-full min-w-[40rem] border-collapse text-sm tabular-nums", className)}>
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        {children}
      </table>
    </div>
  );
}

export function Th({ children, className, ...rest }: ComponentProps<"th">) {
  return (
    <th scope="col" className={cn("border-b border-ink/25 py-2.5 pr-4 text-left font-mono text-[0.62rem] font-medium uppercase tracking-[0.18em] text-ash", className)} {...rest}>
      {children}
    </th>
  );
}

export function Td({ children, className, ...rest }: ComponentProps<"td">) {
  return (
    <td className={cn("border-b py-3 pr-4 align-top", className)} {...rest}>
      {children}
    </td>
  );
}

/** Inline row of small action forms. */
export function ActionRow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex flex-wrap items-center gap-1.5", className)}>{children}</div>;
}
