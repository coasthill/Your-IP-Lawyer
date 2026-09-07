"use client";

import * as THREE from "three";
import { PALETTE } from "../../story";

/**
 * Material factories so every scene shares one surface vocabulary.
 * Keep metals dark and matte-ish with tight highlights; parchment slightly rough; gown almost light-eating.
 */
export function brushedSteel(opts: { color?: string; roughness?: number; metalness?: number } = {}) {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(opts.color ?? PALETTE.steel),
    roughness: opts.roughness ?? 0.42,
    metalness: opts.metalness ?? 0.92,
    envMapIntensity: 0.9,
  });
}

export function bronze(opts: { color?: string; roughness?: number } = {}) {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(opts.color ?? PALETTE.brass),
    roughness: opts.roughness ?? 0.38,
    metalness: 1,
    envMapIntensity: 1,
  });
}

export function parchment(opts: { color?: string; opacity?: number; side?: THREE.Side } = {}) {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(opts.color ?? PALETTE.parchment),
    roughness: 0.9,
    metalness: 0,
    transparent: opts.opacity !== undefined,
    opacity: opts.opacity ?? 1,
    side: opts.side ?? THREE.DoubleSide,
    envMapIntensity: 0.15,
  });
}

export function inkLine(opts: { color?: string; opacity?: number } = {}) {
  return new THREE.LineBasicMaterial({
    color: new THREE.Color(opts.color ?? PALETTE.bronzeDim),
    transparent: true,
    opacity: opts.opacity ?? 0.7,
  });
}

/** Black wool: near-total light absorption with a soft sheen along folds. */
export function gownWool() {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#0c0c0f"),
    roughness: 0.85,
    metalness: 0,
    sheen: 0.6,
    sheenRoughness: 0.75,
    sheenColor: new THREE.Color("#3a3a44"),
    side: THREE.DoubleSide,
    envMapIntensity: 0.25,
  });
}

export function whiteCotton() {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(PALETTE.ivory),
    roughness: 0.8,
    metalness: 0,
    emissive: new THREE.Color(PALETTE.ivory),
    emissiveIntensity: 0.12,
    side: THREE.DoubleSide,
  });
}

export function sealWax() {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(PALETTE.seal),
    roughness: 0.35,
    metalness: 0,
    clearcoat: 0.6,
    clearcoatRoughness: 0.3,
  });
}

/** Additive glow sprite material for particles / motes. */
export function glowSprite(color = PALETTE.keyLight, opacity = 0.35) {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.4, "rgba(255,255,255,0.35)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  return new THREE.SpriteMaterial({ map: tex, color: new THREE.Color(color), transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending });
}

/** Points material for instanced dust motes. */
export function moteMaterial(color = PALETTE.keyLight, size = 0.02) {
  const s = 32;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = s;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  return new THREE.PointsMaterial({
    map: new THREE.CanvasTexture(canvas),
    color: new THREE.Color(color),
    size,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });
}
