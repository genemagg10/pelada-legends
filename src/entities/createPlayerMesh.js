import * as THREE from 'three';
import {
  TEAM_HOME, TEAM_HOME_COLOR, TEAM_AWAY_COLOR,
  COLOR_GOLD, PLAYER_HEIGHT,
} from '../constants.js';
import { setShadow } from '../utils/shadows.js';
import { createJerseyMark } from '../utils/textures.js';

/**
 * Low-poly pawn: head / torso / legs / feet. ~1.8u.
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
    roughness: 0.52,
    metalness: 0.05,
    emissive: kit,
    emissiveIntensity: isHome ? 0.18 : 0.08,
  });
  const darkMat = new THREE.MeshStandardMaterial({
    color: isHome ? 0x3d1f00 : 0x2a0a10,
    roughness: 0.7,
  });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xc4a06a, roughness: 0.65 });
  const accentMat = new THREE.MeshStandardMaterial({
    color: accent,
    roughness: 0.4,
    emissive: accent,
    emissiveIntensity: 0.22,
  });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0x1a1008, roughness: 0.5 });

  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.62, 0.18), darkMat);
    leg.position.set(side * 0.14, 0.43, 0);
    setShadow(leg, true, false);
    group.add(leg);

    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.3), shoeMat);
    foot.position.set(side * 0.14, 0.06, 0.04);
    setShadow(foot, true, true);
    group.add(foot);
  }

  const hips = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.16, 0.28), darkMat);
  hips.position.y = 0.78;
  setShadow(hips, true, true);
  group.add(hips);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.58, 0.32), kitMat);
  torso.position.y = 1.14;
  setShadow(torso, true, true);
  group.add(torso);

  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.56, 0.33), accentMat);
  stripe.position.y = 1.14;
  group.add(stripe);

  const mark = new THREE.Mesh(
    new THREE.PlaneGeometry(0.28, 0.28),
    new THREE.MeshBasicMaterial({ map: createJerseyMark(letter, ink), transparent: true })
  );
  mark.position.set(0, 1.16, 0.17);
  group.add(mark);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), skinMat);
  head.position.y = 1.62;
  setShadow(head, true, false);
  group.add(head);

  const glowRing = new THREE.Mesh(
    new THREE.RingGeometry(0.62, 0.82, 28),
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
    new THREE.CircleGeometry(0.82, 28),
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
    // Gold floor ring only — HUD already labels YOU. No head chevron / sprite.
    humanMarker = new THREE.Mesh(
      new THREE.RingGeometry(0.68, 0.92, 32),
      new THREE.MeshStandardMaterial({
        color: COLOR_GOLD,
        emissive: COLOR_GOLD,
        emissiveIntensity: 0.4,
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
