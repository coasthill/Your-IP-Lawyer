import Link from "next/link";
import { cn } from "@/lib/utils";

export type TabItem = { key: string; label: string; href: string; count?: number };

/** Search-param driven tabs rendered as links (server component, no JS required). */
export function LinkTabs({ tabs, active, label = "Filter" }: { tabs: TabItem[]; active: string; label?: string }) {
  return (
    <nav aria-label={label} className="mb-8 border-b">
      <ul className="no-scrollbar -mb-px flex gap-1 overflow-x-auto">
        {tabs.map((t) => {
          const isActive = t.key === active;
          return (
            <li key={t.key} className="shrink-0">
              <Link
                href={t.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "inline-flex items-center gap-2 border-b-2 px-3 py-3 font-mono text-[0.66rem] uppercase tracking-[0.18em] transition-colors",
                  isActive ? "border-lapis text-ink" : "border-transparent text-slate hover:text-ink",
                )}
              >
                {t.label}
                {typeof t.count === "number" ? <span className={cn("text-[0.6rem] tabular-nums", isActive ? "text-lapis" : "text-ash")}>{t.count}</span> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
