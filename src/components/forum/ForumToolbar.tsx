import Link from "next/link";
import type { Category } from "@/db/schema";
import { cn } from "@/lib/utils";
import { SORTS, forumHref, type ThreadSort } from "./format";

/**
 * Category chips (scroll inside themselves on small screens, never widening the page)
 * and the sort switch in mono. The call to start a discussion sits in the masthead above.
 */
export function ForumToolbar({
  categories,
  currentCategory,
  sort,
  className,
}: {
  categories: Category[];
  /** Slug of the highlighted category; `null` highlights "All". */
  currentCategory: string | null;
  sort: ThreadSort;
  className?: string;
}) {
  const items: Array<{ slug: string | null; name: string }> = [{ slug: null, name: "All" }, ...categories.map((c) => ({ slug: c.slug, name: c.name }))];

  return (
    <div className={cn("flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between lg:gap-10", className)}>
      <nav aria-label="Forum categories" className="no-scrollbar -mx-[var(--page-x)] min-w-0 overflow-x-auto px-[var(--page-x)] lg:mx-0 lg:px-0">
        <ul className="flex w-max gap-2 pb-1 lg:w-auto lg:flex-wrap">
          {items.map((item) => {
            const active = currentCategory === item.slug;
            return (
              <li key={item.slug ?? "all"}>
                <Link
                  href={forumHref({ category: item.slug, sort })}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "chip whitespace-nowrap transition-colors duration-300",
                    active ? "border-lapis bg-lapis text-ivory" : "hover:border-current hover:text-lapis",
                  )}
                >
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="flex shrink-0 flex-wrap items-center gap-x-8 gap-y-4">
        <nav aria-label="Sort discussions" className="flex items-center gap-x-4 font-mono text-[0.62rem] uppercase tracking-[0.2em]">
          <span className="text-ash">Sort</span>
          <ul className="flex items-center gap-x-4">
            {SORTS.map((s) => {
              const active = s.value === sort;
              return (
                <li key={s.value}>
                  <Link
                    href={forumHref({ category: currentCategory, sort: s.value })}
                    aria-current={active ? "true" : undefined}
                    className={cn(
                      "link-underline whitespace-nowrap transition-colors",
                      active ? "text-ink underline decoration-lapis underline-offset-[0.4em]" : "text-slate hover:text-lapis",
                    )}
                  >
                    {s.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </div>
  );
}
