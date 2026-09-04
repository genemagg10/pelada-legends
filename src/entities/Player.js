import * as THREE from 'three';
import {
  PLAYER_SPEED, SPRINT_MULTIPLIER, BALL_POSSESSION_DIST,
  SHOOT_POWER, PASS_POWER, TEAM_HOME, COURT_LENGTH,
} from '../constants.js';
import { createPlayerMesh } from './createPlayerMesh.js';

export class Player {
  constructor(scene, physicsBody, legendData, team, isHuman = false) {
    this.body = physicsBody;
    this.legend = legendData;
    this.team = team;
    this.isHuman = isHuman;
    this.scene = scene;

    const visuals = createPlayerMesh({ team, legend: legendData, isHuman });
    this.mesh = visuals.group;
    this.glowRing = visuals.glowRing;
    this.possessionRing = visuals.possessionRing;
    this.humanMarker = visuals.humanMarker;
    this.youSprite = visuals.youSprite;
    scene.add(this.mesh);

    this.hasBall = false;
    this.facingDir = new THREE.Vector3(0, 0, team === TEAM_HOME ? 1 : -1);
    this.moveDir = new THREE.Vector3();
    this.isSpecialActive = false;
    this.specialTimer = 0;
    this.originalMass = this.body.mass;
    this.distanceToBall = Infinity;

    this.aiRole = 'idle';
    this.aiTarget = new THREE.Vector3();
    this.aiTimer = 0;
  }

  update(dt, ballPos) {
    this.mesh.position.set(
      this.body.position.x,
      this.body.position.y - 0.9,
      this.body.position.z
    );

    if (this.facingDir.lengthSq() > 0.01) {
      this.mesh.rotation.y = Math.atan2(this.facingDir.x, this.facingDir.z);
    }

    const t = performance.now() * 0.003;
    if (this.glowRing) {
      this.glowRing.material.opacity = this.isSpecialActive ? 0.55 + Math.sin(t * 5) * 0.3 : 0;
    }

    if (this.possessionRing) {
      this.possessionRing.material.opacity = this.hasBall ? 0.85 : 0;
      this.possessionRing.scale.setScalar(this.hasBall ? 1 + Math.sin(t * 6) * 0.08 : 1);
    }

    if (this.humanMarker) {
      this.humanMarker.material.opacity = 0.7 + Math.sin(t * 3) * 0.2;
      this.humanMarker.scale.setScalar(1 + Math.sin(t * 2.4) * 0.06);
      if (this.humanMarker.userData.chevron) {
        this.humanMarker.userData.chevron.position.y = 2.08 + Math.sin(t * 2) * 0.08;
      }
    }

    if (this.specialTimer > 0) {
      this.specialTimer -= dt;
      if (this.specialTimer <= 0) {
        this.deactivateSpecial();
      }
    }

    if (ballPos) {
      this.distanceToBall = new THREE.Vector3(this.body.position.x, 0, this.body.position.z)
        .distanceTo(new THREE.Vector3(ballPos.x, 0, ballPos.z));
    }
  }

  move(dir, sprint = false) {
    const speed = PLAYER_SPEED * (this.legend ? this.legend.speed / 90 : 1) * (sprint ? SPRINT_MULTIPLIER : 1);
    this.body.velocity.x = dir.x * speed;
    this.body.velocity.z = dir.z * speed;

    if (dir.lengthSq() > 0.01) {
      this.facingDir.copy(dir).normalize();
      this.moveDir.copy(dir);
    }
  }

  shoot(targetDir, power = SHOOT_POWER) {
    return {
      direction: targetDir.clone().normalize(),
      power: power * (this.legend ? this.legend.power / 90 : 1),
    };
  }

  pass(targetPos) {
    const dir = new THREE.Vector3()
      .subVectors(targetPos, new THREE.Vector3(this.body.position.x, 0, this.body.position.z))
      .normalize();
    return {
      direction: dir,
      power: PASS_POWER,
    };
  }

  activateSpecial() {
    this.isSpecialActive = true;
    this.specialTimer = 3;
  }

  deactivateSpecial() {
    this.isSpecialActive = false;
    this.specialTimer = 0;
    if (this.legend && this.legend.id === 'r9') {
      this.body.mass = this.originalMass;
      this.body.updateMassProperties();
    }
  }

  dispose() {
    this.scene.remove(this.mesh);
  }

  getPosition() {
    return new THREE.Vector3(this.body.position.x, 0, this.body.position.z);
  }

  getForwardDir() {
    return this.team === TEAM_HOME ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, 0, -1);
  }

  getGoalDir() {
    const goalZ = this.team === TEAM_HOME ? COURT_LENGTH / 2 : -COURT_LENGTH / 2;
    return new THREE.Vector3(0, 0, goalZ).sub(this.getPosition()).normalize();
  }

  isInPossessionRange() {
    return this.distanceToBall < BALL_POSSESSION_DIST;
  }
}
