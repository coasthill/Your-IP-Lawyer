"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Text } from "@react-three/drei";
import { PALETTE, clamp01, lerp, ramp, smoothstep, window01 } from "../../story";
import { inRange, useStoryFrame } from "../shared/useStoryFrame";
import { brushedSteel, bronze, inkLine, parchment } from "../shared/materials";
import { centreDistance, meshedRotation, type GearSpec } from "../shared/gear";
import {
  ACT,
  CHARS_600,
  CHARS_MONO,
  FOCUS,
  FONT_600,
  FONT_MONO,
  IMPACT,
  disposeAll,
  easeOut,
  haltingProgress,
  safeScale,
  setTextOpacity,
} from "./anim";
import { blueprintDrawing, buildGear, gearFace } from "./builders";
import { ArcText } from "./ArcText";

/** All gears share one module (2r / teeth) so any pair meshes at centreDistance. */
const MODULE = 2 / 15;
/** Full turns of the big gear across the scene. */
const TURNS = 2.6;

type Node = { teeth: number; parent: number; angle: number; spokes: number; x?: number; y?: number };

/** The train: each gear meshes with `parent` at `angle` (radians from the parent's centre). */
const TRAIN: Node[] = [
  { teeth: 36, parent: -1, angle: 0, spokes: 6, x: -3.45, y: -0.35 },
  { teeth: 20, parent: 0, angle: 0.47, spokes: 5 },
  { teeth: 10, parent: 0, angle: -0.36, spokes: 0 },
  { teeth: 18, parent: 2, angle: -0.18, spokes: 5 },
  { teeth: 21, parent: 3, angle: 0.62, spokes: 5 },
  { teeth: 8, parent: 1, angle: 0.12, spokes: 0 },
  { teeth: 10, parent: 5, angle: 0.55, spokes: 0 },
  { teeth: 8, parent: 6, angle: 0.1, spokes: 0 },
  { teeth: 10, parent: 0, angle: 1.2, spokes: 0 },
];

type Gear = {
  spec: GearSpec;
  x: number;
  y: number;
  parent: number;
  /** phase so this gear's gaps meet the parent's teeth along the centre line */
  phase: number;
  /** scale and depth order once the train collapses into the rosette */
  rosetteScale: number;
  rosetteZ: number;
  face: number;
  rimRadius: number;
  rimTube: number;
  bossRadius: number;
};

function buildTrain(): Gear[] {
  const gears: Gear[] = [];
  for (let i = 0; i < TRAIN.length; i++) {
    const n = TRAIN[i];
    const radius = (n.teeth * MODULE) / 2;
    const depth = radius > 2 ? 0.36 : radius > 1 ? 0.28 : 0.2;
    const spec: GearSpec = { teeth: n.teeth, radius, depth, spokes: n.spokes };
    let x = n.x ?? 0;
    let y = n.y ?? 0;
    let phase = 0;
    if (n.parent >= 0) {
      const p = gears[n.parent];
      const d = centreDistance(p.spec, spec);
      x = p.x + Math.cos(n.angle) * d;
      y = p.y + Math.sin(n.angle) * d;
      // gearShape centres its tooth tips at (k + 0.375)·2π/T and its gaps at (k − 0.125)·2π/T;
      // this phase puts a tip of the parent into a gap of the child along the centre line.
      const ta = p.spec.teeth;
      const tb = n.teeth;
      phase = n.angle * (1 + ta / tb) + Math.PI - (3 * Math.PI) / (2 * tb);
    }
    gears.push({
      spec,
      x,
      y,
      parent: n.parent,
      phase,
      rosetteScale: Math.min(1, 1.48 / radius),
      rosetteZ: 0,
      face: gearFace(spec),
      rimRadius: radius * 0.84,
      rimTube: radius * 0.016 + 0.008,
      bossRadius: radius * 0.24,
    });
  }
  // rosette depth: largest at the back, smallest in front
  const order = gears.map((g, i) => i).sort((a, b) => gears[b].spec.radius - gears[a].spec.radius);
  order.forEach((gi, rank) => (gears[gi].rosetteZ = -0.28 + rank * 0.055));
  return gears;
}

const BLUEPRINT_LABELS: Array<{ text: string; x: number; y: number }> = [
  { text: "FIG. 1", x: -2.6, y: -3.55 },
  { text: "DIA. 4.36", x: -2.6, y: -2.78 },
  { text: "SECTION A-A", x: 4.3, y: -3.3 },
  { text: "FIG. 2", x: 4.6, y: 2.85 },
  { text: "SHEET 1 OF 1", x: 4.3, y: -4.42 },
  { text: "NO. 0042", x: 6.65, y: -3.77 },
];

/**
 * Scene 4 — THE PATENT MACHINE (0.42 → 0.56).
 * A heavy train of gears bursts out of the gavel's impact point, meshes, and turns with the scroll.
 * At the start of scene 5 the centres slide onto one axis and lock into a rosette.
 */
export function PatentMachine() {
  const root = useRef<THREE.Group>(null);
  const blueprint = useRef<THREE.Group>(null);
  const labels = useRef<THREE.Group>(null);
  const nodes = useRef<(THREE.Group | null)[]>([]);
  const drift = useRef(0);

  const a = useMemo(() => {
    const gears = buildTrain();
    const bodies = gears.map((g) => buildGear(g.spec));
    const rims = gears.map((g) => new THREE.TorusGeometry(g.rimRadius, g.rimTube, 10, Math.max(48, g.spec.teeth * 3)));
    const bosses = gears.map((g) => {
      const geo = new THREE.CylinderGeometry(g.bossRadius, g.bossRadius * 1.06, g.spec.depth * 1.7, 32);
      geo.rotateX(Math.PI / 2);
      return geo;
    });
    const pins = gears.map((g) => {
      const geo = new THREE.CylinderGeometry(g.spec.radius * 0.08, g.spec.radius * 0.08, g.spec.depth * 2.3, 16);
      geo.rotateX(Math.PI / 2);
      return geo;
    });
    const steel = brushedSteel();
    const pinSteel = brushedSteel({ color: "#8a8b90", roughness: 0.32 });
    const brass = bronze();
    const plane = new THREE.PlaneGeometry(16, 10.5);
    const planeMat = parchment({ color: "#6b5f4a", opacity: 0 });
    const drawing = blueprintDrawing();
    const drawingMat = inkLine({ color: PALETTE.bronze, opacity: 0 });
    const rot = new Float64Array(gears.length);
    return { gears, bodies, rims, bosses, pins, steel, pinSteel, brass, plane, planeMat, drawing, drawingMat, rot };
  }, []);

  useEffect(
    () => () => {
      disposeAll([...a.bodies, ...a.rims, ...a.bosses, ...a.pins, a.steel, a.pinSteel, a.brass, a.plane, a.planeMat, a.drawing, a.drawingMat]);
    },
    [a],
  );

  useStoryFrame((f) => {
    const p = f.p;
    const g = root.current;
    if (!g) return;
    const on = inRange(p, ACT.gears[0], ACT.gears[1]);
    g.visible = on;
    if (!on) return;

    // Rotation: driven by scroll (≈ TURNS of the big gear across the scene) plus a tiny idle drift,
    // decelerating to a halt as the train locks into the rosette.
    const lock = ramp(p, 0.555, 0.6);
    drift.current += f.dt * 0.06 * (1 - lock);
    const q = haltingProgress(p, 0.555, 0.6);
    const base = -(Math.max(0, q - 0.4) / 0.16) * TURNS * Math.PI * 2 - drift.current;
    const { gears, rot } = a;
    rot[0] = base;
    for (let i = 1; i < gears.length; i++) {
      const gi = gears[i];
      rot[i] = meshedRotation(rot[gi.parent], gears[gi.parent].spec.teeth, gi.spec.teeth, gi.phase);
    }

    for (let i = 0; i < gears.length; i++) {
      const node = nodes.current[i];
      if (!node) continue;
      const gi = gears[i];
      // burst out of the impact point, staggered
      const e = easeOut((p - (0.4 + i * 0.004)) / 0.05);
      // slide onto one axis at the start of scene 5
      const c = smoothstep((p - (0.55 + i * 0.003)) / 0.04);
      let x = lerp(IMPACT.x, gi.x, e);
      let y = lerp(IMPACT.y, gi.y, e);
      let z = lerp(IMPACT.z, 0, e);
      x = lerp(x, FOCUS.x, c);
      y = lerp(y, FOCUS.y, c);
      z = lerp(z, gi.rosetteZ, c);
      node.position.set(x, y, z);
      node.scale.setScalar(safeScale(e * lerp(1, gi.rosetteScale, c)));
      node.rotation.z = rot[i];
    }

    // Blueprint: fades in behind the machine, parallaxes slower than the gears, leaves before the plate.
    const lp = clamp01((p - 0.42) / 0.14);
    const bp = window01(p, 0.42, 0.5, 0.565, 0.615);
    a.planeMat.opacity = 0.35 * bp;
    a.drawingMat.opacity = 0.62 * bp;
    setTextOpacity(labels.current, 0.75 * bp);
    const b = blueprint.current;
    if (b) {
      b.position.x = -0.2 - lp * 0.55;
      b.position.y = 0.35 + lp * 0.2;
    }
  }, -5);

  return (
    <group ref={root} visible={false} name="patent-machine">
      {a.gears.map((gi, i) => (
        <group
          key={i}
          ref={(el) => {
            nodes.current[i] = el;
          }}
          scale={0.001}
        >
          <mesh geometry={a.bodies[i]} material={a.steel} />
          <mesh geometry={a.rims[i]} material={a.brass} position-z={gi.face + gi.rimTube * 0.35} />
          <mesh geometry={a.bosses[i]} material={a.brass} />
          <mesh geometry={a.pins[i]} material={a.pinSteel} />
          {i === 0 ? (
            <ArcText
              text="PATENT"
              radius={1.8}
              fontSize={0.24}
              spacing={0.05}
              font={FONT_600}
              characters={CHARS_600}
              color="#121214"
              z={gi.face + 0.01}
              outlineWidth="3.5%"
              outlineColor={PALETTE.bronze2}
              outlineOpacity={0.55}
              outlineOffsetX="1.2%"
              outlineOffsetY="-1.2%"
            />
          ) : null}
        </group>
      ))}

      <group ref={blueprint} position={[-0.2, 0.35, -2.4]}>
        <mesh geometry={a.plane} material={a.planeMat} />
        <lineSegments geometry={a.drawing} material={a.drawingMat} position-z={0.01} />
        <group ref={labels}>
          {BLUEPRINT_LABELS.map((l) => (
            <Text
              key={l.text}
              font={FONT_MONO}
              characters={CHARS_MONO}
              fontSize={0.2}
              letterSpacing={0.08}
              color={PALETTE.bronze}
              anchorX="center"
              anchorY="middle"
              position={[l.x, l.y, 0.012]}
              fillOpacity={0}
            >
              {l.text}
            </Text>
          ))}
        </group>
      </group>
    </group>
  );
}
