import * as THREE from 'three';
import { TEAM_HOME, TEAM_HOME_COLOR, TEAM_AWAY_COLOR } from '../constants.js';
import { setShadow } from '../utils/shadows.js';
import { createJerseyMark, createYouSpriteTexture } from '../utils/textures.js';

export function createPlayerMesh({ team, legend, isHuman }) {
  const group = new THREE.Group();
  const isHome = team === TEAM_HOME;
  const jersey = isHome ? TEAM_HOME_COLOR : TEAM_AWAY_COLOR;
  const shorts = isHome ? 0x2a220c : 0x3a0c12;
  const socks = isHome ? 0x1a1408 : 0x22080c;
  const accent = legend?.color ?? 0xffffff;
  const skin = 0xc4a06a;
  const hair = 0x2a1a10;
  const ink = isHome ? '#1a1200' : '#fff5e8';
  const letter = legend?.name?.[0]?.toUpperCase() ?? '?';

  const jerseyMat = new THREE.MeshStandardMaterial({
    color: jersey,
    roughness: 0.48,
    metalness: 0.06,
    emissive: jersey,
    emissiveIntensity: 0.18,
  });
  const shortsMat = new THREE.MeshStandardMaterial({ color: shorts, roughness: 0.7 });
  const sockMat = new THREE.MeshStandardMaterial({ color: socks, roughness: 0.75 });
  const skinMat = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.65 });
  const hairMat = new THREE.MeshStandardMaterial({ color: hair, roughness: 0.8 });
  const accentMat = new THREE.MeshStandardMaterial({
    color: accent,
    roughness: 0.4,
    emissive: accent,
    emissiveIntensity: 0.22,
  });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.45, metalness: 0.15 });

  const hips = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.24), shortsMat);
  hips.position.y = 0.82;
  setShadow(hips, true, true);
  group.add(hips);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.54, 0.34), jerseyMat);
  torso.position.y = 1.16;
  setShadow(torso, true, true);
  group.add(torso);

  const collar = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.08, 0.22), accentMat);
  collar.position.y = 1.44;
  group.add(collar);

  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.31), accentMat);
  stripe.position.y = 1.16;
  group.add(stripe);

  const mark = new THREE.Mesh(
    new THREE.PlaneGeometry(0.28, 0.28),
    new THREE.MeshBasicMaterial({ map: createJerseyMark(letter, ink), transparent: true })
  );
  mark.position.set(0, 1.18, 0.16);
  group.add(mark);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), skinMat);
  head.position.y = 1.66;
  setShadow(head, true, false);
  group.add(head);

  const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.21, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.55), hairMat);
  hairCap.position.y = 1.72;
  group.add(hairCap);

  for (const side of [-1, 1]) {
    const upper = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.4, 0.16), jerseyMat);
    upper.position.set(side * 0.38, 1.18, 0);
    upper.rotation.z = side * 0.16;
    setShadow(upper, true, false);
    group.add(upper);

    const forearm = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.32, 0.13), skinMat);
    forearm.position.set(side * 0.48, 0.86, 0.05);
    forearm.rotation.z = side * 0.22;
    setShadow(forearm, true, false);
    group.add(forearm);

    const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.4, 0.18), shortsMat);
    thigh.position.set(side * 0.14, 0.56, 0);
    setShadow(thigh, true, false);
    group.add(thigh);

    const calf = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.34, 0.15), sockMat);
    calf.position.set(side * 0.14, 0.22, 0);
    setShadow(calf, true, false);
    group.add(calf);

    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.28), shoeMat);
    shoe.position.set(side * 0.13, 0.05, 0.04);
    setShadow(shoe, true, true);
    group.add(shoe);
  }

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
    new THREE.TorusGeometry(0.55, 0.035, 8, 28),
    new THREE.MeshBasicMaterial({
      color: isHome ? 0xffee88 : 0xff8890,
      transparent: true,
      opacity: 0,
    })
  );
  possessionRing.rotation.x = Math.PI / 2;
  possessionRing.position.y = 0.06;
  group.add(possessionRing);

  let humanMarker = null;
  let youSprite = null;
  if (isHuman) {
    humanMarker = new THREE.Mesh(
      new THREE.TorusGeometry(0.7, 0.045, 8, 32),
      new THREE.MeshBasicMaterial({
        color: 0xffcc00,
        transparent: true,
        opacity: 0.9,
      })
    );
    humanMarker.rotation.x = Math.PI / 2;
    humanMarker.position.y = 0.04;
    group.add(humanMarker);

    youSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: createYouSpriteTexture(),
      transparent: true,
      depthTest: false,
    }));
    youSprite.scale.set(1.15, 0.42, 1);
    youSprite.position.y = 2.28;
    group.add(youSprite);
  }

  return { group, glowRing, possessionRing, humanMarker, youSprite };
}
