"use client";

import { useEffect } from "react";
import { siteConfig } from "@/config/site";

/*
 * Global error boundary: replaces the root layout, so it must render <html> and <body> itself and
 * cannot rely on globals.css or the self-hosted fonts. Inline styles only, system serif and mono.
 */

const ink = "#09090b";
const ivory = "#f1eadb";
const parchment = "#e3d9c3";
const bone = "#b6ad9b";
const ash = "#77736b";
const bronze = "#a67e56";
const bronze2 = "#c8a274";

const serif = 'Georgia, "Times New Roman", serif';
const mono = 'ui-monospace, "SF Mono", Menlo, Consolas, "Courier New", monospace';

const button: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  fontFamily: mono,
  fontSize: "0.72rem",
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  padding: "0.85rem 1.4rem",
  border: `1px solid ${bronze}`,
  borderRadius: 2,
  background: "transparent",
  color: ivory,
  cursor: "pointer",
  textDecoration: "none",
};

export default function GlobalError({ error, reset, retry }: { error: Error & { digest?: string }; reset: () => void; retry?: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en-IN" style={{ background: ink, colorScheme: "dark" }}>
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          background: ink,
          color: parchment,
          fontFamily: serif,
          lineHeight: 1.6,
          WebkitFontSmoothing: "antialiased",
        }}
      >
        <title>{`Even lawyers have bad days — ${siteConfig.name}`}</title>
        <main
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            width: "100%",
            maxWidth: "84rem",
            margin: "0 auto",
            padding: "6rem clamp(1.25rem, 4vw, 3.5rem)",
            boxSizing: "border-box",
          }}
        >
          <p style={{ margin: 0, fontFamily: mono, fontSize: "0.68rem", letterSpacing: "0.22em", textTransform: "uppercase", color: bronze2 }}>
            An internal error has occurred.
          </p>
          <h1 style={{ margin: "1.5rem 0 0", fontFamily: serif, fontWeight: 400, fontSize: "clamp(2.4rem, 5.5vw, 5rem)", lineHeight: 1, letterSpacing: "-0.015em", color: ivory, maxWidth: "20ch" }}>
            Even lawyers have bad days.
          </h1>
          <p style={{ margin: "1.5rem 0 0", maxWidth: "32rem", fontSize: "clamp(1.2rem, 1.9vw, 1.55rem)", lineHeight: 1.4, color: parchment }}>
            Something went wrong at the very root of the site. It is almost certainly temporary and entirely our fault. Try again; if the fault persists, the matter stands adjourned for a moment.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", marginTop: "2.5rem" }}>
            <button type="button" onClick={() => (retry ? retry() : reset())} style={{ ...button, background: ivory, color: ink, borderColor: ivory }}>
              Try again
            </button>
            {/* A full reload on purpose: the router tree is what just failed. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" style={button}>
              Back to the record
            </a>
          </div>
          {error.digest ? (
            <p style={{ margin: "2.5rem 0 0", fontFamily: mono, fontSize: "0.62rem", letterSpacing: "0.2em", textTransform: "uppercase", color: ash }}>Ref. {error.digest}</p>
          ) : null}
        </main>
        <footer style={{ width: "100%", maxWidth: "84rem", margin: "0 auto", padding: "0 clamp(1.25rem, 4vw, 3.5rem) 2rem", boxSizing: "border-box" }}>
          <div style={{ height: 1, background: `${bronze}55`, marginBottom: "1.5rem" }} role="presentation" />
          <p style={{ margin: 0, fontFamily: mono, fontSize: "0.62rem", letterSpacing: "0.2em", textTransform: "uppercase", color: bone }}>
            {siteConfig.name} · {siteConfig.author.name} · {siteConfig.author.location}
          </p>
        </footer>
      </body>
    </html>
  );
}
