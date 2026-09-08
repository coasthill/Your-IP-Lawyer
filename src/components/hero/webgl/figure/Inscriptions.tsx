"use client";

import { Suspense, useRef } from "react";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { IP_INSCRIPTIONS, PALETTE, window01 } from "../../story";
import { useActFrame } from "./act-clock";
import { FONT_TEXT, cameraOrbit } from "./constants";
import { easeOutCubic } from "./noise";

/**
 * Secondary inscriptions — "Trade Secrets", "Passing Off", "Arbitration"… — drifting out of the
 * gown as faint engraved text during the swirl. No captions; they are texture, not argument.
 */

type Item = { text: string; start: number; side: -1 | 1; dx: number; dy: number; y0: number; size: number };

/**
 * Each inscription leaves the hem low and drifts up and outward through the band BELOW the caption
 * block (screen y ≈ 0.74–0.85), so faint text never crosses the caption text.
 */
const ITEMS: Item[] = IP_INSCRIPTIONS.map((text, i) => ({
  text: text.toUpperCase(),
  start: 0.12 + i * 0.025,
  side: i % 2 === 0 ? -1 : 1,
  dx: 0.7 + 0.22 * ((i * 7) % 4),
  dy: 0.3 + 0.12 * ((i * 5) % 3),
  y0: 0.2 + 0.12 * ((i * 3) % 4),
  size: 0.115 + 0.012 * (i % 3),
}));

const DURATION = 0.07;

export function Inscriptions() {
  return (
    <Suspense fallback={null}>
      <group>
        {ITEMS.map((item) => (
          <Inscription key={item.text} item={item} />
        ))}
      </group>
    </Suspense>
  );
}

type TroikaText = THREE.Mesh & { fillOpacity: number };

function Inscription({ item }: { item: Item }) {
  const ref = useRef<TroikaText>(null);

  useActFrame((a) => {
    const text = ref.current;
    if (!text) return;
    const s = item.start;
    const env = window01(a.p, s, s + 0.015, s + 0.048, s + DURATION);
    const visible = env > 0.004;
    text.visible = visible;
    if (!visible) return;
    const u = (a.p - s) / DURATION;
    const travel = easeOutCubic(u);
    const fp = a.figurePos;
    text.position.set(
      fp.x + item.side * (0.3 + item.dx * travel) + Math.sin(a.t * 0.4 + s * 90) * 0.03,
      fp.y + item.y0 + item.dy * travel + Math.sin(a.t * 0.6 + s * 40) * 0.02,
      fp.z + 0.75 + 0.2 * travel,
    );
    text.rotation.set(0, cameraOrbit(a.p), item.side * 0.05);
    text.fillOpacity = 0.48 * env * a.fade;
  });

  return (
    <Text
      ref={ref}
      font={FONT_TEXT}
      fontSize={item.size}
      letterSpacing={0.15}
      color={PALETTE.bronzeDim}
      fillOpacity={0}
      anchorX="center"
      anchorY="middle"
      visible={false}
    >
      {item.text}
    </Text>
  );
}
