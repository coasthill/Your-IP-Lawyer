/**
 * Tiny deterministic noise kit for the figure act.
 *   simplex3   — 3D simplex noise (Gustavson), fixed seeded permutation so every visit paints the same folds.
 *   mulberry32 — seeded PRNG for particle layouts (never Math.random: layouts must be stable across renders).
 * No allocations in the hot path.
 */

const F3 = 1 / 3;
const G3 = 1 / 6;

const GRAD3 = new Float32Array([
  1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0,
  1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, -1,
  0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1,
]);

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PERM = new Uint8Array(512);
const PERM_MOD12 = new Uint8Array(512);
(function seedPermutation() {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  const rnd = mulberry32(0x5eed1a3);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const tmp = p[i];
    p[i] = p[j];
    p[j] = tmp;
  }
  for (let i = 0; i < 512; i++) {
    PERM[i] = p[i & 255];
    PERM_MOD12[i] = PERM[i] % 12;
  }
})();

/** 3D simplex noise in roughly [-1, 1]. */
export function simplex3(xin: number, yin: number, zin: number): number {
  const s = (xin + yin + zin) * F3;
  const i = Math.floor(xin + s);
  const j = Math.floor(yin + s);
  const k = Math.floor(zin + s);
  const t = (i + j + k) * G3;
  const x0 = xin - (i - t);
  const y0 = yin - (j - t);
  const z0 = zin - (k - t);

  let i1: number, j1: number, k1: number, i2: number, j2: number, k2: number;
  if (x0 >= y0) {
    if (y0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
    else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1; }
    else { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1; }
  } else {
    if (y0 < z0) { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1; }
    else if (x0 < z0) { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1; }
    else { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
  }

  const x1 = x0 - i1 + G3;
  const y1 = y0 - j1 + G3;
  const z1 = z0 - k1 + G3;
  const x2 = x0 - i2 + 2 * G3;
  const y2 = y0 - j2 + 2 * G3;
  const z2 = z0 - k2 + 2 * G3;
  const x3 = x0 - 1 + 3 * G3;
  const y3 = y0 - 1 + 3 * G3;
  const z3 = z0 - 1 + 3 * G3;

  const ii = i & 255;
  const jj = j & 255;
  const kk = k & 255;

  let n = 0;
  let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
  if (t0 > 0) {
    const g = PERM_MOD12[ii + PERM[jj + PERM[kk]]] * 3;
    t0 *= t0;
    n += t0 * t0 * (GRAD3[g] * x0 + GRAD3[g + 1] * y0 + GRAD3[g + 2] * z0);
  }
  let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
  if (t1 > 0) {
    const g = PERM_MOD12[ii + i1 + PERM[jj + j1 + PERM[kk + k1]]] * 3;
    t1 *= t1;
    n += t1 * t1 * (GRAD3[g] * x1 + GRAD3[g + 1] * y1 + GRAD3[g + 2] * z1);
  }
  let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
  if (t2 > 0) {
    const g = PERM_MOD12[ii + i2 + PERM[jj + j2 + PERM[kk + k2]]] * 3;
    t2 *= t2;
    n += t2 * t2 * (GRAD3[g] * x2 + GRAD3[g + 1] * y2 + GRAD3[g + 2] * z2);
  }
  let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
  if (t3 > 0) {
    const g = PERM_MOD12[ii + 1 + PERM[jj + 1 + PERM[kk + 1]]] * 3;
    t3 *= t3;
    n += t3 * t3 * (GRAD3[g] * x3 + GRAD3[g + 1] * y3 + GRAD3[g + 2] * z3);
  }
  return 32 * n;
}

/** Smooth bump: 1 at t=0, 0 at |t|>=1. */
export function bell(t: number): number {
  const a = 1 - t * t;
  return a > 0 ? a * a : 0;
}

/** Back-out ease (overshoots slightly past 1 then settles). */
export function easeOutBack(t: number, overshoot = 1.25): number {
  const x = t < 0 ? 0 : t > 1 ? 1 : t;
  const c3 = overshoot + 1;
  const u = x - 1;
  return 1 + c3 * u * u * u + overshoot * u * u;
}

export function easeOutCubic(t: number): number {
  const x = t < 0 ? 0 : t > 1 ? 1 : t;
  const u = 1 - x;
  return 1 - u * u * u;
}

export function easeInCubic(t: number): number {
  const x = t < 0 ? 0 : t > 1 ? 1 : t;
  return x * x * x;
}

export function easeInOutSine(t: number): number {
  const x = t < 0 ? 0 : t > 1 ? 1 : t;
  return -(Math.cos(Math.PI * x) - 1) / 2;
}
