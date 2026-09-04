import * as THREE from 'three';

const GAME_KEYS = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD',
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'Space', 'KeyE', 'ShiftLeft', 'ShiftRight',
]);

/**
 * Keyboard + on-screen touch share one API.
 * Touch stick uses the same axes as WASD: +x = D (right), +z = W (forward / stick up).
 */
export class InputManager {
  constructor() {
    this.keys = {};
    this.justPressed = {};
    this.touchMove = new THREE.Vector3();
    this.touchActions = { shoot: false, pass: false, special: false };
    this.touchEnabled = false;

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

  setTouchMove(x, z) {
    this.touchMove.set(x, 0, z);
    if (this.touchMove.lengthSq() > 1) this.touchMove.normalize();
  }

  pulseTouchAction(name) {
    if (name in this.touchActions) this.touchActions[name] = true;
  }

  getMoveDirection() {
    const dir = new THREE.Vector3(0, 0, 0);
    if (this.keys['KeyW'] || this.keys['ArrowUp']) dir.z += 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) dir.z -= 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) dir.x -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) dir.x += 1;
    if (dir.lengthSq() > 0) dir.normalize();

    if (this.touchMove.lengthSq() > 0.0001) {
      if (dir.lengthSq() > 0) {
        dir.add(this.touchMove);
        if (dir.lengthSq() > 1) dir.normalize();
      } else {
        dir.copy(this.touchMove);
      }
    }
    return dir;
  }

  isSprinting() {
    return false;
  }

  isShootPressed() {
    return this.justPressed['Space'] || this.touchActions.shoot;
  }

  isPassPressed() {
    return this.justPressed['KeyE'] || this.touchActions.pass;
  }

  isSpecialPressed() {
    return this.justPressed['ShiftLeft'] || this.justPressed['ShiftRight'] || this.touchActions.special;
  }

  isMoving() {
    if (this.touchMove.lengthSq() > 0.01) return true;
    return this.keys['KeyW'] || this.keys['ArrowUp'] ||
           this.keys['KeyS'] || this.keys['ArrowDown'] ||
           this.keys['KeyA'] || this.keys['ArrowLeft'] ||
           this.keys['KeyD'] || this.keys['ArrowRight'];
  }

  clearJustPressed() {
    this.justPressed = {};
    this.touchActions.shoot = false;
    this.touchActions.pass = false;
    this.touchActions.special = false;
  }
}
