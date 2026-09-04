import * as THREE from 'three';
import { COURT_WIDTH, COURT_LENGTH } from '../constants.js';

const MIN_PITCH = THREE.MathUtils.degToRad(18);
const MAX_PITCH = THREE.MathUtils.degToRad(40);

/**
 * Spring-follow side camera.
 * Loose ball → ball bias. Possession → carrier bias.
 * FOV punch is 80–120ms and scales with shot power. Shake is damped.
 */
export class CameraController {
  constructor(camera) {
    this.camera = camera;
    this.offset = new THREE.Vector3(28, 17, 0);
    this.posVel = new THREE.Vector3();
    this.look = new THREE.Vector3();
    this.lookVel = new THREE.Vector3();
    this.stiffness = 22;
    this.damping = 7.5;
    this.lookStiffness = 18;
    this.baseFov = 55;
    this.fovKick = 0;
    this.fovTime = 0;
    this.fovAge = 0;
    this.shake = 0;

    camera.fov = this.baseFov;
    camera.position.copy(this.offset);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }

  punch(powerNorm = 0.7) {
    const n = THREE.MathUtils.clamp(powerNorm, 0.3, 1.2);
    this.fovKick = 2.2 + n * 3.2;
    this.fovTime = 0.08 + n * 0.04;
    this.fovAge = 0;
    this.shake = 0.18 * n;
  }

  update(dt, ballPos, carrierPos, humanPos, held) {
    const focus = new THREE.Vector3();
    if (held && carrierPos && ballPos) {
      focus.lerpVectors(ballPos, carrierPos, 0.58);
    } else if (ballPos && humanPos) {
      focus.lerpVectors(humanPos, ballPos, 0.82);
    } else if (ballPos) {
      focus.copy(ballPos);
    }

    focus.x = THREE.MathUtils.clamp(focus.x, -COURT_WIDTH / 3, COURT_WIDTH / 3);
    focus.z = THREE.MathUtils.clamp(focus.z, -COURT_LENGTH / 3, COURT_LENGTH / 3);
    focus.y = 0.35;

    const desired = new THREE.Vector3(
      this.offset.x,
      this.offset.y,
      focus.z * 0.48
    );

    this._spring(this.camera.position, this.posVel, desired, this.stiffness, this.damping, dt);
    this._spring(this.look, this.lookVel, focus, this.lookStiffness, this.damping, dt);
    this._clampPitch(this.look);

    if (this.fovTime > 0 && this.fovAge < this.fovTime) {
      this.fovAge += dt;
      const u = THREE.MathUtils.clamp(this.fovAge / this.fovTime, 0, 1);
      this.camera.fov = this.baseFov + this.fovKick * Math.sin(u * Math.PI);
    } else {
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, this.baseFov, 14, dt);
      this.fovTime = 0;
    }
    this.camera.updateProjectionMatrix();

    if (this.shake > 0.008) {
      this.camera.position.x += (Math.random() - 0.5) * this.shake * 0.16;
      this.camera.position.y += (Math.random() - 0.5) * this.shake * 0.1;
      this.shake *= Math.exp(-16 * dt);
    } else {
      this.shake = 0;
    }

    this.camera.lookAt(this.look.x, this.look.y, this.look.z);
  }

  _spring(current, vel, target, stiffness, damping, dt) {
    vel.x += (target.x - current.x) * stiffness * dt;
    vel.y += (target.y - current.y) * stiffness * dt;
    vel.z += (target.z - current.z) * stiffness * dt;
    const decay = Math.exp(-damping * dt);
    vel.multiplyScalar(decay);
    current.addScaledVector(vel, dt);
  }

  _clampPitch(look) {
    const cam = this.camera.position;
    const dx = look.x - cam.x;
    const dz = look.z - cam.z;
    const horiz = Math.sqrt(dx * dx + dz * dz) || 0.001;
    const pitch = Math.atan2(cam.y - look.y, horiz);
    const clamped = THREE.MathUtils.clamp(pitch, MIN_PITCH, MAX_PITCH);
    if (clamped !== pitch) {
      cam.y = look.y + horiz * Math.tan(clamped);
    }
  }

  setMatchView() {
    this.offset.set(28, 17, 0);
  }
}
