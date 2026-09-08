"use client";

import { createContext, useContext } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { ramp, window01, smoothstep } from "../../story";
import type { StoryFrame } from "../shared/useStoryFrame";
import { inRange } from "../shared/useStoryFrame";
import { FIGURE, FLOOR_Y, T } from "./constants";
import { simplex3 } from "./noise";

/**
 * One shared per-frame state for the whole act. FigureAct derives it from the story clock at a
 * negative priority; every child reads it through useActFrame (priority 0) — one ease, one set of
 * envelopes, one strike trigger, no React state per frame.
 */
export type ActState = {
  p: number;
  v: number;
  t: number;
  dt: number;
  /** act is inside its visible range */
  active: boolean;
  /** 0→1→0 gown swirl envelope */
  swirl: number;
  /** cloth displacement amplitude (breath + swirl + scroll velocity) */
  clothAmp: number;
  /** wind direction in radians (slowly rotating so folds travel) */
  wind: number;
  /** figure world position (feet), fully determined by p */
  figurePos: THREE.Vector3;
  /** figure roll (weight shift) and pitch (lean into the strike) */
  figureRoll: number;
  figurePitch: number;
  /** 0→1 gavel raise */
  raise: number;
  /** 0→1 strike descent */
  drop: number;
  /** ramp after the strike (progress-keyed, deterministic) */
  afterStrike: number;
  /** wall-time seconds since the last strike crossing; -1 when idle */
  strikeAge: number;
  /** 1 → 0 across the act fade */
  fade: number;
  /** internal: re-armable trigger */
  armed: boolean;
};

export function createActState(): ActState {
  return {
    p: 0,
    v: 0,
    t: 0,
    dt: 0,
    active: true,
    swirl: 0,
    clothAmp: 0,
    wind: 0,
    figurePos: new THREE.Vector3(FIGURE.x, FLOOR_Y, FIGURE.zStart),
    figureRoll: 0,
    figurePitch: 0,
    raise: 0,
    drop: 0,
    afterStrike: 0,
    strikeAge: -1,
    fade: 1,
    armed: true,
  };
}

/** Advances the act state from a story frame. Pure function of (p, t) except for the wall-time burst. */
export function updateActState(a: ActState, f: StoryFrame): void {
  const p = f.p;
  a.p = p;
  a.v = f.v;
  a.t = f.t;
  a.dt = f.dt;
  a.active = inRange(p, T.visibleA, T.visibleB);

  // Gown
  a.swirl = window01(p, T.swirlA, T.swirlB, T.swirlC, T.swirlD);
  const velocity = Math.min(Math.abs(f.v) * 0.22, 0.1);
  a.clothAmp = 0.014 + a.swirl * 0.15 + velocity;
  a.wind = f.t * 0.16 + p * 5.0 + simplex3(f.t * 0.05, 3.7, 1.1) * 0.8;

  // Figure: two steps forward, weight shifting; a lean into the strike.
  const step = ramp(p, T.stepA, T.stepB);
  const stride = Math.sin(step * Math.PI * 2);
  a.figurePos.set(FIGURE.x + stride * 0.035, FLOOR_Y + Math.abs(stride) * 0.018, FIGURE.zStart + (FIGURE.zEnd - FIGURE.zStart) * step);
  a.figureRoll = 0.022 + stride * 0.028;

  a.raise = smoothstep(ramp(p, T.raiseA, T.raiseB));
  a.drop = ramp(p, T.dropA, T.strike);
  a.afterStrike = ramp(p, T.strike, T.strike + 0.03);
  a.figurePitch = a.drop * a.drop * 0.09 - a.afterStrike * 0.05;

  a.fade = 1 - ramp(p, T.fadeA, T.fadeB);

  // Strike trigger: fires on crossing the threshold upward; re-arms once the user scrolls back.
  if (!a.armed && p < T.strike - 0.012) a.armed = true;
  if (a.armed && p >= T.strike) {
    a.armed = false;
    a.strikeAge = 0;
  } else if (a.strikeAge >= 0) {
    a.strikeAge += f.dt;
    if (a.strikeAge > 2) a.strikeAge = -1;
  }
}

export const ActContext = createContext<ActState | null>(null);

/** Runs `cb` every frame while the act is visible, after the act clock has advanced. */
export function useActFrame(cb: (a: ActState) => void): void {
  const act = useContext(ActContext);
  useFrame(() => {
    if (act && act.active) cb(act);
  });
}
