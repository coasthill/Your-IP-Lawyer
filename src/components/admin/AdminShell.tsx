import Link from "next/link";
import type { ReactNode } from "react";
import { siteConfig } from "@/config/site";
import { AdminNav, type NavItem } from "./AdminNav";

/**
 * Dashboard chrome: wordmark + numbered navigation in a deep-blue column on the left, a thin
 * header on top of the paper content area.
 * Server component; only the navigation (active state) is a client component.
 */
export function AdminShell({
  admin,
  items,
  logoutAction,
  children,
}: {
  admin: { name: string };
  items: NavItem[];
  logoutAction: () => Promise<void>;
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[15rem_minmax(0,1fr)] md:bg-[linear-gradient(90deg,var(--color-lapis-3)_15rem,transparent_15rem)]">
      <aside className="surface-deep md:sticky md:top-0 md:h-dvh">
        <div className="flex items-center justify-between px-5 py-5 md:block md:px-5 md:py-7">
          <Link href="/admin" className="group block leading-none" aria-label="Dashboard home">
            <span className="eyebrow transition-colors group-hover:text-ivory">{siteConfig.author.name}</span>
            <span className="mt-1 block font-display text-[1.05rem] uppercase tracking-[0.18em] text-ivory/90">{siteConfig.name}</span>
          </Link>
          <p className="eyebrow-muted md:mt-6">Chambers</p>
        </div>
        <div className="rule-solid mx-5 hidden md:block" role="presentation" />
        <div className="px-2 md:px-0 md:pt-3">
          <AdminNav items={items} />
        </div>
        <p className="hidden px-5 pt-10 text-[0.68rem] leading-relaxed text-bone/70 md:block">{siteConfig.footer.lines[0]}</p>
      </aside>

      <div className="min-w-0">
        <header className="flex h-14 items-center justify-between gap-4 border-b px-[var(--page-x)]">
          <p className="min-w-0 truncate font-mono text-[0.66rem] uppercase tracking-[0.18em] text-slate">
            <span className="text-ash">Signed in · </span>
            <span className="text-ink">{admin.name}</span>
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <Link href="/" className="btn btn-sm btn-ghost">
              View site
            </Link>
            <form action={logoutAction}>
              <button type="submit" className="btn btn-sm">
                Sign out
              </button>
            </form>
          </div>
        </header>
        <main id="main" className="px-[var(--page-x)] py-10 md:py-14">
          {children}
        </main>
      </div>
    </div>
  );
}
