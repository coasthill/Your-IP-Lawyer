import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type RecordItem = { title: ReactNode; body?: ReactNode; id?: string };

/**
 * The house "record": a numbered list (01, 02, …) with hairline rules and engraved-style numerals.
 * Works on ink and on paper; pass `tone="paper"` inside a `.paper` section.
 */
export function RecordList({
  items,
  start = 1,
  tone = "ink",
  columns = 1,
  className,
  bodyClassName,
  as: Tag = "ol",
}: {
  items: RecordItem[];
  start?: number;
  tone?: "ink" | "paper";
  columns?: 1 | 2;
  className?: string;
  /** Overrides the body type size, e.g. `text-base` for longer entries. */
  bodyClassName?: string;
  as?: "ol" | "ul";
}) {
  const paper = tone === "paper";
  return (
    <Tag
      className={cn(
        "border-y",
        paper ? "divide-ink/12 border-ink/15" : "divide-bronze/15 border-bronze/15",
        columns === 2 ? "grid md:grid-cols-2 md:gap-x-12 md:divide-y-0 md:[&>li]:border-b" : "divide-y",
        className,
      )}
    >
      {items.map((item, i) => {
        const n = String(start + i).padStart(2, "0");
        return (
          <li key={item.id ?? n} id={item.id} className={cn("grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-4 py-6", columns === 2 && (paper ? "md:border-ink/12" : "md:border-bronze/15"))}>
            <span className="relative pt-1" aria-hidden="true">
              <span
                className={cn(
                  "block font-display text-[1.9rem] leading-none tabular-nums",
                  paper ? "text-seal" : "engraved text-bronze-2",
                )}
              >
                {n}
              </span>
              <span className={cn("mt-2 block h-px w-6", paper ? "bg-ink/25" : "bg-bronze/45")} />
            </span>
            <div>
              <p className={cn("font-display text-xl leading-snug", paper ? "text-ink" : "text-ivory")}>
                <span className="sr-only">{n}. </span>
                {item.title}
              </p>
              {item.body ? <div className={cn("mt-1.5 text-sm leading-relaxed", paper ? "text-ink/70" : "text-bone", bodyClassName)}>{item.body}</div> : null}
            </div>
          </li>
        );
      })}
    </Tag>
  );
}
