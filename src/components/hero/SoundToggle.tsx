"use client";

import { useEffect, useState } from "react";
import { sound } from "./sound";
import { cn } from "@/lib/utils";

export function SoundToggle({ className }: { className?: string }) {
  const [on, setOn] = useState(false);
  useEffect(() => sound.subscribe(setOn), []);
  return (
    <button
      type="button"
      onClick={() => sound.toggle()}
      aria-pressed={on}
      aria-label={on ? "Turn sound off" : "Turn sound on"}
      className={cn(
        "flex items-center gap-2 font-mono text-[0.62rem] uppercase tracking-[0.2em] text-bone transition-colors hover:text-ivory",
        className,
      )}
    >
      <span className="flex h-3 items-end gap-[2px]" aria-hidden="true">
        {[0.4, 0.9, 0.6, 1].map((h, i) => (
          <span
            key={i}
            className={cn("w-[2px] bg-current transition-all duration-500", on ? "animate-[pulse-soft_1.4s_ease-in-out_infinite]" : "opacity-40")}
            style={{ height: `${h * 100}%`, animationDelay: `${i * 120}ms` }}
          />
        ))}
      </span>
      Sound {on ? "on" : "off"}
    </button>
  );
}
