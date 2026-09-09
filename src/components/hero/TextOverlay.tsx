"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { SCENES, captionOpacity, type Caption } from "./story";
import { progressStore } from "./progress-store";
import { Arrow } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

/**
 * The DOM caption layer. Every caption exists in the DOM at all times (semantic, screen-reader
 * friendly); its opacity/transform is driven directly from the progress store without React
 * re-renders. Colours come from the stage, which switches between the lapis and paper surfaces
 * as the paintings change (see CinematicHome).
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
        node.style.pointerEvents = o > 0.6 ? "auto" : "none";
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
        "absolute flex w-[min(34rem,82vw)] flex-col will-change-[opacity,transform]",
        align === "left" && "left-[var(--page-x)] bottom-[15vh] items-start text-left md:bottom-auto md:top-1/2 md:-translate-y-1/2",
        align === "right" && "right-[var(--page-x)] bottom-[15vh] items-end text-right md:bottom-auto md:top-1/2 md:-translate-y-1/2",
        align === "center" && "left-1/2 top-[17vh] -translate-x-1/2 items-center text-center md:top-[21vh]",
      )}
      style={{ opacity: first ? 1 : 0 }}
    >
      {/* A soft backdrop keeps centred captions legible over the busiest part of a painting. */}
      {align === "center" ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -inset-x-24 -inset-y-16 -z-10 rounded-[50%] bg-[radial-gradient(closest-side,rgba(15,47,124,0.78),rgba(15,47,124,0.45)_55%,transparent)] group-data-[tone=paper]:bg-[radial-gradient(closest-side,rgba(251,250,247,0.9),rgba(251,250,247,0.6)_55%,transparent)]"
        />
      ) : null}
      {caption.eyebrow ? (
        <p className={cn("eyebrow eyebrow-mark mb-4 text-shadow-soft", align === "right" && "flex-row-reverse")}>{caption.eyebrow}</p>
      ) : null}
      {first ? (
        <h1 className="display-hero text-shadow-soft">{caption.title}</h1>
      ) : (
        <h2 className={cn("text-shadow-soft", align === "center" ? "display-lg" : "display-md")}>{caption.title}</h2>
      )}
      {caption.body ? (
        <p className={cn("lede mt-5 max-w-md text-shadow-soft", first && "font-body text-sm tracking-[0.06em] uppercase opacity-80")}>{caption.body}</p>
      ) : null}
      {first ? (
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link href="/blog" className="btn btn-solid btn-sm">
            Read the publication <Arrow />
          </Link>
          <Link href="/forum" className="btn btn-sm">
            Enter the forum
          </Link>
        </div>
      ) : null}
    </section>
  );
}
