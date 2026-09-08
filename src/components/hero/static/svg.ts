/**
 * Geometry for the static (reduced-motion) composition: pure functions that return SVG path data
 * and point lists. They run on the server at render time — no DOM, no canvas — so the still
 * picture is part of the HTML itself and needs no JavaScript.
 */

import { indiaUnitPolygon, toUnit, CONCEPTUAL_MARKER } from "../india-outline";

const TAU = Math.PI * 2;

export function fmt(n: number): string {
  return (Math.round(n * 100) / 100).toString();
}

/** Gear outline with `teeth` trapezoidal teeth on pitch radius `r`, tips at 2πk/teeth + rot; a hub hole as a second subpath (fill-rule evenodd). */
export function gearD(teeth: number, r: number, hole: number, rot = 0, toothDepth = 0.18): string {
  const td = toothDepth * r;
  const rOuter = r + td * 0.5;
  const rInner = r - td * 0.5;
  const pitch = TAU / teeth;
  let d = "";
  for (let k = 0; k < teeth; k++) {
    const b = k * pitch + rot;
    const pts: Array<[number, number]> = [
      [b - 0.3 * pitch, rInner],
      [b - 0.17 * pitch, rOuter],
      [b + 0.17 * pitch, rOuter],
      [b + 0.3 * pitch, rInner],
    ];
    for (let i = 0; i < pts.length; i++) {
      const [a, rr] = pts[i];
      d += `${k === 0 && i === 0 ? "M" : "L"}${fmt(Math.cos(a) * rr)} ${fmt(Math.sin(a) * rr)}`;
    }
  }
  d += "Z";
  if (hole > 0) d += `M${fmt(hole)} 0A${fmt(hole)} ${fmt(hole)} 0 1 0 ${fmt(-hole)} 0A${fmt(hole)} ${fmt(hole)} 0 1 0 ${fmt(hole)} 0Z`;
  return d;
}

/** Meshed rotation of a child gear (same convention as the canvas renderer). */
export function meshedRotation(parentRot: number, parentTeeth: number, childTeeth: number, angle: number): number {
  const ratio = parentTeeth / childTeeth;
  return -ratio * parentRot + angle * (1 + ratio) + Math.PI - Math.PI / childTeeth;
}

/** Lightening cut-outs between r0 and r1, `n` spokes left standing. */
export function cutoutsD(n: number, r0: number, r1: number): string {
  let d = "";
  const gap = 0.16;
  for (let s = 0; s < n; s++) {
    const a0 = (s / n) * TAU + gap;
    const a1 = ((s + 1) / n) * TAU - gap;
    d += `M${fmt(Math.cos(a0) * r0)} ${fmt(Math.sin(a0) * r0)}`;
    d += `A${fmt(r0)} ${fmt(r0)} 0 0 1 ${fmt(Math.cos(a1) * r0)} ${fmt(Math.sin(a1) * r0)}`;
    d += `L${fmt(Math.cos(a1) * r1)} ${fmt(Math.sin(a1) * r1)}`;
    d += `A${fmt(r1)} ${fmt(r1)} 0 0 0 ${fmt(Math.cos(a0) * r1)} ${fmt(Math.sin(a0) * r1)}Z`;
  }
  return d;
}

/** Radial ticks between r0 and r1 (every `every`-th tick starts deeper, at r0 - deep). */
export function ticksD(n: number, r0: number, r1: number, every = 0, deep = 0): string {
  let d = "";
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const rr = every > 0 && i % every === 0 ? r0 - deep : r0;
    d += `M${fmt(Math.cos(a) * rr)} ${fmt(Math.sin(a) * rr)}L${fmt(Math.cos(a) * r1)} ${fmt(Math.sin(a) * r1)}`;
  }
  return d;
}

/** A closed polar curve r(θ)·scale as a polyline points string. */
export function polarPoints(fn: (t: number) => number, steps: number, scale: number): string {
  let s = "";
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * TAU;
    const r = fn(a) * scale;
    s += `${fmt(Math.cos(a) * r)},${fmt(Math.sin(a) * r)} `;
  }
  return s.trim();
}

/** The guilloché rosette as a set of polylines (rose curves and petal rings) plus a tick path. */
export function guilloche(R: number): { curves: string[]; ticks: string; rings: number[] } {
  const curves: string[] = [];
  const roses: Array<[number, number, number]> = [
    [12, 0.72, 0.085],
    [18, 0.5, 0.06],
    [8, 0.88, 0.05],
    [24, 0.36, 0.045],
  ];
  for (const [k, c, a] of roses) curves.push(polarPoints((t) => c + a * Math.cos(k * t), 240, R));
  for (const [count, r0, r1, width] of [
    [16, 0.1, 0.44, 0.85],
    [24, 0.58, 0.93, 0.62],
  ] as const) {
    const half = (Math.PI / count) * width;
    for (let k = 0; k < count; k++) {
      const base = (k / count) * TAU;
      for (const sign of [1, -1]) {
        let s = "";
        for (let i = 0; i <= 12; i++) {
          const t = i / 12;
          const r = (r0 + (r1 - r0) * t) * R;
          const w = half * Math.sin(Math.PI * t) * sign;
          s += `${fmt(Math.cos(base + w) * r)},${fmt(Math.sin(base + w) * r)} `;
        }
        curves.push(s.trim());
      }
    }
  }
  return { curves, ticks: ticksD(72, 0.935 * R, 0.985 * R, 6, 0.035 * R), rings: [0.3, 0.56, 0.84, 0.965].map((k) => k * R) };
}

/** The small ornament: two rose curves in a ring. */
export function roseOrnament(R: number): string[] {
  return [polarPoints((t) => 0.78 + 0.2 * Math.cos(8 * t), 160, R), polarPoints((t) => 0.42 + 0.14 * Math.cos(6 * t), 120, R)];
}

/** Compass rose: eight points (cardinals long) as polygons, plus a tick path. */
export function compass(R: number): { points: string[]; ticks: string } {
  const points: string[] = [];
  for (let i = 0; i < 8; i++) {
    const a = -Math.PI / 2 + (i * TAU) / 8;
    const len = i % 2 === 0 ? 0.92 * R : 0.55 * R;
    const w = i % 2 === 0 ? 0.11 * R : 0.07 * R;
    const ax = Math.cos(a);
    const ay = Math.sin(a);
    const px = -ay;
    const py = ax;
    points.push(`${fmt(ax * len)},${fmt(ay * len)} ${fmt(px * w)},${fmt(py * w)} ${fmt(ax * 0.05 * R)},${fmt(ay * 0.05 * R)} ${fmt(-px * w)},${fmt(-py * w)}`);
  }
  return { points, ticks: ticksD(72, 0.94 * R, 0.98 * R, 18, 0.08 * R) };
}

/** A clean turned vessel profile as path data; base at the origin, rising to y = −1.47·S. */
export function vesselD(S: number): string {
  const P = (x: number, y: number) => `${fmt(x * S)} ${fmt(-y * S)}`;
  const side = (m: number) =>
    `M${P(0.3 * m, 0)}L${P(0.34 * m, 0.06)}C${P(0.64 * m, 0.16)} ${P(0.62 * m, 0.56)} ${P(0.4 * m, 0.8)}C${P(0.28 * m, 0.93)} ${P(0.16 * m, 0.98)} ${P(0.15 * m, 1.1)}L${P(0.15 * m, 1.34)}C${P(0.16 * m, 1.41)} ${P(0.22 * m, 1.42)} ${P(0.245 * m, 1.47)}`;
  return side(1) + side(-1);
}

/** Elliptical section rings of the vessel: [cy, rx] pairs at scale S. */
export function vesselRings(S: number): Array<[number, number]> {
  return (
    [
      [0, 0.3],
      [0.06, 0.34],
      [0.42, 0.61],
      [0.8, 0.4],
      [1.1, 0.15],
      [1.47, 0.245],
    ] as const
  ).map(([y, r]) => [-y * S, r * S]);
}

/** The map of India as a points string at scale M (unit polygon × M, y flipped, optionally squashed). */
export function indiaPoints(M: number, sy = 1, shrink = 1): string {
  const poly = indiaUnitPolygon();
  let cx = 0;
  let cy = 0;
  for (const [x, y] of poly) {
    cx += x;
    cy += y;
  }
  cx /= poly.length;
  cy /= poly.length;
  return poly.map(([x, y]) => `${fmt((cx + (x - cx) * shrink) * M)},${fmt(-(cy + (y - cy) * shrink) * M * sy)}`).join(" ");
}

/** The conceptual marker in map coordinates at scale M. */
export function markerAt(M: number, sy = 1): [number, number] {
  const u = toUnit(CONCEPTUAL_MARKER);
  return [u[0] * M, -u[1] * M * sy];
}

/** Regular polygon vertices (first at the top). */
export function polygonPoints(n: number, R: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i / n) * TAU;
    out.push([Math.cos(a) * R, Math.sin(a) * R]);
  }
  return out;
}

/** A torn-paper edge as a points string (deterministic wobble). */
export function tornPoints(R: number, seed: number): string {
  let s = "";
  let a = seed >>> 0;
  const rnd = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const n = 40;
  for (let i = 0; i < n; i++) {
    const th = (i / n) * TAU;
    const r = R * (0.92 + rnd() * 0.16);
    s += `${fmt(Math.cos(th) * r)},${fmt(Math.sin(th) * r)} `;
  }
  return s.trim();
}
