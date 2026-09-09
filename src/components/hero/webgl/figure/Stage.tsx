"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { PALETTE, ramp } from "../../story";
import { bronze, moteMaterial } from "../shared/materials";
import { useActFrame } from "./act-clock";
import { FLOOR_Y, PLINTH_POSITION, PLINTH_TOP_LOCAL } from "./constants";
import { Dimmer, disposeAll } from "./fade";
import { mulberry32 } from "./noise";

/**
 * THE ROOM — a dark floor that catches the key-light pool, the low plinth with the sound block
 * the gavel will strike, and dust drifting in the light.
 */

const MOTE_COUNT = 600;
const KEY_LIGHT = new THREE.Vector3(-4.5, 6.5, 4);
const CONE_COS = Math.cos(0.5);

function buildStage() {
  const floor = new THREE.PlaneGeometry(48, 48);
  const floorMat = new THREE.MeshStandardMaterial({ color: new THREE.Color("#141317"), roughness: 0.6, metalness: 0.06 });
  const column = new THREE.BoxGeometry(0.3, PLINTH_TOP_LOCAL - 0.08, 0.3);
  const cap = new THREE.BoxGeometry(0.36, 0.03, 0.36);
  const block = new THREE.CylinderGeometry(0.1, 0.11, 0.05, 32);
  const rim = new THREE.TorusGeometry(0.1, 0.005, 6, 48);
  rim.rotateX(Math.PI / 2);
  const stone = new THREE.MeshStandardMaterial({ color: new THREE.Color("#17141a"), roughness: 0.68, metalness: 0.02 });
  const wood = new THREE.MeshStandardMaterial({ color: new THREE.Color("#2a1a10"), roughness: 0.5, metalness: 0.04 });
  const brass = bronze({ roughness: 0.34 });
  const dimmer = new Dimmer([floorMat, stone, wood, brass]);
  return { floor, floorMat, column, cap, block, rim, stone, wood, brass, dimmer };
}

function buildMotes() {
  const rnd = mulberry32(0x0d05e);
  const base = new Float32Array(MOTE_COUNT * 3);
  const phase = new Float32Array(MOTE_COUNT * 2);
  const axis = KEY_LIGHT.clone().negate().normalize();
  const d = new THREE.Vector3();
  let n = 0;
  let guard = 0;
  while (n < MOTE_COUNT && guard++ < MOTE_COUNT * 40) {
    const x = -2.3 + rnd() * 5.0;
    const y = -1.25 + rnd() * 3.7;
    const z = -1.6 + rnd() * 3.9;
    d.set(x, y, z).sub(KEY_LIGHT).normalize();
    if (d.dot(axis) < CONE_COS) continue;
    base[n * 3] = x;
    base[n * 3 + 1] = y;
    base[n * 3 + 2] = z;
    phase[n * 2] = rnd() * Math.PI * 2;
    phase[n * 2 + 1] = 0.5 + rnd();
    n++;
  }
  const positions = new Float32Array(base);
  const geometry = new THREE.BufferGeometry();
  const attr = new THREE.BufferAttribute(positions, 3);
  attr.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute("position", attr);
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0.2, 0.6, 0.4), 5);
  const material = moteMaterial(PALETTE.keyLight, 0.026);
  return { geometry, attr, positions, base, phase, material };
}

export function Stage() {
  const [rig] = useState(buildStage);
  useEffect(() => () => disposeAll(rig), [rig]);
  useActFrame((a) => rig.dimmer.apply(a.fade));
  return (
    <>
      <mesh geometry={rig.floor} material={rig.floorMat} rotation-x={-Math.PI / 2} position={[0, FLOOR_Y, 0]} />
      <group position={[PLINTH_POSITION.x, PLINTH_POSITION.y, PLINTH_POSITION.z]}>
        <mesh geometry={rig.column} material={rig.stone} position={[0, (PLINTH_TOP_LOCAL - 0.08) / 2, 0]} />
        <mesh geometry={rig.cap} material={rig.stone} position={[0, PLINTH_TOP_LOCAL - 0.065, 0]} />
        <mesh geometry={rig.block} material={rig.wood} position={[0, PLINTH_TOP_LOCAL - 0.025, 0]} />
        <mesh geometry={rig.rim} material={rig.brass} position={[0, PLINTH_TOP_LOCAL - 0.004, 0]} />
      </group>
      <Motes />
    </>
  );
}

function Motes() {
  const [rig] = useState(buildMotes);
  useEffect(() => () => disposeAll(rig), [rig]);
  const ref = useRef<THREE.Points>(null);

  useActFrame((a) => {
    const { positions, base, phase } = rig;
    const t = a.t;
    const stir = a.swirl * 0.35 + Math.min(Math.abs(a.v), 0.6) * 0.2;
    for (let i = 0; i < MOTE_COUNT; i++) {
      const i3 = i * 3;
      const ph = phase[i * 2];
      const f = phase[i * 2 + 1];
      positions[i3] = base[i3] + Math.sin(t * 0.21 * f + ph) * 0.22 + Math.sin(t * 0.9 + ph * 3) * stir;
      positions[i3 + 1] = base[i3 + 1] + Math.sin(t * 0.13 * f + ph * 1.7) * 0.12 + Math.cos(t * 0.7 + ph) * stir * 0.4;
      positions[i3 + 2] = base[i3 + 2] + Math.cos(t * 0.17 * f + ph * 0.6) * 0.18;
    }
    rig.attr.needsUpdate = true;
    rig.material.opacity = (0.2 + 0.36 * ramp(a.p, 0, 0.12)) * a.fade;
  });

  return <points ref={ref} geometry={rig.geometry} material={rig.material} frustumCulled={false} />;
}
