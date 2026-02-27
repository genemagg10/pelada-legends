import * as THREE from 'three';
import { COURT_WIDTH, COURT_LENGTH } from '../constants.js';

/**
 * CameraController implements a "Dynamic Side-Follow" camera
 * that tracks the ball and player like a televised street match.
 */
export class CameraController {
  constructor(camera) {
    this.camera = camera;
    this.target = new THREE.Vector3(0, 0, 0);
    this.offset = new THREE.Vector3(35, 25, 0);
    this.smoothness = 3;

    // Initial position
    camera.position.copy(this.offset);
    camera.lookAt(0, 0, 0);
  }

  update(dt, ballPos, playerPos) {
    // The camera follows a point between the ball and the player
    const focusPoint = new THREE.Vector3();
    if (ballPos && playerPos) {
      focusPoint.lerpVectors(ballPos, playerPos, 0.3);
    } else if (ballPos) {
      focusPoint.copy(ballPos);
    }

    // Clamp focus to court bounds
    focusPoint.x = THREE.MathUtils.clamp(focusPoint.x, -COURT_WIDTH / 3, COURT_WIDTH / 3);
    focusPoint.z = THREE.MathUtils.clamp(focusPoint.z, -COURT_LENGTH / 3, COURT_LENGTH / 3);

    // Smooth target follow
    this.target.lerp(focusPoint, dt * this.smoothness);

    // Camera position follows the target with a side-view offset
    const desiredPos = new THREE.Vector3(
      this.offset.x,
      this.offset.y,
      this.target.z * 0.5
    );

    this.camera.position.lerp(desiredPos, dt * this.smoothness);
    this.camera.lookAt(this.target.x, 0, this.target.z);
  }

  setMatchView() {
    this.offset.set(35, 25, 0);
    this.smoothness = 3;
  }

  setCloseUpView() {
    this.offset.set(15, 10, 5);
    this.smoothness = 5;
  }

  setOverheadView() {
    this.offset.set(0, 50, 0);
    this.smoothness = 2;
  }
}
