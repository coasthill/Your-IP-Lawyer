"use client";

/**
 * A tiny event bus for the moments of the film that are decided by the media rather than by the
 * scroll. Today there is one: `impact` — the strike clip's clock has crossed the second at which
 * the gavel meets the block (`impactAt` in art-manifest.json). The renderers start their flash on
 * it and CinematicHome plays the sound; media.ts emits it once per play of the clip.
 * `window.__yilImpacts` counts the emissions for QA scripts.
 */
export type FilmEvent = "impact";

type Listener = () => void;

const listeners: Record<FilmEvent, Set<Listener>> = { impact: new Set() };

type Counted = { __yilImpacts?: number };

export const filmEvents = {
  on(event: FilmEvent, listener: Listener): () => void {
    listeners[event].add(listener);
    return () => {
      listeners[event].delete(listener);
    };
  },
  emit(event: FilmEvent): void {
    if (event === "impact" && typeof window !== "undefined") {
      const w = window as unknown as Counted;
      w.__yilImpacts = (w.__yilImpacts ?? 0) + 1;
    }
    for (const listener of listeners[event]) listener();
  },
};

if (typeof window !== "undefined") {
  const w = window as unknown as Counted;
  w.__yilImpacts ??= 0;
}
