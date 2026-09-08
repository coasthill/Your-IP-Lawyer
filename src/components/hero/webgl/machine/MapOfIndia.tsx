"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Line } from "@react-three/drei";
import type { Line2 } from "three-stdlib";
import { PALETTE, window01 } from "../../story";
import { inRange, useStoryFrame } from "../shared/useStoryFrame";
import { glowSprite, inkLine, parchment } from "../shared/materials";
import { ACT, type MapPose, disposeAll, mapPose, safeScale } from "./anim";
import { haloGeometry, indiaMap, markerGlyphGeometry } from "./builders";

const MAP_SCALE = 4.2;
const BEAM: [number, number, number][] = [
  [0, 0, 0],
  [0, 0, 1.1],
];
const _pose: MapPose = { tilt: 0, y: 0, z: 0 };

/**
 * Scene 7 — GEOGRAPHICAL INDICATION (0.78 → 0.89).
 * The wall becomes a tactile chart of India: extruded parchment land, topographic contours,
 * a faint graticule and engraved place markers. It lies down as the camera tilts over it and one
 * conceptual marker lights up with a pulsing glow and a thin rising line. No real place is implied.
 */
export function MapOfIndia() {
  const root = useRef<THREE.Group>(null);
  const map = useRef<THREE.Group>(null);
  const glow = useRef<THREE.Sprite>(null);
  const halo = useRef<THREE.LineSegments>(null);
  const beam = useRef<THREE.Group>(null);
  const beamLine = useRef<Line2>(null);

  const a = useMemo(() => {
    const m = indiaMap(MAP_SCALE);
    const sheetGeo = new THREE.PlaneGeometry(5.7, 5.9);
    const sheetMat = parchment({ color: "#5a5041", opacity: 0 });
    const landMat = parchment({ color: "#c9bb9a", opacity: 0 });
    const coastMat = inkLine({ color: PALETTE.bronzeDim, opacity: 0 });
    const contourMat = inkLine({ color: PALETTE.bronzeDim, opacity: 0 });
    const gratSheetMat = inkLine({ color: PALETTE.bronze, opacity: 0 });
    const gratLandMat = inkLine({ color: PALETTE.bronzeDim, opacity: 0 });
    const markerMat = inkLine({ color: PALETTE.bronze, opacity: 0 });
    const glowMat = glowSprite(PALETTE.keyLight, 0);
    const haloGeo = haloGeometry(0.16);
    const haloMat = inkLine({ color: PALETTE.bronze2, opacity: 0 });
    const pinGeo = markerGlyphGeometry(0.035);
    const pinMat = inkLine({ color: PALETTE.bronze2, opacity: 0 });
    return { m, sheetGeo, sheetMat, landMat, coastMat, contourMat, gratSheetMat, gratLandMat, markerMat, glowMat, haloGeo, haloMat, pinGeo, pinMat };
  }, []);

  useEffect(
    () => () => {
      disposeAll([
        a.m.land,
        a.m.coast,
        a.m.contours,
        a.m.graticuleSheet,
        a.m.graticuleLand,
        a.m.markers,
        a.sheetGeo,
        a.sheetMat,
        a.landMat,
        a.coastMat,
        a.contourMat,
        a.gratSheetMat,
        a.gratLandMat,
        a.markerMat,
        a.glowMat,
        a.haloGeo,
        a.haloMat,
        a.pinGeo,
        a.pinMat,
      ]);
      a.glowMat.map?.dispose();
    },
    [a],
  );

  useStoryFrame((f) => {
    const p = f.p;
    const g = root.current;
    const mp = map.current;
    if (!g || !mp) return;
    const on = inRange(p, ACT.map[0], ACT.map[1]) && p < 0.905;
    g.visible = on;
    if (!on) return;

    mapPose(p, _pose);
    mp.position.set(0, _pose.y, _pose.z);
    mp.rotation.x = _pose.tilt;

    const vis = window01(p, 0.77, 0.815, 0.878, 0.9);
    a.landMat.opacity = vis;
    a.sheetMat.opacity = 0.26 * vis;
    a.coastMat.opacity = 0.85 * vis;
    a.contourMat.opacity = 0.36 * vis;
    a.gratSheetMat.opacity = 0.14 * vis;
    a.gratLandMat.opacity = 0.11 * vis;
    a.markerMat.opacity = 0.7 * vis;

    // the conceptual marker: a slow pulse, an expanding halo and a thin line rising off the paper
    const lit = window01(p, 0.805, 0.84, 0.878, 0.895);
    const pulse = 0.5 + 0.5 * Math.sin(f.t * 2.2);
    const ring = (f.t * 0.45) % 1;
    a.glowMat.opacity = lit * (0.3 + 0.4 * pulse);
    if (glow.current) glow.current.scale.setScalar(0.34 + 0.16 * pulse);
    if (halo.current) halo.current.scale.setScalar(safeScale(1 + ring * 2.6));
    a.haloMat.opacity = lit * (1 - ring) * 0.55;
    a.pinMat.opacity = lit;
    if (beam.current) beam.current.scale.set(1, 1, safeScale(lit));
    if (beamLine.current) beamLine.current.material.opacity = 0.8 * lit;
  }, -5);

  const hx = a.m.highlight[0];
  const hy = a.m.highlight[1];
  const top = a.m.depth + 0.006;

  return (
    <group ref={root} visible={false} name="map-of-india">
      <group ref={map} position={[0, 0.3, -0.9]}>
        <mesh geometry={a.sheetGeo} material={a.sheetMat} position-z={-0.002} />
        <lineSegments geometry={a.m.graticuleSheet} material={a.gratSheetMat} />
        <mesh geometry={a.m.land} material={a.landMat} />
        <lineSegments geometry={a.m.coast} material={a.coastMat} />
        <lineSegments geometry={a.m.contours} material={a.contourMat} />
        <lineSegments geometry={a.m.graticuleLand} material={a.gratLandMat} />
        <lineSegments geometry={a.m.markers} material={a.markerMat} />

        <group position={[hx, hy, top]}>
          <lineSegments geometry={a.pinGeo} material={a.pinMat} />
          <lineSegments ref={halo} geometry={a.haloGeo} material={a.haloMat} position-z={0.002} />
          <sprite ref={glow} material={a.glowMat} position-z={0.05} scale={0.4} />
          <group ref={beam} scale={[1, 1, 0.001]}>
            <Line ref={beamLine} points={BEAM} color={PALETTE.bronze2} lineWidth={1.2} transparent opacity={0} depthWrite={false} />
          </group>
        </group>
      </group>
    </group>
  );
}
