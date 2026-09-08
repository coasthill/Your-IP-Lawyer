"use client";

import { useRef, useState } from "react";
import * as THREE from "three";
import { useStoryFrame } from "../shared/useStoryFrame";
import { ActContext, createActState, updateActState } from "./act-clock";
import { Advocate } from "./Advocate";
import { STRIKE_POINT } from "./constants";
import { IPElements } from "./Elements";
import { Inscriptions } from "./Inscriptions";
import { Stage } from "./Stage";
import { Strike } from "./Strike";

/**
 * ACT I — scenes 1–3 of the cinematic homepage (progress 0.00 → ~0.44).
 *
 *   1 · THE LAWYER   0.00–0.10  a still advocate in a near-black room; white bands the brightest thing in frame
 *   2 · THE GOWN     0.10–0.34  he steps forward, the gown swirls, the five IP subjects emerge from the fabric
 *   3 · THE GAVEL    0.34–0.42  the swirl settles, the gavel rises and strikes at GAVEL_STRIKE_AT; the objects
 *                               are knocked back and dissolve to sparks; the act fades under the machine
 *
 * Pure R3F subtree. One story clock (useStoryFrame, priority -5) advances a shared ActState that every
 * child reads through useActFrame — no React state per frame, nothing allocated per frame, and every
 * pose is a function of progress so scrolling back replays the scene exactly. The camera, lights and
 * post-processing belong to WebGLStory.
 */
export function FigureAct() {
  const root = useRef<THREE.Group>(null);
  const [act] = useState(createActState);

  useStoryFrame((f) => {
    updateActState(act, f);
    const g = root.current;
    if (!g) return;
    g.visible = act.active;
    if (!act.active) return;
    // The fade-out shrinks the whole act toward the impact point, where the machine act emerges.
    const s = 1 - 0.16 * (1 - act.fade);
    g.scale.setScalar(s);
    g.position.set(STRIKE_POINT.x * (1 - s), STRIKE_POINT.y * (1 - s) - (1 - act.fade) * 0.12, STRIKE_POINT.z * (1 - s));
  }, -5);

  return (
    <ActContext.Provider value={act}>
      <group ref={root}>
        <Stage />
        <Advocate />
        <IPElements />
        <Inscriptions />
        <Strike />
      </group>
    </ActContext.Provider>
  );
}
