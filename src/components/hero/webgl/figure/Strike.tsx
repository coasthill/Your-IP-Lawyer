"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { PALETTE } from "../../story";
import { moteMaterial } from "../shared/materials";
import { useActFrame } from "./act-clock";
import { FLOOR_Y, STRIKE_POINT } from "./constants";
import { disposeAll } from "./fade";
import { mulberry32 } from "./noise";

/**
 * THE IMPACT — fired when progress crosses GAVEL_STRIKE_AT (re-armed when the user scrolls back):
 * a ring of dust bursting outward with drag (wall-time, ~0.5 s), a shockwave ring racing across
 * the floor, and a brief bright disc on the block. Camera shake and the light flash live in WebGLStory.
 */

const BURST = 300;
const DRAG = 3.4;

function buildStrike() {
  const rnd = mulberry32(0x5741ce);
  const dirs = new Float32Array(BURST * 3);
  const speed = new Float32Array(BURST);
  for (let i = 0; i < BURST; i++) {
    const theta = rnd() * Math.PI * 2;
    const elevation = 0.04 + Math.pow(rnd(), 2.2) * 0.9;
    const ce = Math.cos(elevation);
    dirs[i * 3] = Math.cos(theta) * ce;
    dirs[i * 3 + 1] = Math.sin(elevation);
    dirs[i * 3 + 2] = Math.sin(theta) * ce;
    speed[i] = 1.4 + rnd() * 2.6;
  }
  const positions = new Float32Array(BURST * 3);
  const geometry = new THREE.BufferGeometry();
  const attr = new THREE.BufferAttribute(positions, 3);
  attr.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute("position", attr);
  geometry.boundingSphere = new THREE.Sphere(STRIKE_POINT.clone(), 6);
  const burstMat = moteMaterial(PALETTE.keyLight, 0.04);
  burstMat.opacity = 0;

  const ringGeo = new THREE.RingGeometry(0.84, 1, 80);
  const ringMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(PALETTE.keyLight),
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const flashGeo = new THREE.CircleGeometry(0.2, 40);
  const flashMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(PALETTE.ivory),
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  return { dirs, speed, positions, attr, geometry, burstMat, ringGeo, ringMat, flashGeo, flashMat };
}

export function Strike() {
  const [rig] = useState(buildStrike);
  useEffect(() => () => disposeAll(rig), [rig]);
  const groupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const flashRef = useRef<THREE.Mesh>(null);

  useActFrame((a) => {
    const g = groupRef.current;
    if (!g) return;
    const age = a.strikeAge;
    const live = age >= 0 && age < 0.9;
    g.visible = live;
    if (!live) return;

    // dust ring: velocity integrates with exponential drag, a little gravity settles it
    const travel = (1 - Math.exp(-DRAG * age)) / DRAG;
    const { dirs, speed, positions } = rig;
    for (let i = 0; i < BURST; i++) {
      const i3 = i * 3;
      const s = speed[i] * travel;
      positions[i3] = STRIKE_POINT.x + dirs[i3] * s;
      positions[i3 + 1] = STRIKE_POINT.y + dirs[i3 + 1] * s - 1.1 * age * age;
      positions[i3 + 2] = STRIKE_POINT.z + dirs[i3 + 2] * s;
    }
    rig.attr.needsUpdate = true;
    const k = Math.max(0, 1 - age / 0.55);
    rig.burstMat.opacity = k * k * 0.9 * a.fade;

    // shockwave on the floor
    const ring = ringRef.current;
    if (ring) {
      const r = 0.12 + age * 4.4;
      ring.scale.set(r, r, 1);
      const rk = Math.max(0, 1 - age / 0.6);
      rig.ringMat.opacity = rk * rk * 0.7 * a.fade;
    }
    // bright disc on the block
    const flash = flashRef.current;
    if (flash) {
      const f = 1 + age * 4;
      flash.scale.set(f, f, 1);
      rig.flashMat.opacity = Math.max(0, 1 - age / 0.16) * 0.95 * a.fade;
    }
  });

  return (
    <group ref={groupRef} visible={false}>
      <points geometry={rig.geometry} material={rig.burstMat} frustumCulled={false} />
      <mesh
        ref={ringRef}
        geometry={rig.ringGeo}
        material={rig.ringMat}
        rotation-x={-Math.PI / 2}
        position={[STRIKE_POINT.x, FLOOR_Y + 0.012, STRIKE_POINT.z]}
      />
      <mesh
        ref={flashRef}
        geometry={rig.flashGeo}
        material={rig.flashMat}
        rotation-x={-Math.PI / 2}
        position={[STRIKE_POINT.x, STRIKE_POINT.y + 0.006, STRIKE_POINT.z]}
      />
    </group>
  );
}
