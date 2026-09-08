"use client";

import * as THREE from "three";
import { gearShape, type GearSpec } from "../shared/gear";
import { indiaUnitPolygon, toUnit, CONCEPTUAL_MARKER } from "../../india-outline";
import { prng } from "./anim";

/*
 * Procedural geometry for Act II. Everything here is built once (inside useMemo) and
 * returns plain BufferGeometries — no per-frame work, no external assets.
 */

type Pt = [number, number];

/** Accumulates line segments (pairs of xyz) into one LineSegments geometry. */
class Segments {
  private arr: number[] = [];

  line(ax: number, ay: number, az: number, bx: number, by: number, bz: number) {
    this.arr.push(ax, ay, az, bx, by, bz);
  }

  poly(points: ArrayLike<{ x: number; y: number }> | Pt[], z: number, closed = true) {
    const n = points.length;
    for (let i = 0; i < n - (closed ? 0 : 1); i++) {
      const a = points[i];
      const b = points[(i + 1) % n];
      const ax = Array.isArray(a) ? a[0] : a.x;
      const ay = Array.isArray(a) ? a[1] : a.y;
      const bx = Array.isArray(b) ? b[0] : b.x;
      const by = Array.isArray(b) ? b[1] : b.y;
      this.line(ax, ay, z, bx, by, z);
    }
  }

  circle(cx: number, cy: number, r: number, z: number, n = 64, squash = 1) {
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2;
      const a1 = ((i + 1) / n) * Math.PI * 2;
      this.line(cx + Math.cos(a0) * r, cy + Math.sin(a0) * r * squash, z, cx + Math.cos(a1) * r, cy + Math.sin(a1) * r * squash, z);
    }
  }

  /** Radial function r(θ) sampled around a centre. */
  polar(fn: (theta: number) => number, n: number, z: number, cx = 0, cy = 0) {
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2;
      const a1 = ((i + 1) / n) * Math.PI * 2;
      const r0 = fn(a0);
      const r1 = fn(a1);
      this.line(cx + Math.cos(a0) * r0, cy + Math.sin(a0) * r0, z, cx + Math.cos(a1) * r1, cy + Math.sin(a1) * r1, z);
    }
  }

  /** Engineering arrowhead pointing along (dx, dy) with its tip at (x, y). */
  arrow(x: number, y: number, dx: number, dy: number, size: number, z: number) {
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const px = -uy;
    const py = ux;
    this.line(x, y, z, x - ux * size + px * size * 0.3, y - uy * size + py * size * 0.3, z);
    this.line(x, y, z, x - ux * size - px * size * 0.3, y - uy * size - py * size * 0.3, z);
  }

  /** Dash-dot centre line between two points. */
  centreLine(ax: number, ay: number, bx: number, by: number, z: number) {
    const len = Math.hypot(bx - ax, by - ay);
    const ux = (bx - ax) / len;
    const uy = (by - ay) / len;
    const pattern = [0.5, 0.1, 0.07, 0.1];
    let t = 0;
    let k = 0;
    while (t < len) {
      const seg = Math.min(pattern[k % 4], len - t);
      if (k % 2 === 0) this.line(ax + ux * t, ay + uy * t, z, ax + ux * (t + seg), ay + uy * (t + seg), z);
      t += seg;
      k++;
    }
  }

  /** Rectangle outline. */
  rect(x0: number, y0: number, x1: number, y1: number, z: number) {
    this.line(x0, y0, z, x1, y0, z);
    this.line(x1, y0, z, x1, y1, z);
    this.line(x1, y1, z, x0, y1, z);
    this.line(x0, y1, z, x0, y0, z);
  }

  /** 45° section hatching clipped to a rectangle. */
  hatch(x0: number, y0: number, x1: number, y1: number, step: number, z: number) {
    // lines of the form x - y = c
    for (let c = x0 - y1; c <= x1 - y0; c += step) {
      // intersections with the rectangle edges
      const pts: Pt[] = [];
      const yAtX0 = x0 - c;
      const yAtX1 = x1 - c;
      const xAtY0 = y0 + c;
      const xAtY1 = y1 + c;
      if (yAtX0 >= y0 && yAtX0 <= y1) pts.push([x0, yAtX0]);
      if (yAtX1 >= y0 && yAtX1 <= y1) pts.push([x1, yAtX1]);
      if (xAtY0 > x0 && xAtY0 < x1) pts.push([xAtY0, y0]);
      if (xAtY1 > x0 && xAtY1 < x1) pts.push([xAtY1, y1]);
      if (pts.length >= 2) this.line(pts[0][0], pts[0][1], z, pts[1][0], pts[1][1], z);
    }
  }

  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(this.arr, 3));
    return g;
  }
}

/* ------------------------------------------------------------------ gears */

/** Extruded gear centred exactly on its axis (no bbox re-centring, so odd tooth counts stay true). */
export function buildGear(spec: GearSpec) {
  const geo = new THREE.ExtrudeGeometry(gearShape(spec), {
    depth: spec.depth,
    bevelEnabled: true,
    bevelThickness: spec.depth * 0.1,
    bevelSize: spec.radius * 0.012,
    bevelSegments: 2,
    curveSegments: 4,
  });
  geo.translate(0, 0, -spec.depth / 2);
  return geo;
}

/** Half the total thickness of a gear built by buildGear (face position). */
export function gearFace(spec: GearSpec) {
  return spec.depth / 2 + spec.depth * 0.1;
}

/* -------------------------------------------------------------- blueprint */

/** The parchment blueprint behind the machine: circles, a gear drawing, dimensions, sections. */
export function blueprintDrawing() {
  const s = new Segments();
  const gx = -2.6;
  const gy = 0.55;
  const z = 0;
  // pitch / root / tip circles and an outer construction circle
  for (const r of [1.64, 2.0, 2.18, 3.35]) s.circle(gx, gy, r, z, 112);
  // gear profile (outline + spokes) from the shared gear shape
  const shape = gearShape({ teeth: 24, radius: 2.0, depth: 0, spokes: 5, hole: 0.3 });
  s.poly(shape.getPoints(), z);
  for (const h of shape.holes) s.poly(h.getPoints(10), z);
  // centre lines
  s.centreLine(gx - 3.9, gy, gx + 3.9, gy, z);
  s.centreLine(gx, gy - 3.9, gx, gy + 3.9, z);
  // horizontal dimension under the gear
  const dy = gy - 3.05;
  s.line(gx - 2.18, gy - 2.3, z, gx - 2.18, dy - 0.2, z);
  s.line(gx + 2.18, gy - 2.3, z, gx + 2.18, dy - 0.2, z);
  s.line(gx - 2.18, dy, z, gx + 2.18, dy, z);
  s.arrow(gx - 2.18, dy, -1, 0, 0.16, z);
  s.arrow(gx + 2.18, dy, 1, 0, 0.16, z);
  // vertical dimension right of the gear
  const dx = gx + 3.0;
  s.line(gx + 2.3, gy - 2.18, z, dx + 0.2, gy - 2.18, z);
  s.line(gx + 2.3, gy + 2.18, z, dx + 0.2, gy + 2.18, z);
  s.line(dx, gy - 2.18, z, dx, gy + 2.18, z);
  s.arrow(dx, gy - 2.18, 0, -1, 0.16, z);
  s.arrow(dx, gy + 2.18, 0, 1, 0.16, z);
  // radius dimension
  const ra = 0.62;
  s.line(gx, gy, z, gx + Math.cos(ra) * 2.0, gy + Math.sin(ra) * 2.0, z);
  s.arrow(gx + Math.cos(ra) * 2.0, gy + Math.sin(ra) * 2.0, Math.cos(ra), Math.sin(ra), 0.14, z);
  // section A–A: a shaft with a keyway, hatched
  s.rect(2.3, -3.0, 6.3, -0.95, z);
  s.hatch(2.3, -3.0, 6.3, -2.0, 0.19, z);
  s.line(2.3, -2.0, z, 6.3, -2.0, z);
  s.rect(3.6, -2.0, 4.1, -1.55, z);
  s.centreLine(1.9, -1.98, 6.7, -1.98, z);
  s.line(2.3, -0.95, z, 2.3, -0.55, z);
  s.line(6.3, -0.95, z, 6.3, -0.55, z);
  s.line(2.3, -0.7, z, 6.3, -0.7, z);
  s.arrow(2.3, -0.7, -1, 0, 0.14, z);
  s.arrow(6.3, -0.7, 1, 0, 0.14, z);
  // a smaller part, upper right: a bushing in section
  s.rect(3.1, 1.3, 6.1, 2.55, z);
  s.rect(3.6, 1.55, 5.6, 2.3, z);
  s.hatch(3.1, 1.3, 3.6, 2.55, 0.17, z);
  s.hatch(5.6, 1.3, 6.1, 2.55, 0.17, z);
  s.centreLine(2.7, 1.925, 6.5, 1.925, z);
  // title block
  s.rect(3.0, -4.75, 7.7, -3.45, z);
  s.line(3.0, -4.1, z, 7.7, -4.1, z);
  s.line(5.6, -4.75, z, 5.6, -3.45, z);
  // registration crosses in the corners
  for (const [cx, cy] of [
    [-7.4, 4.5],
    [7.4, 4.5],
    [-7.4, -4.5],
  ] as Pt[]) {
    s.line(cx - 0.18, cy, z, cx + 0.18, cy, z);
    s.line(cx, cy - 0.18, z, cx, cy + 0.18, z);
  }
  return s.build();
}

/* ------------------------------------------------------------- ornament */

/** Fine concentric lathe marks on the turned plate. */
export function latheRings(R: number) {
  const s = new Segments();
  for (let r = 0.32; r < R * 0.985; r += 0.075) s.circle(0, 0, r, 0, 96);
  return s.build();
}

/** A lotus / guilloché rosette: rose curves, petal rings, fine rings and rim ticks. */
export function guilloche(R: number) {
  const s = new Segments();
  const z = 0;
  for (const r of [0.3, 0.56, 0.84, 0.965]) s.circle(0, 0, r * R, z, 128);
  const roses: Array<[number, number, number]> = [
    [12, 0.72, 0.085],
    [18, 0.5, 0.06],
    [8, 0.88, 0.05],
    [24, 0.36, 0.045],
  ];
  for (const [k, c, a] of roses) s.polar((t) => R * (c + a * Math.cos(k * t)), 540, z);
  petalRing(s, 16, 0.1 * R, 0.44 * R, 0.85, z);
  petalRing(s, 24, 0.58 * R, 0.93 * R, 0.62, z);
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    const r0 = i % 6 === 0 ? 0.9 * R : 0.935 * R;
    s.line(Math.cos(a) * r0, Math.sin(a) * r0, z, Math.cos(a) * 0.985 * R, Math.sin(a) * 0.985 * R, z);
  }
  return s.build();
}

function petalRing(s: Segments, count: number, r0: number, r1: number, width: number, z: number) {
  const half = (Math.PI / count) * width;
  const steps = 22;
  for (let p = 0; p < count; p++) {
    const base = (p / count) * Math.PI * 2;
    const left: Pt[] = [];
    const right: Pt[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const r = r0 + (r1 - r0) * t;
      const w = half * Math.sin(Math.PI * t);
      left.push([Math.cos(base + w) * r, Math.sin(base + w) * r]);
      right.push([Math.cos(base - w) * r, Math.sin(base - w) * r]);
    }
    s.poly(left, z, false);
    s.poly(right, z, false);
  }
}

/** A single rose curve with a ring — the small "ornament" motif. */
export function roseOrnament(R: number) {
  const s = new Segments();
  s.polar((t) => R * (0.78 + 0.2 * Math.cos(8 * t)), 240, 0);
  s.polar((t) => R * (0.42 + 0.14 * Math.cos(6 * t)), 180, 0);
  s.circle(0, 0, R, 0, 96);
  return s.build();
}

/* ---------------------------------------------------------------- vessel */

export type VesselLines = {
  /** right-hand profile, base at y = 0 */
  right: [number, number, number][];
  left: [number, number, number][];
  height: number;
  sections: THREE.BufferGeometry;
};

/** A clean turned vessel: bezier profile, mirrored, with elliptical section rings. */
export function vesselLines(scale = 1): VesselLines {
  const v = (x: number, y: number) => new THREE.Vector2(x * scale, y * scale);
  const curves: THREE.Curve<THREE.Vector2>[] = [
    new THREE.LineCurve(v(0.3, 0), v(0.34, 0.06)),
    new THREE.CubicBezierCurve(v(0.34, 0.06), v(0.64, 0.16), v(0.62, 0.56), v(0.4, 0.8)),
    new THREE.CubicBezierCurve(v(0.4, 0.8), v(0.28, 0.93), v(0.16, 0.98), v(0.15, 1.1)),
    new THREE.LineCurve(v(0.15, 1.1), v(0.15, 1.34)),
    new THREE.CubicBezierCurve(v(0.15, 1.34), v(0.16, 1.41), v(0.22, 1.42), v(0.245, 1.47)),
  ];
  const right: [number, number, number][] = [];
  for (const c of curves) {
    const pts = c.getPoints(c instanceof THREE.LineCurve ? 1 : 14);
    for (let i = right.length === 0 ? 0 : 1; i < pts.length; i++) right.push([pts[i].x, pts[i].y, 0]);
  }
  const left = right.map(([x, y, z]) => [-x, y, z] as [number, number, number]);
  const s = new Segments();
  const squash = 0.3;
  const rings: Array<[number, number]> = [
    [0.06, 0.34],
    [0.42, 0.61],
    [0.8, 0.4],
    [1.1, 0.15],
    [1.47, 0.245],
  ];
  for (const [y, r] of rings) s.circle(0, y * scale, r * scale, 0, 64, squash);
  // foot ellipse doubled, like a turned base
  s.circle(0, 0, 0.3 * scale, 0, 64, squash);
  return { right, left, height: 1.47 * scale, sections: s.build() };
}

/* ---------------------------------------------------------------- ribbon */

/** A ribbon banner: flat in the middle, the ends folding back into the dark. */
export function ribbonGeometry(width: number, height: number) {
  const geo = new THREE.PlaneGeometry(width, height, 64, 4);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const half = width / 2;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const u = Math.abs(x) / half;
    const fold = smooth((u - 0.6) / 0.4);
    pos.setZ(i, -0.55 * fold);
    pos.setY(i, y - 0.06 * u * u + 0.12 * fold);
  }
  geo.computeVertexNormals();
  return geo;
}

function smooth(t: number) {
  const x = t < 0 ? 0 : t > 1 ? 1 : t;
  return x * x * (3 - 2 * x);
}

/* ---------------------------------------------------------------- sheets */

/** Faint rules on a typographic specimen sheet. */
export function sheetRules(w: number, h: number) {
  const s = new Segments();
  const z = 0.002;
  const x0 = -w / 2 + w * 0.1;
  const x1 = w / 2 - w * 0.1;
  for (let i = 0; i < 9; i++) {
    const y = -h / 2 + h * 0.1 + (i / 8) * h * 0.55;
    s.line(x0, y, z, i % 3 === 0 ? x1 : x0 + (x1 - x0) * 0.72, y, z);
  }
  s.line(x0, h / 2 - h * 0.1, z, x1, h / 2 - h * 0.1, z);
  s.line(x0, h / 2 - h * 0.13, z, x1, h / 2 - h * 0.13, z);
  return s.build();
}

/** Ruled legal-document lines with a double margin. */
export function ruledDocument(w: number, h: number, lines: number) {
  const s = new Segments();
  const z = 0.002;
  const x0 = -w / 2 + w * 0.07;
  const x1 = w / 2 - w * 0.06;
  for (let i = 0; i < lines; i++) {
    const y = h / 2 - h * 0.1 - (i / (lines - 1)) * h * 0.8;
    s.line(x0, y, z, x1, y, z);
  }
  s.line(x0 + w * 0.07, -h / 2, z, x0 + w * 0.07, h / 2, z);
  s.line(x0 + w * 0.08, -h / 2, z, x0 + w * 0.08, h / 2, z);
  return s.build();
}

/* ------------------------------------------------------------------- map */

export type IndiaMap = {
  land: THREE.ExtrudeGeometry;
  coast: THREE.BufferGeometry;
  contours: THREE.BufferGeometry;
  graticuleSheet: THREE.BufferGeometry;
  graticuleLand: THREE.BufferGeometry;
  markers: THREE.BufferGeometry;
  /** the conceptual highlight (map-local xy) */
  highlight: Pt;
  depth: number;
};

function inside(poly: Pt[], x: number, y: number) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

function resample(poly: Pt[], n: number): Pt[] {
  const lens: number[] = [];
  let total = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    lens.push(l);
    total += l;
  }
  const out: Pt[] = [];
  const step = total / n;
  let seg = 0;
  let acc = 0;
  for (let k = 0; k < n; k++) {
    const target = k * step;
    while (seg < poly.length - 1 && acc + lens[seg] < target) {
      acc += lens[seg];
      seg++;
    }
    const a = poly[seg];
    const b = poly[(seg + 1) % poly.length];
    const t = lens[seg] > 0 ? (target - acc) / lens[seg] : 0;
    out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
  }
  return out;
}

function smoothRing(ring: Pt[], passes: number): Pt[] {
  let r = ring;
  for (let p = 0; p < passes; p++) {
    const n = r.length;
    r = r.map((pt, i) => {
      const a = r[(i + n - 1) % n];
      const b = r[(i + 1) % n];
      return [(a[0] + pt[0] * 2 + b[0]) / 4, (a[1] + pt[1] * 2 + b[1]) / 4];
    });
  }
  return r;
}

/**
 * The tactile map: extruded land, coast line, topographic contours (shrunk, rounded and
 * noise-distorted copies of the outline clipped to the land), a graticule and engraved markers.
 */
export function indiaMap(S: number, depth = 0.05): IndiaMap {
  const unit = indiaUnitPolygon();
  const poly: Pt[] = unit.map(([x, y]) => [x * S, y * S]);
  const zTop = depth + 0.006;

  const shape = new THREE.Shape();
  poly.forEach(([x, y], i) => (i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y)));
  shape.closePath();
  const land = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 1 });

  const coastSeg = new Segments();
  coastSeg.poly(poly, zTop);

  // contours
  const contourSeg = new Segments();
  const src = resample(poly, 240);
  let cx = 0;
  let cy = 0;
  for (const [x, y] of src) {
    cx += x;
    cy += y;
  }
  cx /= src.length;
  cy /= src.length;
  let meanR = 0;
  for (const [x, y] of src) meanR += Math.hypot(x - cx, y - cy);
  meanR /= src.length;
  const levels = 8;
  for (let k = 1; k <= levels; k++) {
    const s = 1 - k * 0.105;
    const blend = 0.62 * (k / levels);
    const amp = 0.035 * S * (1 - 0.55 * (k / levels));
    let ring: Pt[] = src.map(([x, y]) => {
      const dx = x - cx;
      const dy = y - cy;
      const d = Math.hypot(dx, dy) || 1;
      const ux = dx / d;
      const uy = dy / d;
      const th = Math.atan2(dy, dx);
      let rx = cx + dx * s;
      let ry = cy + dy * s;
      const cr = meanR * s;
      rx += (cx + ux * cr - rx) * blend;
      ry += (cy + uy * cr - ry) * blend;
      const n = amp * (Math.sin(th * 5 + k * 1.9) + 0.55 * Math.sin(th * 11 - k * 0.7) + 0.35 * Math.sin(th * 19 + k * 2.3));
      return [rx + ux * n, ry + uy * n];
    });
    ring = smoothRing(ring, 2 + k);
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i];
      const b = ring[(i + 1) % ring.length];
      if (inside(poly, a[0], a[1]) && inside(poly, b[0], b[1])) contourSeg.line(a[0], a[1], zTop, b[0], b[1], zTop);
    }
  }

  // graticule: across the chart sheet, and a fainter copy clipped to the land
  const sheetSeg = new Segments();
  const landSeg = new Segments();
  const ext = S * 0.66;
  const step = S * 0.125;
  const sample = S * 0.015;
  for (let x = -ext; x <= ext + 1e-6; x += step) {
    sheetSeg.line(x, -ext, 0.004, x, ext, 0.004);
    for (let y = -ext; y < ext; y += sample) {
      if (inside(poly, x, y) && inside(poly, x, y + sample)) landSeg.line(x, y, zTop, x, y + sample, zTop);
    }
  }
  for (let y = -ext; y <= ext + 1e-6; y += step) {
    sheetSeg.line(-ext, y, 0.004, ext, y, 0.004);
    for (let x = -ext; x < ext; x += sample) {
      if (inside(poly, x, y) && inside(poly, x + sample, y)) landSeg.line(x, y, zTop, x + sample, y, zTop);
    }
  }

  // engraved place-marker glyphs at conceptual (pseudo-random) positions inside the land
  const markerSeg = new Segments();
  const rnd = prng(1961);
  let placed = 0;
  let guard = 0;
  const hl = toUnit(CONCEPTUAL_MARKER);
  const highlight: Pt = [hl[0] * S, hl[1] * S];
  while (placed < 9 && guard++ < 400) {
    const x = (rnd() - 0.5) * S * 0.9;
    const y = (rnd() - 0.5) * S * 0.9;
    if (!inside(poly, x, y)) continue;
    if (Math.hypot(x - highlight[0], y - highlight[1]) < S * 0.12) continue;
    markerGlyph(markerSeg, x, y, S * 0.014, zTop);
    placed++;
  }

  return {
    land,
    coast: coastSeg.build(),
    contours: contourSeg.build(),
    graticuleSheet: sheetSeg.build(),
    graticuleLand: landSeg.build(),
    markers: markerSeg.build(),
    highlight,
    depth,
  };
}

function markerGlyph(s: Segments, x: number, y: number, r: number, z: number) {
  s.circle(x, y, r, z, 16);
  s.line(x - r * 2.2, y, z, x - r * 1.3, y, z);
  s.line(x + r * 1.3, y, z, x + r * 2.2, y, z);
  s.line(x, y - r * 2.2, z, x, y - r * 1.3, z);
  s.line(x, y + r * 1.3, z, x, y + r * 2.2, z);
}

/** A stand-alone marker glyph (used by the highlight and the constellation). */
export function markerGlyphGeometry(r: number) {
  const s = new Segments();
  markerGlyph(s, 0, 0, r, 0);
  s.circle(0, 0, r * 3.2, 0, 48);
  return s.build();
}

/** Expanding halo ring for the highlight pulse. */
export function haloGeometry(r: number) {
  const s = new Segments();
  s.circle(0, 0, r, 0, 64);
  return s.build();
}

/* --------------------------------------------------------------- compass */

/** Compass rose: cardinal and ordinal points, rings and degree ticks. */
export function compassRose(R: number) {
  const s = new Segments();
  const z = 0;
  s.circle(0, 0, R * 0.42, z, 64);
  s.circle(0, 0, R * 0.98, z, 96);
  const point = (a: number, len: number, halfW: number) => {
    const c = Math.cos(a);
    const sn = Math.sin(a);
    const px = -sn;
    const py = c;
    const bx = c * R * 0.2;
    const by = sn * R * 0.2;
    const tx = c * len;
    const ty = sn * len;
    s.line(0, 0, z, bx + px * halfW, by + py * halfW, z);
    s.line(bx + px * halfW, by + py * halfW, z, tx, ty, z);
    s.line(tx, ty, z, bx - px * halfW, by - py * halfW, z);
    s.line(bx - px * halfW, by - py * halfW, z, 0, 0, z);
    s.line(0, 0, z, tx, ty, z);
  };
  for (let i = 0; i < 4; i++) point((i * Math.PI) / 2, R * 0.92, R * 0.1);
  for (let i = 0; i < 4; i++) point(Math.PI / 4 + (i * Math.PI) / 2, R * 0.62, R * 0.07);
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2;
    const r0 = i % 9 === 0 ? R * 0.88 : R * 0.93;
    s.line(Math.cos(a) * r0, Math.sin(a) * r0, z, Math.cos(a) * R * 0.98, Math.sin(a) * R * 0.98, z);
  }
  return s.build();
}

/* ------------------------------------------------------------ constellation */

export function pentagonPoints(radius: number): [number, number, number][] {
  const pts: [number, number, number][] = [];
  for (let i = 0; i < 5; i++) {
    const a = Math.PI / 2 + (i / 5) * Math.PI * 2;
    pts.push([Math.cos(a) * radius, Math.sin(a) * radius, 0]);
  }
  return pts;
}

/** Hairline pairs (for a segmented drei <Line>): the pentagon loop plus spokes to the centre. */
export function constellationSegments(radius: number): [number, number, number][] {
  const pts = pentagonPoints(radius);
  const out: [number, number, number][] = [];
  for (let i = 0; i < 5; i++) {
    out.push(pts[i], pts[(i + 1) % 5]);
    out.push(pts[i], [0, 0, 0]);
  }
  return out;
}

/** Faint rules for the small page motif. */
export function pageRules(w: number, h: number) {
  const s = new Segments();
  for (let i = 0; i < 6; i++) {
    const y = h * 0.32 - (i / 5) * h * 0.66;
    s.line(-w * 0.36, y, 0.002, i === 5 ? w * 0.05 : w * 0.36, y, 0.002);
  }
  return s.build();
}
