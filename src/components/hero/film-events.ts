"use client";

/**
 * A tiny event bus for the moments of the film that are decided by the media rather than by the
 * scroll:
 *   `impact` — the strike clip's clock has crossed the second at which the gavel meets the block
 *              (`impactAt` in art-manifest.json). The renderers start their flash on it and
 *              CinematicHome plays the sound; media.ts emits it once per play of the clip (never
 *              during the bridge into the strike).
 *   `bridge` — a bridge has started: the visitor arrived at a beat forward and the clip that
 *              carries the previous beat into it is playing. Nothing hangs off it yet.
 * `window.__yilImpacts` and `window.__yilBridges` count the emissions for QA scripts.
 */
export type FilmEvent = "impact" | "bridge";

type Listener = () => void;

const listeners: Record<FilmEvent, Set<Listener>> = { impact: new Set(), bridge: new Set() };

type Counted = { __yilImpacts?: number; __yilBridges?: number };

export const filmEvents = {
  on(event: FilmEvent, listener: Listener): () => void {
    listeners[event].add(listener);
    return () => {
      listeners[event].delete(listener);
    };
  },
  emit(event: FilmEvent): void {
    if (typeof window !== "undefined") {
      const w = window as unknown as Counted;
      if (event === "impact") w.__yilImpacts = (w.__yilImpacts ?? 0) + 1;
      else w.__yilBridges = (w.__yilBridges ?? 0) + 1;
    }
    for (const listener of listeners[event]) listener();
  },
};

if (typeof window !== "undefined") {
  const w = window as unknown as Counted;
  w.__yilImpacts ??= 0;
  w.__yilBridges ??= 0;
}
