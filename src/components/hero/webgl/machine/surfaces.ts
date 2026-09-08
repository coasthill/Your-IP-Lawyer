"use client";

import * as THREE from "three";
import { PALETTE } from "../../story";

/**
 * Line material whose opacity is swept by a moving band of light around the origin —
 * the engraved guilloché on the turned plate is "revealed" as the highlight passes.
 * Angle is measured in the geometry's local XY plane, so the plate's spin is subtracted on the CPU.
 * Fog-aware so the lines sit in the same atmosphere as everything else.
 */
export function sweepLineMaterial(color: string = PALETTE.bronze2) {
  return new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uColor: { value: new THREE.Color(color) },
        uBand: { value: 0 },
        uWidth: { value: 1.0 },
        uBase: { value: 0 },
        uPeak: { value: 0 },
      },
    ]),
    vertexShader: /* glsl */ `
      #include <fog_pars_vertex>
      varying float vAngle;
      void main() {
        vAngle = atan(position.y, position.x);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: /* glsl */ `
      #include <fog_pars_fragment>
      uniform vec3 uColor;
      uniform float uBand;
      uniform float uWidth;
      uniform float uBase;
      uniform float uPeak;
      varying float vAngle;
      void main() {
        float d = abs(mod(vAngle - uBand + 3.14159265, 6.28318531) - 3.14159265);
        float band = 1.0 - smoothstep(0.0, uWidth, d);
        band *= band;
        float a = uBase + uPeak * band;
        if (a <= 0.002) discard;
        gl_FragColor = vec4(uColor * (1.0 + band * 0.7), a);
        #include <fog_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
    fog: true,
  });
}

/** Dark enamel backing for the emblem: not metal, not paper. */
export function graphiteEnamel() {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color("#1b1a1f"),
    roughness: 0.55,
    metalness: 0.35,
    envMapIntensity: 0.5,
  });
}

/** Ink for text sitting on paper or metal. */
export const INK = "#141316";
