"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** Copies `value` to the clipboard and confirms briefly. Falls back to a prompt when the API is unavailable. */
export function CopyButton({ value, label = "Copy URL", className }: { value: string; label?: string; className?: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  const copy = async () => {
    const absolute = value.startsWith("http") ? value : `${window.location.origin}${value}`;
    try {
      await navigator.clipboard.writeText(absolute);
      setState("copied");
    } catch {
      window.prompt("Copy this URL", absolute);
      setState("failed");
    }
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState("idle"), 1800);
  };

  return (
    <button type="button" onClick={copy} className={cn("btn btn-sm", className)} aria-live="polite">
      {state === "copied" ? "Copied" : state === "failed" ? "Shown" : label}
    </button>
  );
}
