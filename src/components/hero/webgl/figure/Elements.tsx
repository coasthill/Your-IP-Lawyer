"use client";

import { Suspense, createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { PALETTE, lerp, ramp, smoothstep } from "../../story";
import { CONCEPTUAL_MARKER, indiaUnitPolygon, toUnit } from "../../india-outline";
import { gearShape } from "../shared/gear";
import { bronze, glowSprite, inkLine, moteMaterial, parchment } from "../shared/materials";
import { useActFrame } from "./act-clock";
import {
  CAPTION_HOLD,
  DISPLAY_LEFT,
  DISPLAY_RIGHT,
  FONT_DISPLAY,
  REST_SLOTS,
  STRIKE_POINT,
  T,
  cameraOrbit,
  captionAt,
  elementSide,
} from "./constants";
import { FadeSet, disposeAll } from "./fade";
import { easeOutBack, mulberry32 } from "./noise";

/**
 * THE FIVE SUBJECTS — each emerges from inside the gown on its caption's envelope, hangs readable
 * on the side opposite the caption for the hold, settles small and dim into an upper corner, and
 * at the strike is knocked back and dissolves to sparks. Every position is a pure function of
 * progress, so scrolling back replays the scene exactly.
 *
 *   0 Trade Marks   — circular registration seal (bronze ring, disc, engraved ®)
 *   1 Patents       — engineering sheet: gear drawing, dimension lines, title block
 *   2 Copyright     — three loose manuscript pages, tumbling
 *   3 Designs       — faceted ornamental form with a crisp specular edge
 *   4 GI            — map fragment with contour lines and one glowing marker
 */

const ElementFadeContext = createContext<FadeSet | null>(null);

type TroikaText = THREE.Mesh & { fillOpacity: number };
type MaterialEntry = [THREE.Material, number];

function useElementFade(): FadeSet {
  const fade = useContext(ElementFadeContext);
  if (!fade) throw new Error("Element visuals must be rendered inside <IPElement>.");
  return fade;
}

function useFadeMaterials(fade: FadeSet, entries: MaterialEntry[]) {
  useEffect(() => {
    for (const [m, base] of entries) fade.add(m, base);
    return () => {
      for (const [m] of entries) fade.remove(m);
    };
  }, [fade, entries]);
}

/** Tiny builder for engraved line drawings (LineSegments). */
class Segments {
  private readonly data: number[] = [];
  seg(x1: number, y1: number, x2: number, y2: number, z = 0) {
    this.data.push(x1, y1, z, x2, y2, z);
  }
  rect(x1: number, y1: number, x2: number, y2: number) {
    this.seg(x1, y1, x2, y1);
    this.seg(x2, y1, x2, y2);
    this.seg(x2, y2, x1, y2);
    this.seg(x1, y2, x1, y1);
  }
  loop(points: ArrayLike<[number, number]>, ox = 0, oy = 0) {
    const n = points.length;
    for (let i = 0; i < n; i++) {
      const a = points[i];
      const b = points[(i + 1) % n];
      this.seg(a[0] + ox, a[1] + oy, b[0] + ox, b[1] + oy);
    }
  }
  circle(cx: number, cy: number, r: number, n: number, dashed = false) {
    for (let i = 0; i < n; i++) {
      if (dashed && i % 2 === 1) continue;
      const a0 = (i / n) * Math.PI * 2;
      const a1 = ((i + 1) / n) * Math.PI * 2;
      this.seg(cx + Math.cos(a0) * r, cy + Math.sin(a0) * r, cx + Math.cos(a1) * r, cy + Math.sin(a1) * r);
    }
  }
  /** centre line: long dash, short dash pattern */
  centreLine(x1: number, y1: number, x2: number, y2: number) {
    const steps = 12;
    for (let i = 0; i < steps; i++) {
      if (i % 3 === 2) continue;
      const t0 = i / steps;
      const t1 = (i + (i % 3 === 0 ? 0.85 : 0.5)) / steps;
      this.seg(lerp(x1, x2, t0), lerp(y1, y2, t0), lerp(x1, x2, t1), lerp(y1, y2, t1));
    }
  }
  build(): THREE.BufferGeometry {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(this.data), 3));
    return geo;
  }
}

/* ------------------------------------------------------------------ */
/* Envelope: emerge → hold → settle → knocked back → dissolve           */
/* ------------------------------------------------------------------ */

function IPElement({ index, children }: { index: number; children: React.ReactNode }) {
  const [fade] = useState(() => new FadeSet());
  const groupRef = useRef<THREE.Group>(null);
  const [vec] = useState(() => ({
    origin: new THREE.Vector3(),
    display: elementSide(index) < 0 ? DISPLAY_LEFT : DISPLAY_RIGHT,
    rest: REST_SLOTS[index],
    away: new THREE.Vector3().subVectors(REST_SLOTS[index], STRIKE_POINT).normalize(),
    pos: new THREE.Vector3(),
    tmp: new THREE.Vector3(),
  }));

  useActFrame((a) => {
    const g = groupRef.current;
    if (!g) return;
    const p = a.p;
    const side = elementSide(index);
    const c = captionAt(index);
    // emerges as its caption fades in, arrives just after the previous caption has gone
    const emergeA = c - 0.024;
    const emergeB = c + 0.008;
    // settles as the caption fades, ahead of the next subject
    const settleA = c + CAPTION_HOLD + 0.006;
    const settleB = c + 0.07;

    const e = ramp(p, emergeA, emergeB);
    const s = smoothstep(ramp(p, settleA, settleB));
    const knock = ramp(p, T.strike, T.strike + 0.03);
    const dissolve = ramp(p, T.strike, T.dissolveEnd);
    const alive = p > emergeA && dissolve < 1 && a.fade > 0;
    g.visible = alive;
    if (!alive) {
      fade.apply(0);
      return;
    }

    // Born inside the gown volume (follows the figure), rises out over the shoulder along a high arc
    // to the display slot — the arc keeps it above the caption block the whole way.
    const fp = a.figurePos;
    vec.origin.set(fp.x + side * 0.12, fp.y + 1.05, fp.z + 0.18);
    const ee = smoothstep(e);
    vec.pos.lerpVectors(vec.origin, vec.display, ee);
    vec.pos.y += Math.sin(e * Math.PI) * 0.7;
    vec.pos.y += Math.sin(a.t * 0.9 + index * 1.7) * 0.03 * (1 - s);

    // Settle to the corner as the next subject emerges.
    vec.tmp.copy(vec.rest);
    vec.tmp.y += Math.sin(a.t * 0.6 + index) * 0.02;
    vec.pos.lerp(vec.tmp, s);

    // The gavel: knocked away from the impact, dropping as it goes.
    if (knock > 0) {
      vec.pos.addScaledVector(vec.away, knock * 1.6);
      vec.pos.y -= knock * knock * 0.45;
    }
    g.position.copy(vec.pos);

    const scale = easeOutBack(e, 1.3) * lerp(1, 0.52, s) * (1 - dissolve * dissolve);
    g.scale.setScalar(Math.max(scale, 0.001));
    g.rotation.set((1 - ee) * 0.25, cameraOrbit(p) + (1 - ee) * side * 1.1 + knock * side * 1.4, (1 - ee) * 0.3 * side + knock * 0.5);

    const alpha = ramp(p, emergeA, emergeA + 0.014) * lerp(1, 0.42, s) * (1 - ramp(p, T.strike, T.strike + 0.024)) * a.fade;
    fade.apply(alpha);
  });

  return (
    <ElementFadeContext.Provider value={fade}>
      <group ref={groupRef} visible={false}>
        {children}
      </group>
    </ElementFadeContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/* 0 · Trade Marks — the registration seal                              */
/* ------------------------------------------------------------------ */

function buildSeal() {
  const ring = new THREE.TorusGeometry(0.36, 0.028, 14, 80);
  const disc = new THREE.CylinderGeometry(0.335, 0.335, 0.02, 64);
  disc.rotateX(Math.PI / 2);
  const inner = new THREE.TorusGeometry(0.265, 0.007, 8, 80);
  const ticks = new Segments();
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    const r0 = i % 4 === 0 ? 0.285 : 0.3;
    ticks.seg(Math.cos(a) * r0, Math.sin(a) * r0, Math.cos(a) * 0.318, Math.sin(a) * 0.318, 0.012);
  }
  const tickGeo = ticks.build();
  const bronzeA = bronze({ roughness: 0.34 });
  const bronzeB = bronze({ color: "#5c4631", roughness: 0.56 });
  const tickMat = inkLine({ color: PALETTE.bronze2, opacity: 0.5 });
  const textMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(PALETTE.bronze2), metalness: 0.7, roughness: 0.4, transparent: true });
  const entries: MaterialEntry[] = [
    [bronzeA, 1],
    [bronzeB, 1],
    [tickMat, 0.5],
  ];
  return { ring, disc, inner, tickGeo, bronzeA, bronzeB, tickMat, textMat, entries };
}

function Seal() {
  const fade = useElementFade();
  const [rig] = useState(buildSeal);
  useEffect(() => () => disposeAll(rig), [rig]);
  useFadeMaterials(fade, rig.entries);
  const textRef = useCallback(
    (obj: TroikaText | null) => {
      fade.addText(obj);
      return () => fade.removeText(obj);
    },
    [fade],
  );
  const spin = useRef<THREE.Group>(null);
  useActFrame((a) => {
    const g = spin.current;
    if (!g) return;
    g.rotation.y = Math.sin(a.t * 0.45) * 0.28;
    g.rotation.z = Math.sin(a.t * 0.3 + 1) * 0.05;
  });
  return (
    <group ref={spin}>
      <mesh geometry={rig.ring} material={rig.bronzeA} />
      <mesh geometry={rig.disc} material={rig.bronzeB} />
      <mesh geometry={rig.inner} material={rig.bronzeA} position-z={0.012} />
      <lineSegments geometry={rig.tickGeo} material={rig.tickMat} />
      <Suspense fallback={null}>
        <Text
          ref={textRef}
          font={FONT_DISPLAY}
          fontSize={0.34}
          material={rig.textMat}
          anchorX="center"
          anchorY="middle"
          position-z={0.022}
          position-y={0.01}
          fillOpacity={0}
        >
          ®
        </Text>
      </Suspense>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* 1 · Patents — the engineering sheet                                  */
/* ------------------------------------------------------------------ */

function buildPatentSheet() {
  const sheet = new THREE.PlaneGeometry(0.98, 0.74);
  const sheetMat = parchment({ opacity: 0.92 });
  const S = new Segments();
  S.rect(-0.46, -0.34, 0.46, 0.34);
  S.rect(-0.45, -0.33, 0.45, 0.33);

  // the gear, drawn from the same profile the machine act extrudes
  const cx = -0.14;
  const cy = 0.05;
  const shape = gearShape({ teeth: 12, radius: 0.19, depth: 0, hole: 0.035 });
  S.loop(shape.getPoints(1).map((p) => [p.x, p.y] as [number, number]), cx, cy);
  const hole = shape.holes[0];
  if (hole) S.loop(hole.getPoints(20).map((p) => [p.x, p.y] as [number, number]), cx, cy);
  S.circle(cx, cy, 0.19, 72, true); // pitch circle
  S.circle(cx, cy, 0.075, 36); // hub
  S.centreLine(cx - 0.27, cy, cx + 0.27, cy);
  S.centreLine(cx, cy - 0.27, cx, cy + 0.27);

  // dimension lines with ticks and extension lines
  const dy = cy - 0.285;
  S.seg(cx - 0.21, dy, cx + 0.21, dy);
  S.seg(cx - 0.21, dy - 0.02, cx - 0.21, dy + 0.02);
  S.seg(cx + 0.21, dy - 0.02, cx + 0.21, dy + 0.02);
  S.seg(cx - 0.21, cy - 0.2, cx - 0.21, dy - 0.03);
  S.seg(cx + 0.21, cy - 0.2, cx + 0.21, dy - 0.03);
  const dx = cx + 0.29;
  S.seg(dx, cy - 0.19, dx, cy + 0.19);
  S.seg(dx - 0.02, cy - 0.19, dx + 0.02, cy - 0.19);
  S.seg(dx - 0.02, cy + 0.19, dx + 0.02, cy + 0.19);

  // section detail with hatching, top right
  S.rect(0.22, 0.13, 0.42, 0.3);
  for (let x = 0.22; x < 0.42 + 0.17; x += 0.03) {
    const x0 = Math.max(0.22, x - 0.17);
    const y0 = 0.13 + (x0 - (x - 0.17));
    const x1 = Math.min(0.42, x);
    const y1 = 0.3 - (x - x1);
    if (x1 > x0) S.seg(x0, y0, x1, y1);
  }

  // title block
  S.rect(0.16, -0.32, 0.44, -0.18);
  S.seg(0.16, -0.25, 0.44, -0.25);
  S.seg(0.3, -0.32, 0.3, -0.18);
  S.seg(0.18, -0.215, 0.27, -0.215);
  S.seg(0.18, -0.29, 0.25, -0.29);
  S.seg(0.32, -0.215, 0.41, -0.215);
  S.seg(0.32, -0.29, 0.37, -0.29);

  const lines = S.build();
  const lineMat = inkLine({ opacity: 0.78 });
  const entries: MaterialEntry[] = [
    [sheetMat, 0.92],
    [lineMat, 0.78],
  ];
  return { sheet, sheetMat, lines, lineMat, entries };
}

function PatentSheet() {
  const fade = useElementFade();
  const [rig] = useState(buildPatentSheet);
  useEffect(() => () => disposeAll(rig), [rig]);
  useFadeMaterials(fade, rig.entries);
  const ref = useRef<THREE.Group>(null);
  useActFrame((a) => {
    const g = ref.current;
    if (!g) return;
    g.rotation.x = Math.sin(a.t * 0.35) * 0.06;
    g.rotation.y = Math.sin(a.t * 0.25 + 2) * 0.12;
  });
  return (
    <group ref={ref}>
      <mesh geometry={rig.sheet} material={rig.sheetMat} />
      <lineSegments geometry={rig.lines} material={rig.lineMat} position-z={0.003} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* 2 · Copyright — loose manuscript pages                               */
/* ------------------------------------------------------------------ */

const PAGE_LAYOUT = [
  { pos: [-0.2, 0.12, -0.08], rot: [0.1, -0.25, 0.12] },
  { pos: [0.14, -0.02, 0.06], rot: [-0.08, 0.2, -0.18] },
  { pos: [-0.03, -0.22, 0.18], rot: [0.15, 0.05, 0.06] },
] as const;

function buildPages() {
  const rnd = mulberry32(0xc0f1);
  const page = new THREE.PlaneGeometry(0.4, 0.54);
  const pageMat = parchment({ opacity: 0.9 });
  const lineMat = inkLine({ opacity: 0.5 });
  const lines = PAGE_LAYOUT.map((_, i) => {
    const S = new Segments();
    for (let r = 0; r < 10; r++) {
      const y = 0.2 - r * 0.042;
      const w = r === 0 ? 0.16 : 0.28 * (0.62 + 0.38 * rnd());
      const x0 = r === 0 ? -0.06 : -0.15;
      S.seg(x0, y, x0 + w, y, 0.002);
    }
    if (i === 0) S.seg(-0.15, -0.23, 0.02, -0.23, 0.002);
    return S.build();
  });
  const entries: MaterialEntry[] = [
    [pageMat, 0.9],
    [lineMat, 0.5],
  ];
  return { page, pageMat, lineMat, lines, entries };
}

function Pages() {
  const fade = useElementFade();
  const [rig] = useState(buildPages);
  useEffect(() => () => disposeAll(rig), [rig]);
  useFadeMaterials(fade, rig.entries);
  const refs = useRef<(THREE.Group | null)[]>([]);
  useActFrame((a) => {
    for (let i = 0; i < PAGE_LAYOUT.length; i++) {
      const g = refs.current[i];
      if (!g) continue;
      const L = PAGE_LAYOUT[i];
      g.rotation.set(
        L.rot[0] + Math.sin(a.t * 0.33 + i) * 0.22,
        L.rot[1] + Math.sin(a.t * 0.21 + i * 2.1) * 0.3,
        L.rot[2] + Math.sin(a.t * 0.27 + i * 1.3) * 0.18,
      );
      g.position.set(L.pos[0], L.pos[1] + Math.sin(a.t * 0.5 + i * 1.7) * 0.03, L.pos[2]);
    }
  });
  return (
    <group>
      {PAGE_LAYOUT.map((L, i) => (
        <group
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          position={[L.pos[0], L.pos[1], L.pos[2]]}
          rotation={[L.rot[0], L.rot[1], L.rot[2]]}
        >
          <mesh geometry={rig.page} material={rig.pageMat} />
          <lineSegments geometry={rig.lines[i]} material={rig.lineMat} />
        </group>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* 3 · Designs — the faceted ornament                                   */
/* ------------------------------------------------------------------ */

function buildOrnament() {
  const solid = new THREE.IcosahedronGeometry(0.27, 0);
  const edges = new THREE.EdgesGeometry(solid, 1);
  const orbit = new THREE.TorusGeometry(0.4, 0.004, 6, 96);
  const metal = bronze({ roughness: 0.2 });
  metal.flatShading = true;
  const edgeMat = new THREE.LineBasicMaterial({ color: new THREE.Color(PALETTE.bronze2), transparent: true, opacity: 0.38 });
  const orbitMat = bronze({ color: PALETTE.bronze2, roughness: 0.3 });
  const entries: MaterialEntry[] = [
    [metal, 1],
    [edgeMat, 0.38],
    [orbitMat, 1],
  ];
  return { solid, edges, orbit, metal, edgeMat, orbitMat, entries };
}

function Ornament() {
  const fade = useElementFade();
  const [rig] = useState(buildOrnament);
  useEffect(() => () => disposeAll(rig), [rig]);
  useFadeMaterials(fade, rig.entries);
  const body = useRef<THREE.Group>(null);
  const orbit = useRef<THREE.Mesh>(null);
  useActFrame((a) => {
    if (body.current) body.current.rotation.set(0.45 + Math.sin(a.t * 0.3) * 0.15, a.t * 0.35, 0);
    if (orbit.current) orbit.current.rotation.set(1.2 + Math.sin(a.t * 0.2) * 0.2, a.t * 0.18, 0.3);
  });
  return (
    <group>
      <group ref={body}>
        <mesh geometry={rig.solid} material={rig.metal} />
        <lineSegments geometry={rig.edges} material={rig.edgeMat} scale={1.004} />
      </group>
      <mesh ref={orbit} geometry={rig.orbit} material={rig.orbitMat} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* 4 · Geographical Indications — the map fragment                      */
/* ------------------------------------------------------------------ */

const MAP_SCALE = 1.1;

function buildMap() {
  const polygon = indiaUnitPolygon();
  const scaled = polygon.map(([x, y]) => [x * MAP_SCALE, y * MAP_SCALE] as [number, number]);
  const shape = new THREE.Shape(scaled.map(([x, y]) => new THREE.Vector2(x, y)));
  const land = new THREE.ShapeGeometry(shape, 1);
  const landMat = parchment({ opacity: 0.93 });

  let cx = 0;
  let cy = 0;
  for (const [x, y] of scaled) {
    cx += x;
    cy += y;
  }
  cx /= scaled.length;
  cy /= scaled.length;
  const S = new Segments();
  S.loop(scaled, 0, 0);
  for (const k of [0.8, 0.62, 0.45, 0.3]) {
    S.loop(
      scaled.map(([x, y]) => [cx + (x - cx) * k, cy + (y - cy) * k] as [number, number]),
      0,
      0,
    );
  }
  const contours = S.build();
  const contourMat = inkLine({ opacity: 0.55 });
  const [mx, my] = toUnit(CONCEPTUAL_MARKER);
  const marker = new THREE.Vector3(mx * MAP_SCALE, my * MAP_SCALE, 0.02);
  const glow = glowSprite(PALETTE.keyLight, 0.9);
  const ringGeo = new THREE.TorusGeometry(0.035, 0.004, 6, 40);
  const ringMat = bronze({ color: PALETTE.bronze2, roughness: 0.3 });
  const entries: MaterialEntry[] = [
    [landMat, 0.93],
    [contourMat, 0.55],
    [glow, 0.9],
    [ringMat, 1],
  ];
  return { land, landMat, contours, contourMat, marker, glow, ringGeo, ringMat, entries };
}

function MapFragment() {
  const fade = useElementFade();
  const [rig] = useState(buildMap);
  useEffect(() => () => disposeAll(rig), [rig]);
  useFadeMaterials(fade, rig.entries);
  const tilt = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Sprite>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  useActFrame((a) => {
    if (tilt.current) tilt.current.rotation.set(-0.35 + Math.sin(a.t * 0.3) * 0.05, Math.sin(a.t * 0.22) * 0.1, 0);
    const pulse = 0.5 + 0.5 * Math.sin(a.t * 2.2);
    if (glowRef.current) {
      const s = 0.13 + pulse * 0.06;
      glowRef.current.scale.set(s, s, 1);
    }
    if (ringRef.current) ringRef.current.scale.setScalar(1 + pulse * 0.25);
  });
  return (
    <group ref={tilt} rotation-x={-0.35}>
      <mesh geometry={rig.land} material={rig.landMat} />
      <lineSegments geometry={rig.contours} material={rig.contourMat} position-z={0.003} />
      <sprite ref={glowRef} material={rig.glow} position={[rig.marker.x, rig.marker.y, rig.marker.z]} scale={[0.15, 0.15, 1]} />
      <mesh ref={ringRef} geometry={rig.ringGeo} material={rig.ringMat} position={[rig.marker.x, rig.marker.y, 0.01]} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Sparks — what the objects become after the strike                    */
/* ------------------------------------------------------------------ */

const SPARKS_PER = 48;
const SPARK_COUNT = SPARKS_PER * REST_SLOTS.length;

function buildSparks() {
  const rnd = mulberry32(0x5a2c);
  const dirs = new Float32Array(SPARK_COUNT * 3);
  const speed = new Float32Array(SPARK_COUNT);
  const tmp = new THREE.Vector3();
  for (let e = 0; e < REST_SLOTS.length; e++) {
    tmp.subVectors(REST_SLOTS[e], STRIKE_POINT).normalize();
    for (let j = 0; j < SPARKS_PER; j++) {
      const i = e * SPARKS_PER + j;
      const rx = rnd() * 2 - 1;
      const ry = rnd() * 2 - 1;
      const rz = rnd() * 2 - 1;
      const len = Math.hypot(rx, ry, rz) || 1;
      dirs[i * 3] = rx / len + tmp.x * 0.9;
      dirs[i * 3 + 1] = ry / len + tmp.y * 0.6 + 0.3;
      dirs[i * 3 + 2] = rz / len + tmp.z * 0.9;
      speed[i] = 0.5 + rnd() * 1.4;
    }
  }
  const positions = new Float32Array(SPARK_COUNT * 3);
  const geometry = new THREE.BufferGeometry();
  const attr = new THREE.BufferAttribute(positions, 3);
  attr.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute("position", attr);
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 1, -1), 8);
  const material = moteMaterial(PALETTE.keyLight, 0.038);
  material.opacity = 0;
  return { dirs, speed, positions, attr, geometry, material };
}

function Sparks() {
  const [rig] = useState(buildSparks);
  useEffect(() => () => disposeAll(rig), [rig]);
  const ref = useRef<THREE.Points>(null);
  useActFrame((a) => {
    const pts = ref.current;
    if (!pts) return;
    const spread = ramp(a.p, T.strike + 0.004, T.dissolveEnd);
    const live = a.p > T.strike + 0.004 && spread < 1;
    pts.visible = live;
    if (!live) return;
    const { dirs, speed, positions } = rig;
    const travel = 0.12 + spread * 1.6;
    for (let e = 0; e < REST_SLOTS.length; e++) {
      const slot = REST_SLOTS[e];
      for (let j = 0; j < SPARKS_PER; j++) {
        const i = e * SPARKS_PER + j;
        const i3 = i * 3;
        const s = speed[i] * travel;
        positions[i3] = slot.x + dirs[i3] * s;
        positions[i3 + 1] = slot.y + dirs[i3 + 1] * s - spread * spread * 0.9;
        positions[i3 + 2] = slot.z + dirs[i3 + 2] * s;
      }
    }
    rig.attr.needsUpdate = true;
    const k = 1 - spread;
    rig.material.opacity = k * k * 0.95 * ramp(a.p, T.strike, T.strike + 0.01) * a.fade;
  });
  return <points ref={ref} geometry={rig.geometry} material={rig.material} frustumCulled={false} visible={false} />;
}

/* ------------------------------------------------------------------ */

export function IPElements() {
  return (
    <group>
      <IPElement index={0}>
        <Seal />
      </IPElement>
      <IPElement index={1}>
        <PatentSheet />
      </IPElement>
      <IPElement index={2}>
        <Pages />
      </IPElement>
      <IPElement index={3}>
        <Ornament />
      </IPElement>
      <IPElement index={4}>
        <MapFragment />
      </IPElement>
      <Sparks />
    </group>
  );
}
