"use client";

import { useRef } from "react";
import * as THREE from "three";
import { PALETTE, window01 } from "../../story";
import { useStoryFrame } from "../shared/useStoryFrame";
import { PatentMachine } from "./PatentMachine";
import { DesignPlate } from "./DesignPlate";
import { TradeMarkEmblem } from "./TradeMarkEmblem";
import { MapOfIndia } from "./MapOfIndia";
import { LegalWorld } from "./LegalWorld";

/**
 * Act II — scenes 4–8 (progress ~0.40 → 1.00):
 *   4 THE PATENT MACHINE  gears burst from the gavel's impact and mesh        0.42 → 0.56
 *   5 DESIGN              the rosette becomes a turned plate with a guilloché 0.56 → 0.67
 *   6 TRADE MARK          the plate warms into a registration emblem          0.67 → 0.78
 *   7 GEOGRAPHICAL IND.   the ring becomes a compass over a chart of India    0.78 → 0.89
 *   8 THE LEGAL WORLD     the five motifs return as a constellation           0.89 → 1.00
 * A pure R3F subtree: every scene reads the story clock via useStoryFrame and mutates refs.
 * The camera and the key/rim lights belong to WebGLStory; only a small warm fill lives here.
 */
export function MachineAct() {
  const fill = useRef<THREE.PointLight>(null);
  useStoryFrame((f) => {
    // a warm fill that lifts the metal of the plate and the emblem, gone before the page takes over
    if (fill.current) fill.current.intensity = 5.5 * window01(f.p, 0.56, 0.63, 0.9, 0.97);
  }, -6);

  return (
    <group name="machine-act">
      <pointLight ref={fill} position={[1.7, 1.5, 2.8]} intensity={0} distance={10} decay={2} color={PALETTE.bronze2} />
      <PatentMachine />
      <DesignPlate />
      <TradeMarkEmblem />
      <MapOfIndia />
      <LegalWorld />
    </group>
  );
}
