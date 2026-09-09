"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type CopyState = "idle" | "copied" | "failed";

function legacyCopy(value: string): boolean {
  const ta = document.createElement("textarea");
  ta.value = value;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  document.body.removeChild(ta);
  return ok;
}

/** Copies an address to the clipboard and says so, briefly. */
export function CopyAddressButton({ value, className, label = "Copy address" }: { value: string; className?: string; label?: string }) {
  const [state, setState] = useState<CopyState>("idle");
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  async function copy() {
    let ok = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        ok = true;
      } else {
        ok = legacyCopy(value);
      }
    } catch {
      ok = legacyCopy(value);
    }
    setState(ok ? "copied" : "failed");
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState("idle"), 2400);
  }

  const text = state === "copied" ? "Copied" : state === "failed" ? "Could not copy" : label;

  return (
    <>
      <button
        type="button"
        onClick={copy}
        className={cn("btn btn-sm", state === "copied" && "border-lapis text-lapis in-[.surface-lapis]:border-bronze-2 in-[.surface-lapis]:text-bronze-2 in-[.surface-deep]:border-bronze-2 in-[.surface-deep]:text-bronze-2", className)}
        aria-label={`${label}: ${value}`}
      >
        {text}
      </button>
      <span role="status" aria-live="polite" className="sr-only">
        {state === "copied" ? "Email address copied to the clipboard." : state === "failed" ? "Copying failed. Select the address to copy it by hand." : ""}
      </span>
    </>
  );
}
