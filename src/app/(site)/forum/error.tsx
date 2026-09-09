"use client";

import Link from "next/link";

/** Error boundary for the forum. Keeps the chrome, replaces the page with a calm notice. */
export default function ForumError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="container-editorial flex min-h-[60vh] flex-col justify-center py-24 md:py-32" aria-labelledby="forum-error-title">
      <p className="eyebrow eyebrow-mark">Objection.</p>
      <h1 id="forum-error-title" className="display-lg mt-6">
        The forum could not be convened.
      </h1>
      <p className="lede mt-6 max-w-lg">Something went wrong while retrieving this page. It is almost certainly our fault, and almost certainly temporary.</p>
      <div className="mt-10 flex flex-wrap gap-3">
        <button type="button" onClick={reset} className="btn btn-solid">
          Try again
        </button>
        <Link href="/forum" className="btn">
          Back to the record
        </Link>
      </div>
      {error.digest ? <p className="mt-8 font-mono text-[0.62rem] uppercase tracking-[0.2em] text-ash">Ref. {error.digest}</p> : null}
    </section>
  );
}
