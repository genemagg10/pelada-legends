import * as THREE from 'three';
import {
  TEAM_HOME, TEAM_HOME_COLOR, TEAM_AWAY_COLOR,
  PLAYER_RADIUS, PLAYER_HEIGHT,
} from '../constants.js';
import { setShadow } from '../utils/shadows.js';
import { createJerseyMark, createYouSpriteTexture } from '../utils/textures.js';

const CAPSULE_RADIUS = PLAYER_RADIUS;
const CAPSULE_LENGTH = PLAYER_HEIGHT - PLAYER_RADIUS * 2;

export function createPlayerMesh({ team, legend, isHuman }) {
  const group = new THREE.Group();
  const isHome = team === TEAM_HOME;
  const jersey = isHome ? TEAM_HOME_COLOR : TEAM_AWAY_COLOR;
  const accent = legend?.color ?? 0xffffff;
  const ink = isHome ? '#1a1200' : '#fff5e8';
  const letter = legend?.name?.[0]?.toUpperCase() ?? '?';

  const jerseyMat = new THREE.MeshStandardMaterial({
    color: jersey,
    roughness: 0.5,
    metalness: 0.06,
    emissive: jersey,
    emissiveIntensity: 0.16,
  });
  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xc4a06a,
    roughness: 0.65,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: accent,
    roughness: 0.4,
    emissive: accent,
    emissiveIntensity: 0.28,
  });

  const torso = new THREE.Mesh(
    new THREE.CapsuleGeometry(CAPSULE_RADIUS, CAPSULE_LENGTH, 4, 10),
    jerseyMat
  );
  torso.position.y = PLAYER_HEIGHT / 2;
  setShadow(torso, true, true);
  group.add(torso);

  const stripe = new THREE.Mesh(
    new THREE.CylinderGeometry(CAPSULE_RADIUS + 0.02, CAPSULE_RADIUS + 0.02, 0.16, 12),
    accentMat
  );
  stripe.position.y = 1.15;
  group.add(stripe);

  const mark = new THREE.Mesh(
    new THREE.PlaneGeometry(0.32, 0.32),
    new THREE.MeshBasicMaterial({ map: createJerseyMark(letter, ink), transparent: true })
  );
  mark.position.set(0, 1.12, CAPSULE_RADIUS + 0.02);
  group.add(mark);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), skinMat);
  head.position.y = PLAYER_HEIGHT - 0.12;
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
    new THREE.CircleGeometry(0.85, 28),
    new THREE.MeshBasicMaterial({
      color: isHome ? TEAM_HOME_COLOR : TEAM_AWAY_COLOR,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    })
  );
  possessionRing.rotation.x = -Math.PI / 2;
  possessionRing.position.y = 0.04;
  group.add(possessionRing);

  let humanMarker = null;
  let youSprite = null;
  if (isHuman) {
    humanMarker = new THREE.Mesh(
      new THREE.RingGeometry(0.72, 0.88, 28),
      new THREE.MeshBasicMaterial({
        color: 0xffcc00,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
      })
    );
    humanMarker.rotation.x = -Math.PI / 2;
    humanMarker.position.y = 0.05;
    group.add(humanMarker);

    youSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: createYouSpriteTexture(),
      transparent: true,
      depthTest: false,
    }));
    youSprite.scale.set(1.1, 0.4, 1);
    youSprite.position.y = 2.22;
    group.add(youSprite);
  }

  return { group, glowRing, possessionRing, humanMarker, youSprite };
}
