"use client";

import { useSyncExternalStore } from "react";

/**
 * A tiny mutable store for scroll progress. Renderers read `.value` every frame (no React re-render);
 * the DOM caption layer subscribes for cheap updates.
 */
export type ProgressState = {
  /** 0–1 across the pinned stage */
  value: number;
  /** signed progress change since last update (scroll velocity proxy) */
  velocity: number;
  /** wall-clock time of last update */
  updatedAt: number;
};

type Listener = (state: ProgressState) => void;

const state: ProgressState = { value: 0, velocity: 0, updatedAt: 0 };
const listeners = new Set<Listener>();

export const progressStore = {
  get: () => state,
  set(value: number) {
    const now = performance.now();
    const dt = Math.max(1, now - state.updatedAt);
    const v = (value - state.value) / dt;
    state.velocity = state.velocity * 0.8 + v * 0.2;
    state.value = value;
    state.updatedAt = now;
    for (const l of listeners) l(state);
  },
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

/** React hook — re-renders on every progress change. Use sparingly (captions), never inside 3D loops. */
export function useProgress(): number {
  return useSyncExternalStore(
    (cb) => progressStore.subscribe(() => cb()),
    () => state.value,
    () => 0,
  );
}
