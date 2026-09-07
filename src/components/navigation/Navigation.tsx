"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

/**
 * Minimal fixed navigation. Transparent over the artwork, gains a hairline and a dark wash after scrolling.
 * Mobile: hamburger → full-screen overlay.
 */
export function Navigation() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const isHome = pathname === "/";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    const raf = requestAnimationFrame(onScroll);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.documentElement.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-ivory focus:px-4 focus:py-2 focus:text-ink"
      >
        Skip to content
      </a>
      <header
        data-nav
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-500",
          scrolled || open ? "border-b border-bronze/15 bg-ink/75 backdrop-blur-md" : "border-b border-transparent bg-transparent",
        )}
      >
        <nav aria-label="Primary" className="container-editorial flex h-[var(--header-height)] items-center justify-between">
          <Link href="/" className="group flex flex-col leading-none" aria-label={`${siteConfig.author.name} — home`}>
            <span className="eyebrow transition-colors group-hover:text-ivory">{siteConfig.author.name}</span>
            <span className="mt-1 font-display text-[1.05rem] tracking-[0.18em] text-ivory/90 uppercase">{siteConfig.name}</span>
          </Link>

          <ul className="hidden items-center gap-8 md:flex">
            {siteConfig.nav.map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "link-underline font-mono text-[0.68rem] uppercase tracking-[0.2em] transition-colors",
                      active ? "text-ivory" : "text-bone hover:text-ivory",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
            <li id="nav-extra-slot" className="flex items-center" />
          </ul>

          <button
            type="button"
            className="relative z-[60] flex h-11 w-11 items-center justify-center md:hidden"
            aria-expanded={open}
            aria-controls={menuId}
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            <span className="relative block h-3 w-6">
              <span className={cn("absolute left-0 top-0 h-px w-6 bg-ivory transition-transform duration-300", open && "top-1.5 rotate-45")} />
              <span className={cn("absolute left-0 top-3 h-px w-6 bg-ivory transition-transform duration-300", open && "top-1.5 -rotate-45")} />
            </span>
          </button>
        </nav>
      </header>

      {/* Mobile overlay */}
      <div
        id={menuId}
        className={cn(
          "fixed inset-0 z-40 flex flex-col justify-between bg-ink/95 px-[var(--page-x)] pb-10 pt-28 backdrop-blur-xl transition-opacity duration-500 md:hidden",
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        )}
        aria-hidden={!open}
      >
        <ul className="space-y-2">
          {siteConfig.nav.map((item, i) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <li key={item.href} style={{ transitionDelay: open ? `${80 + i * 50}ms` : "0ms" }} className={cn("transition-all duration-500", open ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0")}>
                <Link
                  href={item.href}
                  tabIndex={open ? 0 : -1}
                  onClick={() => setOpen(false)}
                  className={cn("display-lg block py-1 transition-colors", active ? "text-ivory" : "text-bone hover:text-ivory")}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="space-y-3 border-t border-bronze/20 pt-6">
          <p className="eyebrow">{siteConfig.author.title} · {siteConfig.author.location}</p>
          <a href={`mailto:${siteConfig.contactEmail}`} tabIndex={open ? 0 : -1} onClick={() => setOpen(false)} className="font-display text-lg text-ivory">
            {siteConfig.contactEmail}
          </a>
          <p className="text-xs opacity-60">{siteConfig.footer.lines[0]}</p>
        </div>
      </div>
      {isHome ? null : <div aria-hidden="true" className="h-[var(--header-height)]" />}
    </>
  );
}
