import * as THREE from 'three';
import {
  TEAM_HOME, TEAM_HOME_COLOR, TEAM_AWAY_COLOR,
  COLOR_GOLD, PLAYER_HEIGHT,
} from '../constants.js';
import { setShadow } from '../utils/shadows.js';
import { createJerseyMark } from '../utils/textures.js';

/**
 * Shared toy-hero mini-figure: big head, tapered torso, chunky shoes.
 * Team mass first (gold vs rival red), then a legend accent stripe/collar.
 * Human selection is a flat gold ground ring — never a cone.
 */
export function createPlayerMesh({ team, legend, isHuman }) {
  const group = new THREE.Group();
  const isHome = team === TEAM_HOME;
  const kit = isHome ? TEAM_HOME_COLOR : TEAM_AWAY_COLOR;
  const accent = legend?.color ?? COLOR_GOLD;
  const ink = isHome ? '#1a1200' : '#fff5e8';
  const letter = legend?.name?.[0]?.toUpperCase() ?? '?';

  const kitMat = new THREE.MeshStandardMaterial({
    color: kit,
    roughness: 0.55,
    metalness: 0.04,
    emissive: kit,
    emissiveIntensity: isHome ? 0.2 : 0.14,
  });
  const shortsMat = new THREE.MeshStandardMaterial({
    color: isHome ? 0x3d1f00 : 0x1a080c,
    roughness: 0.72,
  });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xc4a06a, roughness: 0.62 });
  const accentMat = new THREE.MeshStandardMaterial({
    color: accent,
    roughness: 0.42,
    emissive: accent,
    emissiveIntensity: 0.2,
  });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0x14100a, roughness: 0.48 });
  const hairMat = new THREE.MeshStandardMaterial({
    color: isHome ? 0x2a1608 : 0x1a1008,
    roughness: 0.8,
  });

  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.58, 0.2), shortsMat);
    leg.position.set(side * 0.16, 0.4, 0);
    setShadow(leg, true, false);
    group.add(leg);

    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.12, 0.4), shoeMat);
    foot.position.set(side * 0.16, 0.07, 0.07);
    setShadow(foot, true, true);
    group.add(foot);

    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.5, 0.14), kitMat);
    arm.position.set(side * 0.38, 1.12, 0);
    setShadow(arm, true, false);
    group.add(arm);

    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.13, 0.13), skinMat);
    hand.position.set(side * 0.38, 0.84, 0.02);
    group.add(hand);
  }

  const hips = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.3), shortsMat);
  hips.position.y = 0.74;
  setShadow(hips, true, true);
  group.add(hips);

  const waist = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.22, 0.3), kitMat);
  waist.position.y = 0.92;
  setShadow(waist, true, true);
  group.add(waist);

  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.4, 0.36), kitMat);
  chest.position.y = 1.2;
  setShadow(chest, true, true);
  group.add(chest);

  const collar = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.08, 0.38), accentMat);
  collar.position.y = 1.42;
  group.add(collar);

  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.58, 0.37), accentMat);
  stripe.position.y = 1.12;
  group.add(stripe);

  const mark = new THREE.Mesh(
    new THREE.PlaneGeometry(0.26, 0.26),
    new THREE.MeshBasicMaterial({ map: createJerseyMark(letter, ink), transparent: true })
  );
  mark.position.set(0, 1.18, 0.185);
  group.add(mark);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 10), skinMat);
  head.position.y = 1.72;
  setShadow(head, true, false);
  group.add(head);

  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.29, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), hairMat);
  hair.position.set(0, 1.78, 0);
  group.add(hair);

  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.07, 0.08), hairMat);
  visor.position.set(0, 1.74, 0.22);
  group.add(visor);

  const glowRing = new THREE.Mesh(
    new THREE.RingGeometry(0.68, 0.9, 28),
    new THREE.MeshBasicMaterial({
      color: accent,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    })
  );
  glowRing.rotation.x = -Math.PI / 2;
  glowRing.position.y = 0.03;
  group.add(glowRing);

  const possessionRing = new THREE.Mesh(
    new THREE.CircleGeometry(0.88, 28),
    new THREE.MeshBasicMaterial({
      color: kit,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    })
  );
  possessionRing.rotation.x = -Math.PI / 2;
  possessionRing.position.y = 0.035;
  group.add(possessionRing);

  let humanMarker = null;
  if (isHuman) {
    humanMarker = new THREE.Mesh(
      new THREE.RingGeometry(0.72, 0.98, 32),
      new THREE.MeshStandardMaterial({
        color: COLOR_GOLD,
        emissive: COLOR_GOLD,
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.92,
        side: THREE.DoubleSide,
        roughness: 0.4,
        metalness: 0.1,
      })
    );
    humanMarker.rotation.x = -Math.PI / 2;
    humanMarker.position.y = 0.04;
    group.add(humanMarker);
  }

  group.userData.height = PLAYER_HEIGHT;
  return { group, glowRing, possessionRing, humanMarker };
}
