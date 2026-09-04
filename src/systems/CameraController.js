import * as THREE from 'three';
import { COURT_WIDTH, COURT_LENGTH } from '../constants.js';

/**
 * Side-follow camera that tracks the ball and the human player.
 * Punch is a short kick-zoom + shake used for shoot feedback.
 */
export class CameraController {
  constructor(camera) {
    this.camera = camera;
    this.target = new THREE.Vector3(0, 0, 0);
    this.offset = new THREE.Vector3(26, 16, 0);
    this.smoothness = 3;
    this.shake = 0;
    this.punchZoom = 0;

    camera.position.copy(this.offset);
    camera.lookAt(0, 0, 0);
  }

  punch(strength = 1.15) {
    this.shake = strength;
    this.punchZoom = 6;
  }

  update(dt, ballPos, playerPos) {
    const focusPoint = new THREE.Vector3();
    if (ballPos && playerPos) {
      focusPoint.lerpVectors(ballPos, playerPos, 0.3);
    } else if (ballPos) {
      focusPoint.copy(ballPos);
    }

    focusPoint.x = THREE.MathUtils.clamp(focusPoint.x, -COURT_WIDTH / 3, COURT_WIDTH / 3);
    focusPoint.z = THREE.MathUtils.clamp(focusPoint.z, -COURT_LENGTH / 3, COURT_LENGTH / 3);

    this.target.lerp(focusPoint, dt * this.smoothness);
    this.punchZoom = THREE.MathUtils.damp(this.punchZoom, 0, 8, dt);

    const desiredPos = new THREE.Vector3(
      this.offset.x - this.punchZoom,
      this.offset.y - this.punchZoom * 0.25,
      this.target.z * 0.5
    );

    this.camera.position.lerp(desiredPos, dt * this.smoothness);

    if (this.shake > 0.02) {
      this.camera.position.x += (Math.random() - 0.5) * this.shake * 0.45;
      this.camera.position.y += (Math.random() - 0.5) * this.shake * 0.25;
      this.shake = THREE.MathUtils.damp(this.shake, 0, 12, dt);
    } else {
      this.shake = 0;
    }

    this.camera.lookAt(this.target.x, 0.4, this.target.z);
  }

  setMatchView() {
    this.offset.set(26, 16, 0);
    this.smoothness = 3;
  }
}
