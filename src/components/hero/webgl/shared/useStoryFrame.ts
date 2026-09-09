"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { progressStore } from "../../progress-store";

export type StoryFrame = {
  /** target scroll progress 0–1 (raw from ScrollTrigger) */
  target: number;
  /** eased progress that renderers should draw from */
  p: number;
  /** signed velocity of the eased progress per second */
  v: number;
  /** elapsed seconds */
  t: number;
  /** frame delta seconds (clamped) */
  dt: number;
};

/**
 * Shared per-frame story clock. Eases toward the scroll target so fast scrolling stays cinematic.
 * Use inside R3F components:  useStoryFrame((f) => { mesh.rotation.z = f.p * 10 })
 * `priority` controls order (lower runs first). Returns a ref you can read elsewhere.
 */
/** QA: `?snap` disables easing so screenshots land exactly on the scroll target. */
const SNAP = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("snap");

export function useStoryFrame(cb: (frame: StoryFrame) => void, priority = 0) {
  const frame = useRef<StoryFrame>({ target: 0, p: 0, v: 0, t: 0, dt: 0 });
  useFrame((state, delta) => {
    const f = frame.current;
    const dt = Math.min(delta, 1 / 20);
    f.dt = dt;
    f.t = state.clock.elapsedTime;
    f.target = progressStore.get().value;
    // exponential ease — frame-rate independent
    const k = 1 - Math.exp(-dt * 7.5);
    const next = SNAP ? f.target : f.p + (f.target - f.p) * k;
    f.v = dt > 0 ? (next - f.p) / dt : 0;
    f.p = next;
    if (priority === -10) (window as unknown as { __yilFrame?: StoryFrame }).__yilFrame = f; // QA hook (camera rig runs first)
    cb(f);
  }, priority);
  return frame;
}

/** Utility: is `p` inside [a, b] expanded by `margin` (for mounting/unmounting scenes). */
export function inRange(p: number, a: number, b: number, margin = 0.04) {
  return p >= a - margin && p <= b + margin;
}
