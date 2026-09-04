import * as THREE from 'three';
import { BALL_RADIUS, TEAM_HOME, TEAM_AWAY, TEAM_HOME_COLOR, TEAM_AWAY_COLOR, COLOR_BALL } from '../constants.js';
import { setShadow } from '../utils/shadows.js';
import { createSoccerTexture } from '../utils/textures.js';

export class Ball {
  constructor(scene, physicsBody) {
    this.body = physicsBody;
    this.scene = scene;

    const geo = new THREE.IcosahedronGeometry(BALL_RADIUS, 1);
    const mat = new THREE.MeshStandardMaterial({
      color: COLOR_BALL,
      map: createSoccerTexture(),
      roughness: 0.38,
      metalness: 0.04,
      emissive: 0x221808,
      emissiveIntensity: 0.22,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    setShadow(this.mesh, true, false);
    scene.add(this.mesh);

    this.trail = [];
    this.trailMeshes = [];
    const trailGeo = new THREE.SphereGeometry(BALL_RADIUS * 0.42, 6, 6);
    for (let i = 0; i < 5; i++) {
      const m = new THREE.Mesh(trailGeo, new THREE.MeshBasicMaterial({
        color: 0xffe08a,
        transparent: true,
        opacity: 0,
      }));
      m.visible = false;
      scene.add(m);
      this.trailMeshes.push(m);
    }

    this.showTrail = false;
    this.trailColor = 0xffe08a;
    this.autoTrailUntil = 0;
    this.kickTimer = 0;
    this.kickHold = 0;
    this.scaleVel = new THREE.Vector3();
    this.prevSpeed = 0;
    this.prevVy = 0;
    this.possessionTeam = null;
    this.onImpact = null;
  }

  setTrail(active, color = 0xffe08a, duration = 0.28) {
    this.showTrail = active;
    this.trailColor = color;
    this.autoTrailUntil = active && duration > 0 ? performance.now() + duration * 1000 : 0;
  }

  kickJuice(power = 20) {
    const n = THREE.MathUtils.clamp(power / 28, 0.4, 1.35);
    this.kickTimer = 0.26;
    this.kickHold = 0.034;
    this.scaleVel.set(0, 0, 0);
    this.mesh.scale.set(1 + 0.38 * n, Math.max(0.4, 1 - 0.52 * n), 1 + 0.38 * n);
    this.setTrail(true, 0xffe8a0, 0.22 + n * 0.12);
  }

  setPossessionTeam(team) {
    this.possessionTeam = team;
    if (team === TEAM_HOME) {
      this.mesh.material.emissive.setHex(TEAM_HOME_COLOR);
      this.mesh.material.emissiveIntensity = 0.72;
      this.trailColor = TEAM_HOME_COLOR;
    } else if (team === TEAM_AWAY) {
      this.mesh.material.emissive.setHex(TEAM_AWAY_COLOR);
      this.mesh.material.emissiveIntensity = 0.68;
      this.trailColor = TEAM_AWAY_COLOR;
    } else {
      this.mesh.material.emissive.setHex(0x221808);
      this.mesh.material.emissiveIntensity = 0.22;
      this.trailColor = 0xffe08a;
    }
  }

  update(dt = 0.016) {
    this.mesh.position.copy(this.body.position);
    this.mesh.quaternion.copy(this.body.quaternion);

    const vel = this.body.velocity;
    const speed = vel.length();

    if (speed > this.prevSpeed + 10) {
      this.kickJuice(speed);
    }

    if (this.prevVy < -3.2 && vel.y > -0.8 && this.body.position.y < BALL_RADIUS + 0.45) {
      if (this.onImpact) this.onImpact(this.body.position.x, this.body.position.z, speed);
    }

    if (this.kickTimer > 0) {
      this.kickTimer = Math.max(0, this.kickTimer - dt);
      if (this.kickHold > 0) {
        this.kickHold -= dt;
      } else {
        const stiff = 82;
        const damp = 10;
        const s = this.mesh.scale;
        const v = this.scaleVel;
        v.x += (stiff * (1 - s.x) - damp * v.x) * dt;
        v.y += (stiff * (1 - s.y) - damp * v.y) * dt;
        v.z += (stiff * (1 - s.z) - damp * v.z) * dt;
        s.x += v.x * dt;
        s.y += v.y * dt;
        s.z += v.z * dt;
      }
    } else if (speed > 11) {
      const k = THREE.MathUtils.clamp((speed - 11) / 22, 0, 0.28);
      this.mesh.scale.set(1 - k * 0.28, 1 - k * 0.28, 1 + k);
    } else {
      this.mesh.scale.setScalar(1);
    }

    if (this.autoTrailUntil && performance.now() > this.autoTrailUntil) {
      this.showTrail = false;
      this.autoTrailUntil = 0;
    }

    const trailOn = this.showTrail || speed > 12;
    if (trailOn) {
      this.trail.unshift(this.mesh.position.clone());
      if (this.trail.length > this.trailMeshes.length) this.trail.pop();
    } else {
      this.trail = [];
    }

    for (let i = 0; i < this.trailMeshes.length; i++) {
      if (i < this.trail.length) {
        this.trailMeshes[i].position.copy(this.trail[i]);
        this.trailMeshes[i].material.opacity = 0.4 * (1 - i / this.trailMeshes.length);
        this.trailMeshes[i].material.color.setHex(this.trailColor);
        this.trailMeshes[i].visible = true;
        const s = 0.85 - i * 0.12;
        this.trailMeshes[i].scale.set(s * 0.7, s * 0.7, s * 1.35);
      } else {
        this.trailMeshes[i].visible = false;
      }
    }

    this.prevSpeed = speed;
    this.prevVy = vel.y;
  }

  getPosition() {
    return new THREE.Vector3().copy(this.body.position);
  }

  getVelocity() {
    return new THREE.Vector3(this.body.velocity.x, this.body.velocity.y, this.body.velocity.z);
  }
}
