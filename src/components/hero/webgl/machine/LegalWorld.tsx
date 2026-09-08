"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { Line, Text } from "@react-three/drei";
import type { LineSegments2 } from "three-stdlib";
import { PALETTE, ramp, smoothstep } from "../../story";
import { inRange, useStoryFrame } from "../shared/useStoryFrame";
import { bronze, brushedSteel, glowSprite, inkLine, parchment, sealWax } from "../shared/materials";
import { ACT, CHARS_500, CHARS_600, FONT_500, FONT_600, type TroikaText, disposeAll, easeOut, safeScale } from "./anim";
import { buildGear, constellationSegments, markerGlyphGeometry, pageRules, pentagonPoints, roseOrnament, ruledDocument } from "./builders";

const RADIUS = 1.6;
const WORDS: Array<{ text: string; x: number; y: number; anchor: "left" | "right" }> = [
  { text: "IP LITIGATION", x: -3.5, y: 1.5, anchor: "left" },
  { text: "DISPUTE RESOLUTION", x: 3.5, y: 1.5, anchor: "right" },
  { text: "LEGAL RESEARCH", x: -3.5, y: -1.5, anchor: "left" },
  { text: "IP COMMENTARY", x: 3.5, y: -1.5, anchor: "right" },
];

/**
 * Scene 8 — THE LEGAL WORLD (0.89 → 1.00).
 * The five motifs return small — seal, gear, page, ornament, marker — as a constellation joined by
 * hairlines over a faint legal document; four words fade in around them. From 0.96 everything
 * dims and contracts into the ink of the page below.
 */
export function LegalWorld() {
  const camera = useThree((s) => s.camera);
  const root = useRef<THREE.Group>(null);
  const world = useRef<THREE.Group>(null);
  const motifs = useRef<(THREE.Group | null)[]>([]);
  const words = useRef<(TroikaText | null)[]>([]);
  const hairlines = useRef<LineSegments2>(null);
  const glow = useRef<THREE.Sprite>(null);
  const regMark = useRef<TroikaText>(null);

  const a = useMemo(() => {
    const points = pentagonPoints(RADIUS);
    const segments = constellationSegments(RADIUS);
    const docGeo = new THREE.PlaneGeometry(6.8, 4.9);
    const docMat = new THREE.MeshBasicMaterial({ color: new THREE.Color("#6f6450"), transparent: true, opacity: 0, depthWrite: false });
    const ruled = ruledDocument(6.8, 4.9, 22);
    const ruledMat = inkLine({ color: PALETTE.bronzeDim, opacity: 0 });
    // seal
    const sealGeo = new THREE.CylinderGeometry(0.23, 0.24, 0.05, 48);
    sealGeo.rotateX(Math.PI / 2);
    const sealRing = new THREE.TorusGeometry(0.29, 0.018, 8, 64);
    const wax = sealWax();
    const brass = bronze();
    // gear
    const gearSpec = { teeth: 12, radius: 0.27, depth: 0.09, spokes: 0, hole: 0.04 };
    const gearGeo = buildGear(gearSpec);
    const gearRim = new THREE.TorusGeometry(0.22, 0.012, 8, 48);
    const steel = brushedSteel();
    // page
    const pageGeo = new THREE.PlaneGeometry(0.38, 0.5);
    const pageMat = parchment({ color: "#cdbf9f", opacity: 0 });
    const pageLines = pageRules(0.38, 0.5);
    const lineMat = inkLine({ color: PALETTE.bronze, opacity: 0 });
    // ornament
    const rose = roseOrnament(0.3);
    const roseMat = inkLine({ color: PALETTE.bronze2, opacity: 0 });
    const bead = new THREE.SphereGeometry(0.035, 16, 12);
    // marker
    const marker = markerGlyphGeometry(0.06);
    const glowMat = glowSprite(PALETTE.keyLight, 0);
    return { points, segments, docGeo, docMat, ruled, ruledMat, sealGeo, sealRing, wax, brass, gearGeo, gearRim, steel, pageGeo, pageMat, pageLines, lineMat, rose, roseMat, bead, marker, glowMat };
  }, []);

  useEffect(
    () => () => {
      disposeAll([
        a.docGeo,
        a.docMat,
        a.ruled,
        a.ruledMat,
        a.sealGeo,
        a.sealRing,
        a.wax,
        a.brass,
        a.gearGeo,
        a.gearRim,
        a.steel,
        a.pageGeo,
        a.pageMat,
        a.pageLines,
        a.lineMat,
        a.rose,
        a.roseMat,
        a.bead,
        a.marker,
        a.glowMat,
      ]);
      a.glowMat.map?.dispose();
    },
    [a],
  );

  useStoryFrame((f) => {
    const p = f.p;
    const g = root.current;
    const w = world.current;
    if (!g || !w) return;
    const on = inRange(p, ACT.legal[0], ACT.legal[1]);
    g.visible = on;
    if (!on) return;

    // the constellation always faces the (tilted) camera
    w.position.set(0, -0.15, 0.9);
    w.lookAt(camera.position);
    const end = smoothstep((p - 0.96) / 0.038);
    const keep = 1 - end;
    w.scale.setScalar(safeScale(1 - 0.2 * end));

    const docIn = ramp(p, 0.885, 0.92);
    a.docMat.opacity = 0.15 * docIn * keep;
    a.ruledMat.opacity = 0.28 * docIn * keep;
    if (hairlines.current) hairlines.current.material.opacity = 0.32 * ramp(p, 0.9, 0.94) * keep;

    let lineOp = 0;
    for (let i = 0; i < 5; i++) {
      const m = motifs.current[i];
      if (!m) continue;
      const arrive = easeOut((p - (0.893 + i * 0.008)) / 0.04);
      m.scale.setScalar(safeScale(arrive * keep));
      // only the gear and the ornament idle; the seal, page and marker hold still
      m.rotation.z = i === 1 ? -f.t * 0.2 : i === 3 ? f.t * 0.05 : i === 2 ? 0.08 : 0;
      if (arrive * keep > lineOp) lineOp = arrive * keep;
    }
    a.pageMat.opacity = lineOp;
    a.lineMat.opacity = 0.7 * lineOp;
    a.roseMat.opacity = 0.85 * lineOp;
    if (regMark.current) regMark.current.fillOpacity = lineOp;
    const pulse = 0.5 + 0.5 * Math.sin(f.t * 2.2);
    a.glowMat.opacity = lineOp * (0.3 + 0.35 * pulse);
    if (glow.current) glow.current.scale.setScalar(0.32 + 0.12 * pulse);

    for (let i = 0; i < WORDS.length; i++) {
      const t = words.current[i];
      if (t) t.fillOpacity = ramp(p, 0.905 + i * 0.012, 0.945 + i * 0.012) * keep;
    }
  }, -5);

  const pt = a.points;

  return (
    <group ref={root} visible={false} name="legal-world">
      <group ref={world} position={[0, -0.15, 0.9]}>
        <mesh geometry={a.docGeo} material={a.docMat} position-z={-0.35} />
        <lineSegments geometry={a.ruled} material={a.ruledMat} position-z={-0.34} />

        <Line ref={hairlines} points={a.segments} segments color={PALETTE.bronze} lineWidth={1} transparent opacity={0} depthWrite={false} />

        {/* 01 seal */}
        <group
          ref={(el) => {
            motifs.current[0] = el;
          }}
          position={pt[0]}
          scale={0.001}
        >
          <mesh geometry={a.sealGeo} material={a.wax} />
          <mesh geometry={a.sealRing} material={a.brass} position-z={0.02} />
          <Text ref={regMark} font={FONT_600} characters={CHARS_600} fontSize={0.26} color={PALETTE.parchment} anchorX="center" anchorY="middle" position={[0, 0.01, 0.035]} fillOpacity={0}>
            ®
          </Text>
        </group>

        {/* 02 gear */}
        <group
          ref={(el) => {
            motifs.current[1] = el;
          }}
          position={pt[1]}
          scale={0.001}
        >
          <mesh geometry={a.gearGeo} material={a.steel} />
          <mesh geometry={a.gearRim} material={a.brass} position-z={0.055} />
        </group>

        {/* 03 page */}
        <group
          ref={(el) => {
            motifs.current[2] = el;
          }}
          position={pt[2]}
          rotation={[0, 0, 0.08]}
          scale={0.001}
        >
          <mesh geometry={a.pageGeo} material={a.pageMat} />
          <lineSegments geometry={a.pageLines} material={a.lineMat} />
        </group>

        {/* 04 ornament */}
        <group
          ref={(el) => {
            motifs.current[3] = el;
          }}
          position={pt[3]}
          scale={0.001}
        >
          <lineSegments geometry={a.rose} material={a.roseMat} />
          <mesh geometry={a.bead} material={a.brass} />
        </group>

        {/* 05 marker */}
        <group
          ref={(el) => {
            motifs.current[4] = el;
          }}
          position={pt[4]}
          scale={0.001}
        >
          <lineSegments geometry={a.marker} material={a.roseMat} />
          <sprite ref={glow} material={a.glowMat} position-z={0.02} scale={0.35} />
        </group>

        {WORDS.map((wd, i) => (
          <Text
            key={wd.text}
            ref={(el: TroikaText | null) => {
              words.current[i] = el;
            }}
            font={FONT_500}
            characters={CHARS_500}
            fontSize={0.19}
            letterSpacing={0.16}
            color={PALETTE.bone}
            anchorX={wd.anchor}
            anchorY="middle"
            position={[wd.x, wd.y, 0]}
            fillOpacity={0}
          >
            {wd.text}
          </Text>
        ))}
      </group>
    </group>
  );
}
