"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { EffectComposer, Bloom, Vignette, Noise } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { dprCap } from "../capabilities";
import { PALETTE, GAVEL_STRIKE_AT } from "../story";
import { useStoryFrame } from "./shared/useStoryFrame";
import { FigureAct } from "./figure/FigureAct";
import { MachineAct } from "./machine/MachineAct";

/**
 * The desktop renderer. One Canvas, one camera rig, one lighting rig, two "acts":
 *   FigureAct  — scenes 1–3 (lawyer, gown + IP elements, gavel)      progress 0.00 → ~0.44
 *   MachineAct — scenes 4–8 (gears, design, trade mark, GI, legal world) progress ~0.40 → 1.00
 * Scenes ease toward the scroll target via useStoryFrame; nothing here touches React state per frame.
 */
export function WebGLStory({ onReady }: { onReady: () => void }) {
  const dpr = useMemo(() => dprCap("webgl"), []);
  return (
    <div className="absolute inset-0" data-renderer="webgl">
      <Canvas
        dpr={dpr}
        camera={{ fov: 34, near: 0.1, far: 60, position: [0, 1.2, 7.2] }}
        gl={{ antialias: true, powerPreference: "high-performance", alpha: false, stencil: false }}
        onCreated={({ gl, scene }) => {
          gl.setClearColor(new THREE.Color(PALETTE.ink), 1);
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
          scene.background = new THREE.Color(PALETTE.ink);
          scene.fog = new THREE.FogExp2(PALETTE.ink, 0.075);
          scene.environmentIntensity = 0.35;
        }}
        frameloop="always"
        shadows={false}
      >
        <Environment />
        <CameraRig />
        <Lights />
        <Suspense fallback={null}>
          <FigureAct />
          <MachineAct />
        </Suspense>
        <Ready onReady={onReady} />
        <EffectComposer multisampling={0}>
          <Bloom intensity={0.55} luminanceThreshold={0.72} luminanceSmoothing={0.2} mipmapBlur />
          <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.35} />
          <Vignette eskil={false} offset={0.22} darkness={0.85} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}

/** Procedural environment map (no external HDR files): gives metals believable reflections. */
function Environment() {
  const gl = useThree((s) => s.gl);
  const env = useMemo(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const texture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    return texture;
  }, [gl]);
  useEffect(() => () => env.dispose(), [env]);
  return <primitive attach="environment" object={env} />;
}

/**
 * Camera rig: gentle dolly/orbit keyed to progress, plus the gavel shake.
 * Acts may add their own subject motion, but the camera belongs here so moves stay small and coherent.
 */
function CameraRig() {
  const { camera } = useThree();
  const shake = useRef(0);
  const lastP = useRef(0);
  useStoryFrame((f) => {
    const p = f.p;
    // Dolly in over scene 1, orbit slightly through scene 2, pull back for the machine.
    const dolly = THREE.MathUtils.smoothstep(p, 0, 0.12) * 0.9;
    const orbit = THREE.MathUtils.smoothstep(p, 0.1, 0.34) * 0.26;
    const pullBack = THREE.MathUtils.smoothstep(p, 0.4, 0.5) * 1.6;
    const drop = THREE.MathUtils.smoothstep(p, 0.1, 0.34) * 0.35;
    const mapTilt = THREE.MathUtils.smoothstep(p, 0.78, 0.86) * 0.9;

    const radius = 7.2 - dolly + pullBack;
    const angle = orbit;
    const x = Math.sin(angle) * radius;
    const z = Math.cos(angle) * radius;
    const y = 1.2 - drop + mapTilt * 2.2;

    // gavel shake
    if (lastP.current < GAVEL_STRIKE_AT && p >= GAVEL_STRIKE_AT) shake.current = 1;
    lastP.current = p;
    shake.current = Math.max(0, shake.current - f.dt * 2.6);
    const s = shake.current * shake.current * 0.045;
    const sx = Math.sin(f.t * 63) * s;
    const sy = Math.cos(f.t * 47) * s * 0.7;

    camera.position.set(x + sx, y + sy, z);
    camera.lookAt(0 + sx * 0.5, 0.35 - mapTilt * 0.6, 0);
  }, -10);
  return null;
}

function Lights() {
  const key = useRef<THREE.SpotLight>(null);
  const rim = useRef<THREE.DirectionalLight>(null);
  const strikeFlash = useRef(0);
  const lastP = useRef(0);
  useStoryFrame((f) => {
    const p = f.p;
    if (lastP.current < GAVEL_STRIKE_AT && p >= GAVEL_STRIKE_AT) strikeFlash.current = 1;
    lastP.current = p;
    strikeFlash.current = Math.max(0, strikeFlash.current - f.dt * 3.2);
    const flash = strikeFlash.current > 0 ? Math.abs(Math.sin(strikeFlash.current * Math.PI * 3)) * strikeFlash.current * 6 : 0;
    // Warmer, brighter in the machine scenes; quieter in the figure scenes.
    const machineLift = THREE.MathUtils.smoothstep(p, 0.42, 0.5) * 1.4;
    if (key.current) key.current.intensity = 38 + machineLift * 20 + flash * 20;
    if (rim.current) rim.current.intensity = 1.3 + flash * 0.6;
  }, -9);
  return (
    <>
      <ambientLight intensity={0.08} color={PALETTE.rimLight} />
      <spotLight
        ref={key}
        position={[-4.5, 6.5, 4]}
        angle={0.55}
        penumbra={0.9}
        decay={1.6}
        distance={30}
        intensity={38}
        color={PALETTE.keyLight}
      />
      <directionalLight ref={rim} position={[5, 3, -4]} intensity={1.3} color={PALETTE.rimLight} />
      <pointLight position={[0, -1.5, 3]} intensity={2.2} distance={9} decay={2} color={PALETTE.bronze2} />
    </>
  );
}

/** Signals the first rendered frame so the loader can dissolve. */
function Ready({ onReady }: { onReady: () => void }) {
  const done = useRef(false);
  useFrame(() => {
    if (!done.current) {
      done.current = true;
      onReady();
    }
  });
  return null;
}
