"use client";

import * as THREE from "three";

export type GearSpec = {
  teeth: number;
  /** pitch radius (distance to tooth mid-height) */
  radius: number;
  /** extrusion depth */
  depth: number;
  /** tooth height as a fraction of radius */
  toothDepth?: number;
  /** hub hole radius (0 = none) */
  hole?: number;
  /** number of lightening spokes/cut-outs (0 = solid disc) */
  spokes?: number;
};

/** Builds an involute-ish gear profile as a THREE.Shape. */
export function gearShape(spec: GearSpec): THREE.Shape {
  const { teeth, radius } = spec;
  const td = (spec.toothDepth ?? 0.18) * radius;
  const rOuter = radius + td * 0.5;
  const rInner = radius - td * 0.5;
  const shape = new THREE.Shape();
  const steps = teeth * 4;
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const phase = i % 4;
    // 4 samples per tooth: root, flank-up, tip, flank-down → trapezoidal teeth
    let r: number;
    if (phase === 0) r = rInner;
    else if (phase === 1) r = rOuter * 0.985;
    else if (phase === 2) r = rOuter;
    else r = rInner * 1.01;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();

  const hole = spec.hole ?? radius * 0.12;
  if (hole > 0) {
    const h = new THREE.Path();
    h.absarc(0, 0, hole, 0, Math.PI * 2, true);
    shape.holes.push(h);
  }
  const spokes = spec.spokes ?? 0;
  if (spokes > 0) {
    const r0 = hole + radius * 0.18;
    const r1 = rInner - radius * 0.22;
    if (r1 > r0) {
      const gap = 0.16; // angular half-width of the spoke
      for (let s = 0; s < spokes; s++) {
        const a0 = (s / spokes) * Math.PI * 2 + gap;
        const a1 = ((s + 1) / spokes) * Math.PI * 2 - gap;
        const cut = new THREE.Path();
        cut.absarc(0, 0, r0, a0, a1, false);
        cut.absarc(0, 0, r1, a1, a0, true);
        cut.closePath();
        shape.holes.push(cut);
      }
    }
  }
  return shape;
}

export function gearGeometry(spec: GearSpec): THREE.ExtrudeGeometry {
  const geo = new THREE.ExtrudeGeometry(gearShape(spec), {
    depth: spec.depth,
    bevelEnabled: true,
    bevelThickness: spec.depth * 0.08,
    bevelSize: spec.radius * 0.015,
    bevelSegments: 2,
    curveSegments: 6,
  });
  geo.center();
  return geo;
}

/**
 * Meshing helper: for two gears in contact, angular speed ratio = -teethA/teethB.
 * Returns the rotation for gear B given gear A's rotation (both in radians), with tooth phase alignment.
 */
export function meshedRotation(rotationA: number, teethA: number, teethB: number, phaseOffset = 0) {
  return -rotationA * (teethA / teethB) + Math.PI / teethB + phaseOffset;
}

/** Centre distance for two meshing gears. */
export function centreDistance(a: GearSpec, b: GearSpec) {
  return a.radius + b.radius;
}
