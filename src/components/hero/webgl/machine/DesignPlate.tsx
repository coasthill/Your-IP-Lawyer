"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Line } from "@react-three/drei";
import type { Line2 } from "three-stdlib";
import { PALETTE, lerp, smoothstep } from "../../story";
import { inRange, useStoryFrame } from "../shared/useStoryFrame";
import { brushedSteel, bronze, inkLine } from "../shared/materials";
import { ACT, FOCUS, disposeAll, easeOut, safeScale } from "./anim";
import { guilloche, latheRings, vesselLines } from "./builders";
import { sweepLineMaterial } from "./surfaces";

const PLATE_R = 1.72;
/** Where the key light sits, as an angle on the plate face (upper-left). */
const LIGHT_ANGLE = 2.25;

/**
 * Scene 5 — DESIGN (0.56 → 0.67).
 * The rosette of gears becomes a rotating turned-metal plate. A light band sweeps across the
 * plate and reveals an engraved lotus guilloché; a product silhouette rises above it.
 * Towards scene 6 the plate rises back to face the camera, flattens and warms, and is covered
 * by the trade mark emblem.
 */
export function DesignPlate() {
  const root = useRef<THREE.Group>(null);
  const plate = useRef<THREE.Group>(null);
  const vessel = useRef<THREE.Group>(null);
  const right = useRef<Line2>(null);
  const left = useRef<Line2>(null);
  const spin = useRef(0);

  const a = useMemo(() => {
    const plateGeo = new THREE.CylinderGeometry(PLATE_R, PLATE_R, 0.14, 128);
    plateGeo.rotateX(Math.PI / 2);
    const plateMat = brushedSteel({ roughness: 0.3 });
    const rimGeo = new THREE.TorusGeometry(PLATE_R * 0.975, 0.028, 10, 160);
    const bossGeo = new THREE.CylinderGeometry(0.22, 0.25, 0.07, 48);
    bossGeo.rotateX(Math.PI / 2);
    const pinGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.2, 20);
    pinGeo.rotateX(Math.PI / 2);
    const brass = bronze();
    const pinSteel = brushedSteel({ color: "#8a8b90", roughness: 0.32 });
    const lathe = latheRings(PLATE_R);
    const latheMat = inkLine({ color: "#a2a3aa", opacity: 0 });
    const ornament = guilloche(PLATE_R * 0.93);
    const ornamentMat = sweepLineMaterial(PALETTE.bronze2);
    const v = vesselLines(1);
    const sectionMat = inkLine({ color: PALETTE.bronze, opacity: 0 });
    const steelColor = new THREE.Color(PALETTE.steel);
    const warmColor = new THREE.Color("#8c7256");
    return { plateGeo, plateMat, rimGeo, bossGeo, pinGeo, brass, pinSteel, lathe, latheMat, ornament, ornamentMat, vessel: v, sectionMat, steelColor, warmColor };
  }, []);

  useEffect(
    () => () => {
      disposeAll([a.plateGeo, a.plateMat, a.rimGeo, a.bossGeo, a.pinGeo, a.brass, a.pinSteel, a.lathe, a.latheMat, a.ornament, a.ornamentMat, a.vessel.sections, a.sectionMat]);
    },
    [a],
  );

  useStoryFrame((f) => {
    const p = f.p;
    const g = root.current;
    const pl = plate.current;
    if (!g || !pl) return;
    const on = inRange(p, ACT.design[0], ACT.design[1]);
    g.visible = on;
    if (!on) return;

    const appear = easeOut((p - 0.582) / 0.035); // grows out of the rosette's centre
    const settle = smoothstep((p - 0.62) / 0.045); // tilts back and drops: a turntable
    const toEmblem = smoothstep((p - 0.668) / 0.04); // rises, flattens, warms
    const cover = smoothstep((p - 0.695) / 0.03); // shrinks under the emblem
    const turntable = settle * (1 - toEmblem);

    spin.current += f.dt * 0.12;
    const rz = -(p - 0.58) * 10 - spin.current;

    pl.position.set(0, FOCUS.y - 0.75 * turntable, 0.32 + 0.2 * turntable);
    pl.rotation.x = -0.7 * turntable;
    pl.rotation.z = rz;
    const s = safeScale(appear * lerp(1, 0.8, turntable) * lerp(1, 0.55, cover));
    pl.scale.set(s, s, s * lerp(1, 0.3, toEmblem));

    // the metal warms as it turns into an emblem
    a.plateMat.color.copy(a.steelColor).lerp(a.warmColor, toEmblem * 0.85);
    a.plateMat.roughness = 0.3 + 0.14 * toEmblem;
    a.latheMat.opacity = 0.16 * appear * (1 - toEmblem);

    // the ornament is revealed by one pass of the light band, which then hovers under the key light
    const reveal = smoothstep((p - 0.612) / 0.06);
    const pass = smoothstep((p - 0.612) / 0.085);
    const bandWorld = LIGHT_ANGLE - Math.PI + Math.PI * 2 * pass + Math.sin(f.t * 0.5) * 0.35 * pass;
    const u = a.ornamentMat.uniforms;
    u.uBand.value = bandWorld - rz;
    u.uWidth.value = 1.05;
    u.uBase.value = 0.3 * reveal * (1 - toEmblem);
    u.uPeak.value = 0.95 * reveal * (1 - toEmblem);

    // the product silhouette rises from the plate, then sinks away before the emblem
    const rise = easeOut((p - 0.632) / 0.045);
    const sink = smoothstep((p - 0.664) / 0.03);
    const vs = vessel.current;
    if (vs) {
      vs.position.set(0, FOCUS.y - 0.75 * turntable + 0.02, 0.32 + 0.2 * turntable + 0.1);
      vs.scale.set(1, safeScale(rise * (1 - sink * 0.5)), 1);
      const op = rise * (1 - sink);
      if (right.current) right.current.material.opacity = 0.95 * op;
      if (left.current) left.current.material.opacity = 0.95 * op;
      a.sectionMat.opacity = 0.42 * op;
    }
  }, -5);

  return (
    <group ref={root} visible={false} name="design-plate">
      <group ref={plate} position={[0, FOCUS.y, 0.32]} scale={0.001}>
        <mesh geometry={a.plateGeo} material={a.plateMat} />
        <mesh geometry={a.rimGeo} material={a.brass} position-z={0.075} />
        <lineSegments geometry={a.lathe} material={a.latheMat} position-z={0.076} />
        <lineSegments geometry={a.ornament} material={a.ornamentMat} position-z={0.078} />
        <mesh geometry={a.bossGeo} material={a.brass} position-z={0.09} />
        <mesh geometry={a.pinGeo} material={a.pinSteel} position-z={0.1} />
      </group>

      <group ref={vessel} position={[0, FOCUS.y, 0.42]}>
        <Line ref={right} points={a.vessel.right} color={PALETTE.bronze2} lineWidth={1.5} transparent opacity={0} depthWrite={false} />
        <Line ref={left} points={a.vessel.left} color={PALETTE.bronze2} lineWidth={1.5} transparent opacity={0} depthWrite={false} />
        <lineSegments geometry={a.vessel.sections} material={a.sectionMat} />
      </group>
    </group>
  );
}
