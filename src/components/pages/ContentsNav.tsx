"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export type ContentsItem = { id: string; label: string };

/**
 * In-page contents for long-form pages. Sticky on desktop; a compact row on mobile.
 * Highlights the section currently in view (an IntersectionObserver, no scroll listeners).
 */
export function ContentsNav({ items, className, tone = "paper" }: { items: ContentsItem[]; className?: string; tone?: "paper" | "ink" }) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const targets = items.map((i) => document.getElementById(i.id)).filter((el): el is HTMLElement => Boolean(el));
    if (!targets.length) return;
    const visible = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.set(entry.target.id, entry.boundingClientRect.top);
          else visible.delete(entry.target.id);
        }
        if (!visible.size) return;
        // The visible section nearest the top of the viewport wins.
        const next = [...visible.entries()].sort((a, b) => a[1] - b[1])[0][0];
        setActive((prev) => (prev === next ? prev : next));
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: [0, 0.2, 0.5, 1] },
    );
    targets.forEach((t) => observer.observe(t));
    return () => observer.disconnect();
  }, [items]);

  const paper = tone === "paper";

  return (
    <nav aria-label="On this page" className={cn("lg:sticky lg:top-28", className)}>
      <p className={cn("eyebrow-muted mb-4")}>Contents</p>
      <ol className={cn("flex flex-wrap gap-x-5 gap-y-1 lg:block lg:space-y-0 lg:border-l", paper ? "lg:border-ink/15" : "lg:border-bronze/20")}>
        {items.map((item, i) => {
          const current = active === item.id;
          return (
            <li key={item.id} className="shrink-0">
              <a
                href={`#${item.id}`}
                aria-current={current ? "location" : undefined}
                className={cn(
                  "group flex items-baseline gap-3 py-1.5 font-mono text-[0.66rem] uppercase tracking-[0.18em] transition-colors lg:-ml-px lg:border-l lg:pl-4",
                  current
                    ? paper
                      ? "border-seal text-ink"
                      : "border-bronze-2 text-ivory"
                    : paper
                      ? "border-transparent text-ink/55 hover:text-ink"
                      : "border-transparent text-bone hover:text-ivory",
                )}
              >
                <span aria-hidden="true" className={cn("tabular-nums", current ? (paper ? "text-seal" : "text-bronze-2") : "opacity-60")}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="whitespace-nowrap">{item.label}</span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
