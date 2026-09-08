"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export type NavItem = { href: string; label: string; count?: number };

/** Dashboard navigation: a numbered column on desktop, a horizontally scrolling strip on small screens. */
export function AdminNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Dashboard" className="min-w-0">
      <ul className="no-scrollbar flex gap-1 overflow-x-auto md:flex-col md:gap-0 md:overflow-visible">
        {items.map((item, i) => {
          const active = item.href === "/admin" ? pathname === "/admin" : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href} className="shrink-0 md:shrink">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex items-center gap-3 border-b-2 px-3 py-3 font-mono text-[0.68rem] uppercase tracking-[0.18em] transition-colors md:border-b-0 md:border-l-2 md:px-5 md:py-2.5",
                  active ? "border-bronze-2 text-ivory" : "border-transparent text-bone hover:text-ivory",
                )}
              >
                <span className={cn("hidden w-5 text-[0.62rem] md:inline", active ? "text-bronze-2" : "text-ash group-hover:text-bone")} aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>{item.label}</span>
                {item.count ? (
                  <span className="ml-auto inline-flex min-w-[1.4rem] items-center justify-center border border-bronze/50 px-1.5 py-0.5 text-[0.6rem] text-bronze-2" aria-label={`${item.count} awaiting attention`}>
                    {item.count > 99 ? "99+" : item.count}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
