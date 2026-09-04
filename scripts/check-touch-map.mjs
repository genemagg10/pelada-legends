/**
 * Smoke-check: touch stick / buttons write the same InputManager API as WASD / Space / E / Shift.
 * Run: node scripts/check-touch-map.mjs
 */
globalThis.window = {
  addEventListener() {},
};

const { InputManager } = await import('../src/systems/InputManager.js');
const input = new InputManager();

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

input.setTouchMove(0, 1);
let dir = input.getMoveDirection();
assert(Math.abs(dir.z - 1) < 0.01 && Math.abs(dir.x) < 0.01, `stick-up should be +z (W), got ${dir.x},${dir.z}`);
assert(input.isMoving(), 'stick-up should count as moving');

input.setTouchMove(1, 0);
dir = input.getMoveDirection();
assert(Math.abs(dir.x - 1) < 0.01 && Math.abs(dir.z) < 0.01, `stick-right should be +x (D), got ${dir.x},${dir.z}`);

input.setTouchMove(0, 0);
input.keys.KeyW = true;
dir = input.getMoveDirection();
assert(Math.abs(dir.z - 1) < 0.01, `W should still be +z, got ${dir.z}`);
input.keys.KeyW = false;

input.pulseTouchAction('shoot');
input.pulseTouchAction('pass');
input.pulseTouchAction('special');
assert(input.isShootPressed(), 'SHOOT should pulse Space');
assert(input.isPassPressed(), 'PASS should pulse E');
assert(input.isSpecialPressed(), 'GINGA should pulse Shift');
input.clearJustPressed();
assert(!input.isShootPressed() && !input.isPassPressed() && !input.isSpecialPressed(), 'pulses clear each frame');

console.log('touch → InputManager mapping: ok');
