"use client";

import { useEffect, useRef } from "react";
import { SCENES, captionOpacity, type Caption } from "./story";
import { progressStore } from "./progress-store";
import { cn } from "@/lib/utils";

/**
 * The DOM caption layer. Every caption exists in the DOM at all times (semantic, screen-reader friendly);
 * its opacity/transform is driven directly from the progress store without React re-renders.
 */
export function TextOverlay({ className }: { className?: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const captions = SCENES.flatMap((s) => s.captions.map((c) => ({ ...c, sceneId: s.id })));

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const nodes = Array.from(root.querySelectorAll<HTMLElement>("[data-caption]"));
    const apply = (progress: number) => {
      nodes.forEach((node, i) => {
        const c = captions[i];
        const o = captionOpacity(progress, c);
        node.style.opacity = o.toFixed(3);
        const dir = c.align === "right" ? -1 : 1;
        const drift = (1 - o) * 18 * dir;
        node.style.transform = `translate3d(${drift.toFixed(1)}px, ${((1 - o) * 10).toFixed(1)}px, 0)`;
        node.style.visibility = o < 0.01 ? "hidden" : "visible";
        node.setAttribute("aria-hidden", o < 0.5 ? "true" : "false");
      });
    };
    apply(progressStore.get().value);
    return progressStore.subscribe((s) => apply(s.value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={rootRef} className={cn("pointer-events-none absolute inset-0 z-20", className)}>
      {captions.map((c, i) => (
        <CaptionBlock key={`${c.sceneId}-${i}`} caption={c} first={i === 0} />
      ))}
    </div>
  );
}

function CaptionBlock({ caption, first }: { caption: Caption & { sceneId: string }; first: boolean }) {
  const align = caption.align ?? "left";
  return (
    <section
      data-caption
      data-scene={caption.sceneId}
      className={cn(
        "absolute flex w-[min(34rem,80vw)] flex-col will-change-[opacity,transform]",
        align === "left" && "left-[var(--page-x)] bottom-[14vh] items-start text-left md:bottom-auto md:top-1/2 md:-translate-y-1/2",
        align === "right" && "right-[var(--page-x)] bottom-[14vh] items-end text-right md:bottom-auto md:top-1/2 md:-translate-y-1/2",
        align === "center" && "left-1/2 top-[18vh] -translate-x-1/2 items-center text-center md:top-[22vh]",
      )}
      style={{ opacity: first ? 1 : 0 }}
    >
      {caption.eyebrow ? <p className="eyebrow mb-4 text-shadow-soft">{caption.eyebrow}</p> : null}
      {first ? (
        <h1 className="display-xl text-shadow-soft">{caption.title}</h1>
      ) : (
        <h2 className={cn("text-shadow-soft", align === "center" ? "display-lg" : "display-md")}>{caption.title}</h2>
      )}
      {caption.body ? <p className={cn("lede mt-5 max-w-md text-shadow-soft opacity-90", first && "text-base font-body tracking-[0.05em] text-bone")}>{caption.body}</p> : null}
    </section>
  );
}
