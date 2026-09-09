"use client";

import Link from "next/link";
import { useEffect } from "react";
import { siteConfig } from "@/config/site";

/**
 * Root error boundary. It replaces the root layout's children, so the site chrome is not
 * available here; the page carries its own minimal masthead. Global styles and fonts still apply.
 */
export default function RootError({ error, reset, retry }: { error: Error & { digest?: string }; reset: () => void; retry?: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const tryAgain = () => (retry ? retry() : reset());

  return (
    <div className="flex min-h-dvh flex-col bg-ink text-parchment">
      <header className="container-editorial flex h-[var(--header-height)] items-center">
        <Link href="/" className="group flex flex-col leading-none" aria-label={`${siteConfig.author.name} — home`}>
          <span className="eyebrow transition-colors group-hover:text-ivory">{siteConfig.author.name}</span>
          <span className="mt-1 font-display text-[1.05rem] uppercase tracking-[0.18em] text-ivory/90">{siteConfig.name}</span>
        </Link>
      </header>

      <main id="main" className="container-editorial flex flex-1 flex-col justify-center py-24 md:py-32" aria-labelledby="error-title">
        <p className="eyebrow">An internal error has occurred.</p>
        <h1 id="error-title" className="display-lg mt-6 max-w-4xl">
          Even lawyers have bad days.
        </h1>
        <p className="lede mt-6 max-w-lg">Something went wrong on our side. It is almost certainly temporary and entirely our fault. Try again; if the fault persists, the matter stands adjourned for a moment.</p>
        <div className="mt-10 flex flex-wrap gap-3">
          <button type="button" onClick={tryAgain} className="btn btn-solid">
            Try again
          </button>
          <Link href="/" className="btn">
            Back to the record
          </Link>
          <Link href="/blog" className="btn btn-ghost">
            Read the blog
          </Link>
        </div>
        {error.digest ? <p className="mt-10 font-mono text-[0.62rem] uppercase tracking-[0.2em] text-ash">Ref. {error.digest}</p> : null}
      </main>

      <footer className="container-editorial py-8">
        <div className="rule-solid mb-6" role="presentation" />
        <p className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-ash">
          {siteConfig.name} · {siteConfig.author.location}
        </p>
      </footer>
    </div>
  );
}
