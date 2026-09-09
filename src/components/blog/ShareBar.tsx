"use client";

import { useEffect, useRef, useState } from "react";

type CopyState = "idle" | "copied" | "failed";

/** Plain intent links as small pills — no third-party scripts, nothing tracked. */
export function ShareBar({ url, title }: { url: string; title: string }) {
  const [copy, setCopy] = useState<CopyState>("idle");
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  async function copyLink() {
    let next: CopyState = "failed";
    try {
      await navigator.clipboard.writeText(url);
      next = "copied";
    } catch {
      next = "failed";
    }
    setCopy(next);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopy("idle"), 2400);
  }

  const enc = encodeURIComponent;
  const links = [
    { label: "X", href: `https://x.com/intent/post?text=${enc(title)}&url=${enc(url)}`, external: true },
    { label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`, external: true },
    { label: "WhatsApp", href: `https://wa.me/?text=${enc(`${title} — ${url}`)}`, external: true },
    { label: "Email", href: `mailto:?subject=${enc(title)}&body=${enc(`${title}\n${url}`)}`, external: false },
  ];

  const linkClass = "btn btn-sm hover:border-lapis hover:text-lapis";

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
      <p className="eyebrow eyebrow-mark">Share</p>
      <ul className="flex flex-wrap items-center gap-2">
        <li>
          <button type="button" onClick={copyLink} className={linkClass}>
            {copy === "copied" ? "Copied." : copy === "failed" ? "Copy failed" : "Copy link"}
          </button>
          <span role="status" className="sr-only">
            {copy === "copied" ? "Link copied to the clipboard." : copy === "failed" ? "The link could not be copied. Copy it from the address bar instead." : ""}
          </span>
        </li>
        {links.map((l) => (
          <li key={l.label}>
            <a href={l.href} className={linkClass} {...(l.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
              {l.label}
              {l.external ? <span className="sr-only"> (opens in a new tab)</span> : null}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
