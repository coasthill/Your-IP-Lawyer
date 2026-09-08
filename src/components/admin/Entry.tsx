import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * One item of guest content (comment, thread, reply) in a moderation list.
 * Meta line on top, body in `.prose-ugc`, actions underneath. Stacks well on narrow screens.
 */
export function EntryList({ children, className }: { children: ReactNode; className?: string }) {
  return <ol className={cn("divide-y divide-bronze/15 border-y border-bronze/20", className)}>{children}</ol>;
}

export function Entry({ meta, title, bodyHtml, footer, actions, id }: { meta: ReactNode; title?: ReactNode; bodyHtml?: string; footer?: ReactNode; actions?: ReactNode; id?: string }) {
  return (
    <li id={id} className="grid gap-3 py-5 md:grid-cols-[minmax(0,1fr)_auto] md:gap-6">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[0.64rem] uppercase tracking-[0.14em] text-ash">{meta}</div>
        {title ? <p className="mt-2 font-display text-xl leading-snug text-ivory">{title}</p> : null}
        {bodyHtml ? <div className="prose-ugc mt-2 max-w-prose text-parchment/90" dangerouslySetInnerHTML={{ __html: bodyHtml }} /> : null}
        {footer ? <div className="mt-2 text-xs text-bone/70">{footer}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-start gap-1.5 md:justify-end md:pt-1">{actions}</div> : null}
    </li>
  );
}
