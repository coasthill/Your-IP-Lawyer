import * as THREE from "three";
import { GAVEL_STRIKE_AT } from "../../story";

/**
 * Layout of Act I. World units; the camera starts at [0, 1.2, 7.2] looking at [0, 0.35, 0].
 * The figure lives in its own local frame (feet at y = 0) and is placed on FLOOR_Y.
 * Every value here was checked by projecting through the camera rig in WebGLStory so
 * objects land opposite their captions and rest slots stay clear of the caption zones.
 */

export const FLOOR_Y = -1.3;

/** Figure-local proportions (feet at y = 0, facing +z, total height ≈ 2.5). */
export const FIGURE = {
  x: 0.9,
  zStart: -0.6,
  zEnd: 0.0,
  headY: 2.33,
  headR: 0.155,
  neckY: 2.12,
  shoulderY: 2.0,
  shoulderX: 0.26,
  gownTop: 2.06,
  gownHem: 0.035,
  bandsY: 1.95,
  bandsZ: 0.215,
  /** shoulder pivot → grip */
  armLength: 0.74,
  /** grip → gavel head centre */
  gavelReach: 0.62,
} as const;

/** Where the gavel head lands, figure-local, with the figure at its final position (zEnd). */
export const STRIKE_TARGET_LOCAL = new THREE.Vector3(-0.62, 0.75 + 0.075, 0.68);

/** Top surface of the sound-block plinth (figure-local y). */
export const PLINTH_TOP_LOCAL = 0.75;

/** World-space impact point of the gavel (≈ where the machine act emerges). */
export const STRIKE_POINT = new THREE.Vector3(
  FIGURE.x + STRIKE_TARGET_LOCAL.x,
  FLOOR_Y + PLINTH_TOP_LOCAL,
  FIGURE.zEnd + STRIKE_TARGET_LOCAL.z,
);

/** World-space position of the plinth column (its base sits on the floor). */
export const PLINTH_POSITION = new THREE.Vector3(STRIKE_POINT.x, FLOOR_Y, STRIKE_POINT.z);

/** Progress envelopes. */
export const T = {
  /** gown swirl (window01): ramps 0.10→0.18, holds, decays 0.28→0.34 */
  swirlA: 0.1,
  swirlB: 0.18,
  swirlC: 0.28,
  swirlD: 0.34,
  /** the figure steps forward */
  stepA: 0.11,
  stepB: 0.31,
  /** the right arm becomes visible and rises */
  armVisible: 0.33,
  raiseA: 0.34,
  raiseB: 0.38,
  /** the strike descent */
  dropA: 0.38,
  strike: GAVEL_STRIKE_AT,
  /** floating objects are gone by here */
  dissolveEnd: 0.42,
  /** the whole act fades under the machine */
  fadeA: 0.4,
  fadeB: 0.44,
  /** act visibility range (inRange with default margin 0.04 → [-0.02, 0.47]) */
  visibleA: 0.02,
  visibleB: 0.43,
} as const;

/** Caption centre for IP element i (mirrors story.ts: at = 0.13 + i * 0.042, hold 0.03). */
export function captionAt(i: number): number {
  return 0.13 + i * 0.042;
}
export const CAPTION_HOLD = 0.03;

/** Element i sits on the side OPPOSITE its caption: even captions are right-aligned → object left. */
export function elementSide(i: number): -1 | 1 {
  return i % 2 === 0 ? -1 : 1;
}

/**
 * Display positions (world) while the caption is readable. They project to screen y ≈ 0.27, above the
 * caption block (≈ 0.38–0.62), so an object never sits on text even while adjacent captions crossfade.
 */
export const DISPLAY_LEFT = new THREE.Vector3(-1.55, 1.2, 1.0);
export const DISPLAY_RIGHT = new THREE.Vector3(1.75, 1.2, 0.9);

/** Where each element settles after its caption (upper corners, clear of every caption block). */
export const REST_SLOTS: readonly THREE.Vector3[] = [
  new THREE.Vector3(-2.7, 1.85, -0.9), // trade marks (left)
  new THREE.Vector3(2.3, 1.8, -1.0), // patents (right)
  new THREE.Vector3(-2.1, 2.1, -1.3), // copyright (left)
  new THREE.Vector3(2.1, 1.95, -1.4), // designs (right)
  new THREE.Vector3(-3.0, 1.25, -1.0), // geographical indications (left)
];

export const FONT_DISPLAY = "/fonts/cormorant-latin-600-normal.woff";
export const FONT_TEXT = "/fonts/cormorant-latin-500-normal.woff";

/** Camera orbit angle (radians) reproduced from the rig so flat objects can face the lens. */
export function cameraOrbit(p: number): number {
  return THREE.MathUtils.smoothstep(p, 0.1, 0.34) * 0.26;
}
