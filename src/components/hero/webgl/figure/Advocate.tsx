"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { lerp, window01 } from "../../story";
import { bronze, gownWool, whiteCotton } from "../shared/materials";
import { useActFrame } from "./act-clock";
import { FIGURE, FLOOR_Y, STRIKE_POINT, T } from "./constants";
import { Dimmer, disposeAll } from "./fade";
import { GownCloth } from "./gown";
import { easeInCubic, simplex3 } from "./noise";

/**
 * THE ADVOCATE — an original, generic figure painted the tenebrist way: the head and coat are
 * near-black, the form is read from light on the gown's folds, and the white bands at the throat
 * are the brightest thing in the frame. Everything is procedural; no faces, no likeness.
 *
 * The right arm lives inside the gown until scene 3, then swings out through the front opening
 * carrying the gavel (black on black, so the emergence reads as the gown opening).
 */

const DOWN = new THREE.Vector3(0, -1, 0);
const SHOULDER_LOCAL = new THREE.Vector3(-FIGURE.shoulderX, FIGURE.shoulderY, 0.03);
const tmpV = new THREE.Vector3();
const tmpDir = new THREE.Vector3();
const tmpQ = new THREE.Quaternion();
const qRaised = new THREE.Quaternion();
const qTarget = new THREE.Quaternion();

function buildAdvocate() {
  const cloth = new GownCloth();
  const gown = gownWool();
  const cotton = whiteCotton();
  const skin = new THREE.MeshStandardMaterial({ color: new THREE.Color("#171210"), roughness: 0.8, metalness: 0, envMapIntensity: 0.08 });
  const hairMat = new THREE.MeshStandardMaterial({ color: new THREE.Color("#0a0909"), roughness: 0.96, metalness: 0 });
  const coat = new THREE.MeshStandardMaterial({ color: new THREE.Color("#08080a"), roughness: 0.95, metalness: 0, envMapIntensity: 0.05 });
  const wood = new THREE.MeshStandardMaterial({ color: new THREE.Color("#2a1a10"), roughness: 0.46, metalness: 0.04 });
  const brass = bronze({ roughness: 0.3 });

  const head = new THREE.SphereGeometry(FIGURE.headR, 36, 28);
  const hair = new THREE.SphereGeometry(FIGURE.headR * 1.07, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.56);
  const neck = new THREE.CylinderGeometry(0.062, 0.08, 0.2, 18);
  const collar = new THREE.CylinderGeometry(0.084, 0.09, 0.05, 28, 1, true);
  // coat + trousers in shadow: a tall, slightly tapered column from the hem to the collar (no rounded "belly")
  const torso = new THREE.CylinderGeometry(0.2, 0.16, 1.98, 24, 1, false);
  const bandGeo = new THREE.PlaneGeometry(0.058, 0.25, 1, 4);
  bandGeo.translate(0, -0.125, 0);
  const sleeve = new THREE.CylinderGeometry(0.072, 0.16, FIGURE.armLength * 0.92, 18, 1, true);
  sleeve.translate(0, -FIGURE.armLength * 0.46, 0);
  const hand = new THREE.SphereGeometry(0.052, 16, 12);
  const handleLen = FIGURE.gavelReach + 0.02;
  const handle = new THREE.CylinderGeometry(0.019, 0.025, handleLen, 14);
  handle.translate(0, 0.04 - handleLen / 2, 0);
  const gavelHead = new THREE.CylinderGeometry(0.075, 0.075, 0.27, 28);
  gavelHead.rotateZ(Math.PI / 2);
  const gavelBand = new THREE.CylinderGeometry(0.079, 0.079, 0.024, 28);
  gavelBand.rotateZ(Math.PI / 2);
  const pommel = new THREE.SphereGeometry(0.03, 14, 10);

  const dimmer = new Dimmer([gown, cotton, skin, hairMat, coat, wood, brass]);

  return {
    cloth,
    gown,
    cotton,
    skin,
    hairMat,
    coat,
    wood,
    brass,
    head,
    hair,
    neck,
    collar,
    torso,
    bandGeo,
    sleeve,
    hand,
    handle,
    gavelHead,
    gavelBand,
    pommel,
    dimmer,
  };
}

export function Advocate() {
  const [rig] = useState(buildAdvocate);
  useEffect(() => () => disposeAll(rig), [rig]);

  const figureRef = useRef<THREE.Group>(null);
  const bandsRef = useRef<THREE.Group>(null);
  const bandLeft = useRef<THREE.Mesh>(null);
  const bandRight = useRef<THREE.Mesh>(null);
  const armRef = useRef<THREE.Group>(null);
  const gavelRef = useRef<THREE.Group>(null);

  useActFrame((a) => {
    const fig = figureRef.current;
    if (!fig) return;

    // Pose: steps forward through scene 2, weight shifting; leans into the strike.
    fig.position.copy(a.figurePos);
    fig.rotation.set(a.figurePitch, 0, a.figureRoll);

    // Cloth
    rig.cloth.update({ t: a.t, wind: a.wind, amp: a.clothAmp, swirl: a.swirl });

    // Bands: hang from the collar, sway with the breath, lift with the wind.
    const bands = bandsRef.current;
    if (bands) {
      const n = simplex3(a.t * 0.55, 2.2, 0.5);
      const lift = Math.max(0, simplex3(a.t * 0.8, 5.1, 0.3));
      bands.rotation.z = n * 0.05 * (1 + a.swirl * 4);
      bands.rotation.x = -lift * a.swirl * 0.45 - a.figurePitch * 0.5;
      if (bandLeft.current) bandLeft.current.rotation.z = 0.075 + simplex3(a.t * 0.7, 8.3, 0) * 0.035 * (1 + a.swirl * 3);
      if (bandRight.current) bandRight.current.rotation.z = -0.075 - simplex3(a.t * 0.7, 1.9, 4) * 0.035 * (1 + a.swirl * 3);
    }

    // Right arm + gavel (scene 3)
    const arm = armRef.current;
    const gavel = gavelRef.current;
    if (arm && gavel) {
      arm.visible = a.p >= T.armVisible;
      if (arm.visible) {
        // raise: a slow arc from the hip to above the shoulder
        const alpha = lerp(0.15, 2.55, a.raise);
        tmpDir.set(-0.14 * Math.sin(alpha) - 0.04, -Math.cos(alpha), Math.sin(alpha)).normalize();
        qRaised.setFromUnitVectors(DOWN, tmpDir);

        // strike direction: shoulder → block, in figure-local space
        tmpQ.setFromEuler(fig.rotation).invert();
        tmpV.copy(STRIKE_POINT).sub(fig.position).applyQuaternion(tmpQ).sub(SHOULDER_LOCAL);
        const distance = tmpV.length();
        tmpV.divideScalar(distance || 1);
        qTarget.setFromUnitVectors(DOWN, tmpV);

        const drop = easeInCubic(a.drop);
        arm.quaternion.slerpQuaternions(qRaised, qTarget, drop);
        // recoil: a bounce back toward the raised pose right after impact
        const recoil = window01(a.p, T.strike, T.strike + 0.005, T.strike + 0.011, T.strike + 0.03);
        if (recoil > 0) arm.quaternion.slerp(qRaised, recoil * 0.1);

        // wrist: cocked back over the shoulder at the top, straight at impact
        gavel.rotation.x = -0.85 * a.raise * (1 - drop);
        // slide the grip so the head lands exactly on the block
        const reach = FIGURE.armLength + FIGURE.gavelReach;
        gavel.position.y = -FIGURE.armLength - (distance - reach) * drop;
      }
    }

    rig.dimmer.apply(a.fade);
  });

  return (
    <group ref={figureRef} position={[FIGURE.x, FLOOR_Y, FIGURE.zStart]}>
      {/* head, hair, neck — kept in shadow by low albedo; the key light draws only a rim */}
      <mesh geometry={rig.head} material={rig.skin} position={[0, FIGURE.headY - 0.01, 0]} scale={[0.94, 1.1, 0.98]} rotation-x={0.06} />
      <mesh geometry={rig.hair} material={rig.hairMat} position={[0, FIGURE.headY + 0.03, -0.02]} scale={[1, 1.06, 1.02]} rotation-x={-0.28} />
      <mesh geometry={rig.neck} material={rig.skin} position={[0, FIGURE.neckY, 0]} />
      {/* black coat under the gown, visible through the front opening */}
      <mesh geometry={rig.torso} material={rig.coat} position={[0, 1.04, 0]} scale={[1.1, 1, 0.72]} />
      {/* collar and the two white bands */}
      <mesh geometry={rig.collar} material={rig.cotton} position={[0, 2.075, 0.005]} />
      <group ref={bandsRef} position={[0, FIGURE.bandsY, FIGURE.bandsZ]}>
        <mesh ref={bandLeft} geometry={rig.bandGeo} material={rig.cotton} position={[-0.034, 0, 0]} rotation-z={0.075} />
        <mesh ref={bandRight} geometry={rig.bandGeo} material={rig.cotton} position={[0.034, 0, 0.002]} rotation-z={-0.075} />
      </group>
      {/* the gown */}
      <mesh geometry={rig.cloth.geometry} material={rig.gown} frustumCulled={false} />
      {/* right arm and gavel */}
      <group ref={armRef} position={[SHOULDER_LOCAL.x, SHOULDER_LOCAL.y, SHOULDER_LOCAL.z]} visible={false}>
        <mesh geometry={rig.sleeve} material={rig.gown} />
        <mesh geometry={rig.hand} material={rig.skin} position={[0, -FIGURE.armLength, 0]} />
        <group ref={gavelRef} position={[0, -FIGURE.armLength, 0]}>
          <mesh geometry={rig.handle} material={rig.wood} />
          <mesh geometry={rig.pommel} material={rig.brass} position={[0, 0.05, 0]} />
          <group position={[0, -FIGURE.gavelReach, 0]}>
            <mesh geometry={rig.gavelHead} material={rig.wood} />
            <mesh geometry={rig.gavelBand} material={rig.brass} position={[0.105, 0, 0]} />
            <mesh geometry={rig.gavelBand} material={rig.brass} position={[-0.105, 0, 0]} />
          </group>
        </group>
      </group>
    </group>
  );
}
