import type { ReactNode } from "react";

/** eyebrow → display headline → lede, with an optional action slot on the right. */
export function PageHeader({ eyebrow, title, lede, actions }: { eyebrow: ReactNode; title: ReactNode; lede?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
      <div className="max-w-3xl">
        <p className="eyebrow eyebrow-mark mb-3">{eyebrow}</p>
        <h1 className="display-md">{title}</h1>
        {lede ? <p className="lede mt-4 max-w-2xl opacity-85">{lede}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function SectionHeading({ number, title, aside }: { number?: string; title: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4 border-b pb-3">
      <h2 className="flex items-baseline gap-3 font-display text-2xl text-ink">
        {number ? (
          <span className="font-mono text-[0.66rem] tracking-[0.2em] text-lapis" aria-hidden="true">
            {number}
          </span>
        ) : null}
        {title}
      </h2>
      {aside ? <div className="text-sm text-slate">{aside}</div> : null}
    </div>
  );
}
