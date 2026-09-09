import Link from "next/link";
import type { Category } from "@/db/schema";
import { cn } from "@/lib/utils";

/**
 * Horizontal chip row of blog categories. Bleeds to the viewport edge on small screens and
 * scrolls inside itself, so it never widens the page.
 *
 * `current`: a category slug highlights that chip; `null` highlights "All"; `undefined` highlights nothing (tag pages).
 */
export function CategoryNav({ categories, current, className }: { categories: Category[]; current?: string | null; className?: string }) {
  const items: Array<{ slug: string | null; name: string; href: string }> = [
    { slug: null, name: "All", href: "/blog" },
    ...categories.map((c) => ({ slug: c.slug, name: c.name, href: `/blog/category/${c.slug}` })),
  ];
  return (
    <nav aria-label="Blog categories" className={cn("no-scrollbar -mx-[var(--page-x)] overflow-x-auto px-[var(--page-x)]", className)}>
      <ul className="flex w-max gap-2 pb-1">
        {items.map((item) => {
          const active = current !== undefined && current === item.slug;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "chip whitespace-nowrap transition-colors duration-300",
                  active ? "border-bronze-2 bg-bronze/15 text-ivory" : "hover:border-current hover:text-ivory",
                )}
              >
                {item.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
