"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useSyncExternalStore, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useLenis } from "@/components/ui/SmoothScroll";
import { Arrow } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Open state lives in a tiny external store: sessionStorage decides    */
/* the first visit, an explicit open/close wins afterwards. Reading it  */
/* through useSyncExternalStore keeps the server render closed and lets */
/* the client open it after hydration without setState in an effect.   */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = "yil:forum-intent";

let override: boolean | null = null;
const listeners = new Set<() => void>();

function alreadyChosen(): boolean {
  try {
    return window.sessionStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    /* storage blocked: never nag */
    return true;
  }
}

function getSnapshot(): boolean {
  return override ?? !alreadyChosen();
}

function getServerSnapshot(): boolean {
  return false;
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function setOpen(next: boolean) {
  override = next;
  if (!next) {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* storage blocked */
    }
  }
  for (const cb of listeners) cb();
}

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

const CHOICES = [
  { n: "01", title: "Browse discussions", body: "Read the record. Join in wherever the argument is worth having.", href: null },
  { n: "02", title: "Create a forum", body: "Open a discussion on a point of law, practice or procedure that deserves an audience.", href: "/forum/new" },
  { n: "03", title: "Ask a question", body: "Put it to the room. Someone here has probably stood where you are standing.", href: "/forum/new?kind=question" },
] as const;

/**
 * The door to the forum. Opens once per session and asks what the visitor came for; the small
 * persistent button re-opens it. Accessible dialog: labelled, modal, focus-trapped, closes on
 * Escape or backdrop, locks page scroll (and Lenis) while open.
 */
export function IntentModal({ className }: { className?: string }) {
  const open = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const lenis = useLenis();
  const id = useId();
  const dialogId = `${id}-dialog`;
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstChoiceRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    root.style.overflow = "hidden";
    lenis?.stop();
    const raf = requestAnimationFrame(() => firstChoiceRef.current?.focus());
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
      root.style.overflow = previousOverflow;
      lenis?.start();
      if (trigger && document.contains(trigger)) trigger.focus({ preventScroll: true });
    };
  }, [open, lenis]);

  const trapTab = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab" || !dialogRef.current) return;
    const nodes = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (!nodes.length) return;
    const firstNode = nodes[0];
    const lastNode = nodes[nodes.length - 1];
    const active = document.activeElement;
    const inside = active instanceof Node && dialogRef.current.contains(active);
    if (e.shiftKey && (!inside || active === firstNode)) {
      e.preventDefault();
      lastNode.focus();
    } else if (!e.shiftKey && (!inside || active === lastNode)) {
      e.preventDefault();
      firstNode.focus();
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? dialogId : undefined}
        className={cn(
          "link-underline inline-flex items-center gap-2 font-mono text-[0.66rem] uppercase tracking-[0.2em] text-bronze-2 transition-colors hover:text-ivory",
          className,
        )}
      >
        What are you looking for?
        <Arrow direction="down" className="opacity-70" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center p-0 sm:items-center sm:p-6">
          <div className="animate-fade-in absolute inset-0 bg-ink/85 backdrop-blur-sm" onClick={() => setOpen(false)} aria-hidden="true" />
          <div
            ref={dialogRef}
            id={dialogId}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${id}-title`}
            aria-describedby={`${id}-desc`}
            onKeyDown={trapTab}
            data-lenis-prevent
            className="animate-fade-up relative z-[1] max-h-[calc(100dvh-1rem)] w-full max-w-3xl overflow-y-auto border border-bronze/25 bg-ink-2 shadow-plate grain"
          >
            <div className="relative z-[2] px-6 py-8 sm:px-10 sm:py-12 md:px-14 md:py-14">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <p className="eyebrow">The IP Forum · Cause list</p>
                  <h2 id={`${id}-title`} className="display-md mt-4 uppercase tracking-[0.04em]">
                    What are you looking for?
                  </h2>
                  <p id={`${id}-desc`} className="mt-4 max-w-md text-sm leading-relaxed text-bone">
                    Three doors. Pick one; the other two stay open, and you can come back to this from the forum at any time.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center text-bone transition-colors hover:text-ivory"
                >
                  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16">
                    <path d="M2 2l12 12M14 2L2 14" fill="none" stroke="currentColor" strokeWidth="1.2" />
                  </svg>
                </button>
              </div>

              <ol className="mt-10 border-t border-bronze/20">
                {CHOICES.map((choice, i) => {
                  const inner = (
                    <>
                      <span className="pt-1.5 font-mono text-[0.68rem] tracking-[0.22em] text-bronze-2">{choice.n}</span>
                      <span className="min-w-0">
                        <span className="block font-display text-2xl uppercase leading-none tracking-[0.1em] text-ivory transition-colors group-hover:text-bronze-2 sm:text-3xl">
                          {choice.title}
                        </span>
                        <span className="mt-2 block text-sm leading-relaxed text-bone/80">{choice.body}</span>
                      </span>
                      <Arrow className="mt-2 text-bone/60 transition-[transform,color] duration-300 group-hover:translate-x-1 group-hover:text-bronze-2" />
                    </>
                  );
                  const rowClass = "group grid w-full grid-cols-[2.5rem_minmax(0,1fr)_auto] items-start gap-x-4 border-b border-bronze/20 py-6 text-left sm:gap-x-6 sm:py-7";
                  return (
                    <li key={choice.n}>
                      {choice.href ? (
                        <Link href={choice.href} onClick={() => setOpen(false)} className={rowClass}>
                          {inner}
                        </Link>
                      ) : (
                        <button ref={i === 0 ? firstChoiceRef : undefined} type="button" onClick={() => setOpen(false)} className={rowClass}>
                          {inner}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ol>

              <p className="mt-8 font-mono text-[0.6rem] uppercase tracking-[0.2em] text-ash">No account required · Guests are welcome · Views are the participants&rsquo; own</p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
