/**
 * Smoke-check: InputManager axis map AND TouchControls pointer/touch DOM.
 *
 * The previous version only called InputManager.setTouchMove — that path was
 * already green on the live site while the on-screen stick failed, because
 * iOS never delivered pointermove to the 104px #touch-stick after capture
 * dropped. This script now constructs TouchControls against a fake DOM and
 * drives window-level pointer + touch events.
 *
 * Run: node scripts/check-touch-map.mjs
 */

function createClassList() {
  const set = new Set();
  return {
    add: (c) => set.add(c),
    remove: (c) => set.delete(c),
    toggle: (c, on) => {
      if (on === undefined) {
        if (set.has(c)) set.delete(c);
        else set.add(c);
      } else if (on) set.add(c);
      else set.delete(c);
    },
    contains: (c) => set.has(c),
  };
}

function createEl(id) {
  const listeners = {};
  return {
    id,
    hidden: false,
    style: {},
    classList: createClassList(),
    listeners,
    parent: null,
    addEventListener(type, fn) {
      (listeners[type] ||= []).push(fn);
    },
    dispatchEvent(type, event) {
      for (const fn of listeners[type] || []) fn(event);
    },
    querySelector() {
      return this;
    },
    getBoundingClientRect() {
      return { left: 0, top: 0, width: 104, height: 104, right: 104, bottom: 104 };
    },
    setPointerCapture() {},
    closest(sel) {
      if (sel === '#touch-controls' && (id === 'touch-controls' || id === 'touch-stick')) {
        return elements['touch-controls'];
      }
      if (sel === '#game-canvas' && id === 'game-canvas') return this;
      if (sel.includes('#game-canvas') && id === 'game-canvas') return this;
      if (sel.includes('#game-shell') && id === 'game-shell') return this;
      return null;
    },
  };
}

const elements = {
  'touch-controls': createEl('touch-controls'),
  'touch-stick': createEl('touch-stick'),
  'touch-stick-knob': createEl('touch-stick-knob'),
  'touch-shoot': createEl('touch-shoot'),
  'touch-pass': createEl('touch-pass'),
  'touch-special': createEl('touch-special'),
  'game-shell': createEl('game-shell'),
  'game-canvas': createEl('game-canvas'),
  hud: createEl('hud'),
};

elements.hud.classList.add('visible');

const winListeners = {};
globalThis.window = {
  addEventListener(type, fn) {
    (winListeners[type] ||= []).push(fn);
  },
  matchMedia() {
    return { matches: false };
  },
  dispatch(type, event) {
    for (const fn of winListeners[type] || []) fn(event);
  },
};

globalThis.document = {
  getElementById(id) {
    return elements[id] ?? null;
  },
  body: { classList: createClassList() },
  addEventListener() {},
};

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function dispatch(el, type, event) {
  el.dispatchEvent(type, event);
}

function windowDispatch(type, event) {
  window.dispatch(type, event);
}

const { InputManager } = await import('../src/systems/InputManager.js');
const { TouchControls } = await import('../src/ui/TouchControls.js');

const input = new InputManager();

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

const padInput = new InputManager();
const pads = new TouchControls(padInput);
const stick = elements['touch-stick'];

// Origin is ring center (52, 52). Drag up-right, well outside the deadzone.
const down = {
  pointerId: 7,
  pointerType: 'touch',
  button: 0,
  buttons: 1,
  clientX: 90,
  clientY: 8,
  cancelable: true,
  preventDefault() {},
};
dispatch(stick, 'pointerdown', down);
assert(padInput.touchMove.lengthSq() > 0.01, 'pointerdown drag should write touchMove');
assert(padInput.touchMove.z > 0.4, `stick-up must be +z, got z=${padInput.touchMove.z}`);
assert(padInput.touchMove.x > 0.2, `stick-right must be +x, got x=${padInput.touchMove.x}`);

// Move is on window, not the 104px hit box — this is the live-site failure.
windowDispatch('pointermove', {
  pointerId: 7,
  pointerType: 'touch',
  buttons: 1,
  clientX: 100,
  clientY: 0,
  cancelable: true,
  preventDefault() {},
});
assert(padInput.touchMove.lengthSq() > 0.01, 'window pointermove must keep writing touchMove after leaving the stick');

// Capture drop with finger still down must NOT zero the stick.
windowDispatch('lostpointercapture', { pointerId: 7, buttons: 1 });
assert(padInput.touchMove.lengthSq() > 0.01, 'lostpointercapture while buttons>0 must keep the stick engaged');

windowDispatch('pointerup', { pointerId: 7, buttons: 0 });
assert(padInput.touchMove.lengthSq() < 0.0001, 'pointerup should zero touchMove');

// Stale stickId must not block a new finger.
dispatch(stick, 'pointerdown', { ...down, pointerId: 8 });
assert(padInput.touchMove.lengthSq() > 0.01, 'new pointerdown after release must engage again');
windowDispatch('pointerup', { pointerId: 8, buttons: 0 });
assert(padInput.touchMove.lengthSq() < 0.0001, 'second pointerup should zero');

// Touch fallback (no pointer events at all).
const touchPad = new InputManager();
const touchControls = new TouchControls(touchPad);
const touch = { identifier: 0, clientX: 90, clientY: 8 };
dispatch(elements['touch-stick'], 'touchstart', {
  changedTouches: [touch],
  touches: [touch],
  preventDefault() {},
});
assert(touchPad.touchMove.lengthSq() > 0.01, 'touchstart drag should write touchMove');
assert(touchPad.touchMove.z > 0.4, `touch stick-up must be +z, got z=${touchPad.touchMove.z}`);

windowDispatch('touchmove', {
  changedTouches: [{ identifier: 0, clientX: 100, clientY: 0 }],
  touches: [{ identifier: 0, clientX: 100, clientY: 0 }],
  preventDefault() {},
});
assert(touchPad.touchMove.lengthSq() > 0.01, 'window touchmove must keep writing touchMove');

windowDispatch('touchend', {
  changedTouches: [{ identifier: 0, clientX: 100, clientY: 0 }],
  preventDefault() {},
});
assert(touchPad.touchMove.lengthSq() < 0.0001, 'touchend should zero touchMove');

// Gesture lock must not cancel touches that start on the pads.
const lockFns = elements['game-shell'].listeners.touchstart || [];
assert(lockFns.length > 0, 'gesture lock should bind on #game-shell');
let prevented = false;
for (const fn of lockFns) {
  fn({
    target: {
      closest(sel) {
        return sel === '#touch-controls' ? elements['touch-controls'] : null;
      },
    },
    preventDefault() { prevented = true; },
  });
}
assert(!prevented, 'gesture lock must not preventDefault on #touch-controls');

prevented = false;
for (const fn of lockFns) {
  fn({
    target: {
      closest(sel) {
        return (sel.includes('#game-canvas') || sel === '#game-canvas')
          ? elements['game-canvas']
          : null;
      },
    },
    preventDefault() { prevented = true; },
  });
}
assert(prevented, 'gesture lock should still preventDefault on the canvas');

console.log('touch → InputManager mapping: ok');
console.log('TouchControls pointer/touch DOM: ok');
console.log('P0 primary (live knob-moves / player-frozen): Player.move must wakeUp — see src/entities/Player.js');
