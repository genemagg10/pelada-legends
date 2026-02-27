import * as THREE from 'three';

/**
 * InputManager handles WASD/Arrow keys, Space, Shift, and E inputs.
 */
export class InputManager {
  constructor() {
    this.keys = {};
    this.justPressed = {};

    window.addEventListener('keydown', (e) => {
      if (!this.keys[e.code]) {
        this.justPressed[e.code] = true;
      }
      this.keys[e.code] = true;
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });
  }

  getMoveDirection() {
    const dir = new THREE.Vector3(0, 0, 0);

    if (this.keys['KeyW'] || this.keys['ArrowUp']) dir.z += 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) dir.z -= 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) dir.x -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) dir.x += 1;

    if (dir.lengthSq() > 0) dir.normalize();
    return dir;
  }

  isSprinting() {
    return false; // Sprint is separate from special move now
  }

  isShootPressed() {
    return this.justPressed['Space'];
  }

  isPassPressed() {
    return this.justPressed['KeyE'];
  }

  isSpecialPressed() {
    return this.justPressed['ShiftLeft'] || this.justPressed['ShiftRight'];
  }

  isMoving() {
    return this.keys['KeyW'] || this.keys['ArrowUp'] ||
           this.keys['KeyS'] || this.keys['ArrowDown'] ||
           this.keys['KeyA'] || this.keys['ArrowLeft'] ||
           this.keys['KeyD'] || this.keys['ArrowRight'];
  }

  clearJustPressed() {
    this.justPressed = {};
  }
}
