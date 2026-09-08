"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Text } from "@react-three/drei";
import { PALETTE, lerp, smoothstep, window01 } from "../../story";
import { inRange, useStoryFrame } from "../shared/useStoryFrame";
import { bronze, inkLine, parchment, sealWax } from "../shared/materials";
import {
  ACT,
  CHARS_600,
  FONT_600,
  type MapPose,
  type TroikaText,
  disposeAll,
  easeOut,
  mapLocalToWorld,
  mapPose,
  prng,
  safeScale,
  setTextOpacity,
} from "./anim";
import { compassRose, ribbonGeometry, sheetRules } from "./builders";
import { INK, graphiteEnamel } from "./surfaces";
import { ArcText } from "./ArcText";

/** The emblem hangs just in front of the plate it replaces. */
const EMBLEM_AT = new THREE.Vector3(0, 0.3, 0.55);
/** Where the ring lands on the map as a compass rose (map-local, clear of the land's north-west edge). */
const COMPASS_CORNER = new THREE.Vector3(-1.9, 1.95, 0.07);
const SPECIMENS = ["Aa", "Rr", "Mm", "Kk", "Qq", "&", "Gg", "§", "Bb"];

type Sheet = { x: number; y: number; z: number; rz: number; alpha: number; text: string; mat: THREE.MeshStandardMaterial };

const _pose: MapPose = { tilt: 0, y: 0, z: 0 };
const _corner = new THREE.Vector3();

/**
 * Scene 6 — TRADE MARK (0.67 → 0.78).
 * The plate warms into a registration emblem: a wax seal in a bronze ring with ring text and a
 * large ®, a ribbon banner beneath, a wall of typographic specimen sheets and a shop-sign frame.
 * In scene 7 the seal dissolves and the ring travels to the map's corner as a compass rose.
 */
export function TradeMarkEmblem() {
  const root = useRef<THREE.Group>(null);
  const emblem = useRef<THREE.Group>(null);
  const seal = useRef<THREE.Group>(null);
  const ringText = useRef<THREE.Group>(null);
  const reg = useRef<TroikaText>(null);
  const compassN = useRef<TroikaText>(null);
  const ribbon = useRef<THREE.Group>(null);
  const ribbonText = useRef<TroikaText>(null);
  const wall = useRef<THREE.Group>(null);
  const frame = useRef<THREE.Group>(null);

  const a = useMemo(() => {
    const sealGeo = new THREE.CylinderGeometry(1.13, 1.16, 0.09, 96);
    sealGeo.rotateX(Math.PI / 2);
    const backingGeo = new THREE.CylinderGeometry(1.6, 1.6, 0.05, 128);
    backingGeo.rotateX(Math.PI / 2);
    const innerRing = new THREE.TorusGeometry(1.24, 0.045, 12, 128);
    const outerRing = new THREE.TorusGeometry(1.58, 0.022, 8, 160);
    const wax = sealWax();
    const brass = bronze();
    const enamel = graphiteEnamel();
    const compass = compassRose(1.5);
    const compassMat = inkLine({ color: PALETTE.bronze2, opacity: 0 });

    const ribbonGeo = ribbonGeometry(4.2, 0.5);
    const ribbonMat = parchment({ color: "#cdbf9e", opacity: 0 });

    const sheetGeo = new THREE.PlaneGeometry(1.5, 2.0);
    const rules = sheetRules(1.5, 2.0);
    const rulesMat = inkLine({ color: PALETTE.bronzeDim, opacity: 0 });
    const rnd = prng(11);
    const sheets: Sheet[] = SPECIMENS.map((text, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      return {
        x: (col - 1) * 2.55 + (rnd() - 0.5) * 0.5,
        y: 0.3 + (1 - row) * 1.95 + (rnd() - 0.5) * 0.35,
        z: -1.7 - rnd() * 0.9,
        rz: (rnd() - 0.5) * 0.12,
        alpha: 0.6 + rnd() * 0.4,
        text,
        mat: parchment({ color: "#8c8068", opacity: 0 }),
      };
    });

    const barH = new THREE.BoxGeometry(4.9, 0.05, 0.05);
    const barV = new THREE.BoxGeometry(0.05, 3.4, 0.05);
    const hanger = new THREE.BoxGeometry(0.03, 1.3, 0.03);

    return { sealGeo, backingGeo, innerRing, outerRing, wax, brass, enamel, compass, compassMat, ribbonGeo, ribbonMat, sheetGeo, rules, rulesMat, sheets, barH, barV, hanger };
  }, []);

  useEffect(
    () => () => {
      disposeAll([
        a.sealGeo,
        a.backingGeo,
        a.innerRing,
        a.outerRing,
        a.wax,
        a.brass,
        a.enamel,
        a.compass,
        a.compassMat,
        a.ribbonGeo,
        a.ribbonMat,
        a.sheetGeo,
        a.rules,
        a.rulesMat,
        a.barH,
        a.barV,
        a.hanger,
        ...a.sheets.map((s) => s.mat),
      ]);
    },
    [a],
  );

  useStoryFrame((f) => {
    const p = f.p;
    const g = root.current;
    const em = emblem.current;
    if (!g || !em) return;
    const on = inRange(p, ACT.emblem[0], ACT.emblem[1]);
    g.visible = on;
    if (!on) return;

    const grow = easeOut((p - 0.675) / 0.04);
    const toCompass = smoothstep((p - 0.78) / 0.05);
    const gone = smoothstep((p - 0.885) / 0.02);

    // The emblem grows over the plate, then shrinks and travels to the map's corner as the seal dissolves.
    mapPose(p, _pose);
    mapLocalToWorld(_pose, COMPASS_CORNER, _corner);
    em.position.lerpVectors(EMBLEM_AT, _corner, toCompass);
    em.rotation.x = _pose.tilt * toCompass;
    em.rotation.z = -toCompass * 0.4 + Math.sin(f.t * 0.3) * 0.02 * (1 - toCompass);
    em.scale.setScalar(safeScale(grow * lerp(1, 0.34, toCompass) * (1 - gone)));

    const sl = seal.current;
    if (sl) {
      const ss = safeScale(1 - toCompass);
      sl.scale.set(ss, ss, ss);
    }
    setTextOpacity(ringText.current, 1 - toCompass);
    if (reg.current) reg.current.fillOpacity = 1 - toCompass;

    const compassIn = smoothstep((p - 0.8) / 0.04);
    a.compassMat.opacity = 0.85 * compassIn;
    if (compassN.current) compassN.current.fillOpacity = compassIn;

    // The ribbon unfurls under the emblem and drops away before the map.
    const unfurl = easeOut((p - 0.7) / 0.045);
    const drop = smoothstep((p - 0.775) / 0.035);
    const rb = ribbon.current;
    if (rb) {
      rb.scale.set(safeScale(unfurl), 1, 1);
      rb.position.y = -1.52 - drop * 0.9;
      rb.rotation.x = -drop * 0.6;
    }
    a.ribbonMat.opacity = unfurl * (1 - drop);
    if (ribbonText.current) ribbonText.current.fillOpacity = unfurl * (1 - drop);

    // The specimen wall: in for the emblem, out as the map takes its place.
    const wallOp = window01(p, 0.672, 0.72, 0.78, 0.82);
    for (let i = 0; i < a.sheets.length; i++) a.sheets[i].mat.opacity = 0.55 * wallOp * a.sheets[i].alpha;
    a.rulesMat.opacity = 0.45 * wallOp;
    const w = wall.current;
    if (w) {
      setTextOpacity(w, 0.3 * wallOp);
      w.position.x = -0.1 + (p - 0.67) * 1.4;
    }

    // Shop-sign frame: a hint, arriving late and retreating into the dark.
    const fr = frame.current;
    if (fr) {
      const fin = easeOut((p - 0.69) / 0.04);
      const fout = smoothstep((p - 0.78) / 0.03);
      fr.scale.setScalar(safeScale(lerp(0.8, 1, fin) * (1 - fout)));
      fr.position.z = -0.7 - fout * 3;
    }
  }, -5);

  return (
    <group ref={root} visible={false} name="trade-mark-emblem">
      <group ref={emblem} position={EMBLEM_AT} scale={0.001}>
        <group ref={seal}>
          <mesh geometry={a.backingGeo} material={a.enamel} position-z={-0.04} />
          <mesh geometry={a.sealGeo} material={a.wax} position-z={0.02} />
          <group ref={ringText}>
            {/* the string is rotated so "TRADE MARK" sits centred at the top; the join at the bottom is seamless */}
            <ArcText
              text=" MARK · REGISTERED · TRADE MARK · REGISTERED · TRADE"
              radius={1.41}
              fontSize={0.115}
              fullCircle
              font={FONT_600}
              characters={CHARS_600}
              color={PALETTE.parchment}
              z={0.03}
            />
          </group>
          <Text
            ref={reg}
            font={FONT_600}
            characters={CHARS_600}
            fontSize={1.25}
            color={PALETTE.parchment}
            anchorX="center"
            anchorY="middle"
            position={[0, 0.04, 0.07]}
          >
            ®
          </Text>
        </group>
        <mesh geometry={a.innerRing} material={a.brass} position-z={0.03} />
        <mesh geometry={a.outerRing} material={a.brass} />
        <lineSegments geometry={a.compass} material={a.compassMat} position-z={0.01} />
        <Text
          ref={compassN}
          font={FONT_600}
          characters={CHARS_600}
          fontSize={0.34}
          color={PALETTE.bronze2}
          anchorX="center"
          anchorY="middle"
          position={[0, 1.82, 0.01]}
          fillOpacity={0}
        >
          N
        </Text>
      </group>

      <group ref={ribbon} position={[0, -1.52, 0.75]} scale={[0.001, 1, 1]}>
        <mesh geometry={a.ribbonGeo} material={a.ribbonMat} />
        <Text
          ref={ribbonText}
          font={FONT_600}
          characters={CHARS_600}
          fontSize={0.17}
          letterSpacing={0.22}
          color={INK}
          anchorX="center"
          anchorY="middle"
          position={[0, 0.0, 0.012]}
          fillOpacity={0}
        >
          TRADE MARKS
        </Text>
      </group>

      <group ref={wall} position={[-0.1, 0, 0]}>
        {a.sheets.map((s, i) => (
          <group key={i} position={[s.x, s.y, s.z]} rotation={[0, 0, s.rz]}>
            <mesh geometry={a.sheetGeo} material={s.mat} />
            <lineSegments geometry={a.rules} material={a.rulesMat} />
            <Text
              font={FONT_600}
              characters={CHARS_600}
              fontSize={0.9}
              color={PALETTE.bone}
              anchorX="center"
              anchorY="middle"
              position={[0, 0.35, 0.004]}
              fillOpacity={0}
            >
              {s.text}
            </Text>
          </group>
        ))}
      </group>

      <group ref={frame} position={[0, 0.3, -0.7]} scale={0.001}>
        <mesh geometry={a.barH} material={a.brass} position={[0, 1.7, 0]} />
        <mesh geometry={a.barH} material={a.brass} position={[0, -1.7, 0]} />
        <mesh geometry={a.barV} material={a.brass} position={[-2.45, 0, 0]} />
        <mesh geometry={a.barV} material={a.brass} position={[2.45, 0, 0]} />
        <mesh geometry={a.hanger} material={a.brass} position={[-1.7, 2.35, 0]} />
        <mesh geometry={a.hanger} material={a.brass} position={[1.7, 2.35, 0]} />
      </group>
    </group>
  );
}
