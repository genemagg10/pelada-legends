import * as THREE from 'three';

const GAME_KEYS = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD',
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'Space', 'KeyE', 'ShiftLeft', 'ShiftRight',
]);

export class InputManager {
  constructor() {
    this.keys = {};
    this.justPressed = {};

    window.addEventListener('keydown', (e) => {
      if (GAME_KEYS.has(e.code)) e.preventDefault();
      if (!this.keys[e.code]) this.justPressed[e.code] = true;
      this.keys[e.code] = true;
    });

    window.addEventListener('keyup', (e) => {
      if (GAME_KEYS.has(e.code)) e.preventDefault();
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
    return false;
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
