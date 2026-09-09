"use client";

import { useEffect, useRef } from "react";
import { ANNOTATIONS, captionOpacity } from "./story";
import { progressStore } from "./progress-store";
import { cn } from "@/lib/utils";

/**
 * The technical-drawing layer: registration marks, leader lines and mono labels pinned to points
 * on the paintings (the five IP subjects rising from the gown, the numbered figures of the patent
 * drawing, the design class, the registered mark). Driven straight from the progress store.
 * Hidden on narrow screens, where the captions need the room.
 */
export function Annotations() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const nodes = Array.from(root.querySelectorAll<HTMLElement>("[data-annotation]"));
    const apply = (progress: number) => {
      nodes.forEach((node, i) => {
        const o = captionOpacity(progress, ANNOTATIONS[i], 0.012);
        node.style.opacity = o.toFixed(3);
        node.style.visibility = o < 0.01 ? "hidden" : "visible";
        const line = node.querySelector<HTMLElement>("[data-leader]");
        if (line) line.style.transform = `scaleX(${o.toFixed(3)})`;
      });
    };
    apply(progressStore.get().value);
    return progressStore.subscribe((s) => apply(s.value));
  }, []);

  return (
    <div ref={rootRef} className="pointer-events-none absolute inset-0 z-[15] hidden md:block" aria-hidden="true">
      {ANNOTATIONS.map((a, i) => {
        const flip = a.x > 0.6;
        return (
          <div
            key={`${a.scene}-${i}`}
            data-annotation
            className={cn("absolute flex items-center gap-3 will-change-[opacity]", flip && "flex-row-reverse")}
            style={{ left: `${a.x * 100}%`, top: `${a.y * 100}%`, opacity: 0, transform: flip ? "translate(-100%, -50%)" : "translate(0, -50%)" }}
          >
            <span className="reg-mark shrink-0" />
            <span data-leader className={cn("block h-px w-14 bg-current opacity-60", flip ? "origin-right" : "origin-left")} />
            <span className="flex flex-col whitespace-nowrap">
              <span className={cn("uppercase tracking-[0.22em] opacity-90", a.label.length <= 2 ? "font-display text-[1.1rem] leading-none tracking-normal" : "font-mono text-[0.62rem]")}>{a.label}</span>
              {a.note ? <span className="font-display text-[0.95rem] italic leading-tight opacity-80">{a.note}</span> : null}
            </span>
          </div>
        );
      })}
    </div>
  );
}
