"use client";

import * as THREE from "three";
import { clamp01, ramp } from "../../story";

/**
 * Act II timing. Every scene group stays mounted a little beyond its story range so the
 * hand-offs (rosette → plate → emblem → compass → constellation) can overlap; `inRange`
 * adds its own ±0.04 margin on top of these.
 */
export const ACT = {
  gears: [0.4, 0.58],
  design: [0.575, 0.72],
  emblem: [0.665, 0.905],
  map: [0.77, 0.915],
  legal: [0.88, 1],
} as const;

/** Where the gavel lands (world) — mirrors STRIKE_POINT in figure/constants. The machine is born here. */
export const IMPACT = new THREE.Vector3(0.28, -0.55, 0.68);
/** The camera's point of interest through the middle acts. */
export const FOCUS = new THREE.Vector3(0, 0.3, 0);
export const X_AXIS = new THREE.Vector3(1, 0, 0);

export const FONT_600 = "/fonts/cormorant-latin-600-normal.woff";
export const FONT_500 = "/fonts/cormorant-latin-500-normal.woff";
export const FONT_MONO = "/fonts/ibm-plex-mono-latin-400-normal.woff";
/** Shared `characters` strings → one font preload / suspense key per face. */
export const CHARS_600 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789®·&§.";
export const CHARS_500 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ ";
export const CHARS_MONO = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.-— ";

export function easeOut(t: number) {
  const x = clamp01(t);
  const y = 1 - x;
  return 1 - y * y * y;
}

export function easeIn(t: number) {
  const x = clamp01(t);
  return x * x * x;
}

/**
 * Progress that decelerates to a halt between `a` and `b` (derivative 1 → 0) and then
 * stays put. Used to freeze the gear train without any spin-back.
 */
export function haltingProgress(p: number, a: number, b: number) {
  if (p <= a) return p;
  const u = Math.min(1, (p - a) / (b - a));
  return a + (b - a) * (u - u * u * 0.5);
}

/** Pose of the map of India (scene 7) — shared so the emblem's ring can land on it. */
export type MapPose = { tilt: number; y: number; z: number };

export function mapPose(p: number, out: MapPose): MapPose {
  const t = ramp(p, 0.78, 0.86);
  out.tilt = -1.05 * t;
  out.y = 0.3 - 0.62 * t;
  out.z = -0.9 + 1.25 * t;
  return out;
}

/** Map-local point → world, for a map group at (0, pose.y, pose.z) rotated about X by pose.tilt. */
export function mapLocalToWorld(pose: MapPose, local: THREE.Vector3, out: THREE.Vector3) {
  out.copy(local).applyAxisAngle(X_AXIS, pose.tilt);
  out.y += pose.y;
  out.z += pose.z;
  return out;
}

/** The troika text object that drei's <Text> exposes through its ref. */
export type TroikaText = THREE.Mesh & { fillOpacity: number; outlineOpacity: number };

/** Sets fill (and outline) opacity on every troika text beneath `root` (no allocations). */
export function setTextOpacity(root: THREE.Object3D | null, v: number, outlineScale = 1) {
  if (!root) return;
  const kids = root.children;
  for (let i = 0; i < kids.length; i++) {
    const k = kids[i];
    const t = k as Partial<TroikaText>;
    if (typeof t.fillOpacity === "number") {
      t.fillOpacity = v;
      t.outlineOpacity = v * outlineScale;
    } else if (k.children.length > 0) {
      setTextOpacity(k, v, outlineScale);
    }
  }
}

export function setOpacity(materials: THREE.Material[], v: number) {
  for (let i = 0; i < materials.length; i++) materials[i].opacity = v;
}

export function disposeAll(items: Array<{ dispose: () => void }>) {
  for (let i = 0; i < items.length; i++) items[i].dispose();
}

/** Deterministic pseudo-random (mulberry32) so layouts are identical on every mount. */
export function prng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Scale guard: a zero scale produces a singular matrix; keep a hair of size instead. */
export function safeScale(s: number) {
  return s < 0.001 ? 0.001 : s;
}
