const DEADZONE = 0.14;

export function prefersTouchControls() {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(pointer: coarse)').matches) return true;
  if (navigator.maxTouchPoints > 0 && window.matchMedia('(max-width: 900px)').matches) {
    return true;
  }
  return false;
}

/**
 * Left stick + right action cluster. Writes into InputManager so gameplay
 * stays on the same WASD / Space / E / Shift paths.
 */
export class TouchControls {
  constructor(input) {
    this.input = input;
    this.root = document.getElementById('touch-controls');
    this.stick = document.getElementById('touch-stick');
    this.knob = document.getElementById('touch-stick-knob');
    this.shootBtn = document.getElementById('touch-shoot');
    this.passBtn = document.getElementById('touch-pass');
    this.specialBtn = document.getElementById('touch-special');

    this.stickId = null;
    this.originX = 0;
    this.originY = 0;
    this.radius = 48;

    this._bind();
    this.syncVisibility();

    window.addEventListener('resize', () => this.syncVisibility());
    window.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch') this.reveal();
    }, { passive: true });
  }

  syncVisibility() {
    const show = prefersTouchControls() || this.input.touchEnabled;
    document.body.classList.toggle('touch-ui', show);
    if (this.root) this.root.hidden = !show;
  }

  reveal() {
    if (this.input.touchEnabled) return;
    this.input.touchEnabled = true;
    this.syncVisibility();
  }

  setSpecialReady(ready) {
    if (this.specialBtn) this.specialBtn.classList.toggle('ready', !!ready);
  }

  setSpecialLabel(name) {
    const sub = document.getElementById('touch-special-name');
    if (sub) sub.textContent = name || 'SPECIAL';
  }

  reset() {
    this.stickId = null;
    this.input.setTouchMove(0, 0);
    if (this.knob) this.knob.style.transform = '';
    for (const btn of [this.shootBtn, this.passBtn, this.specialBtn]) {
      btn?.classList.remove('active');
    }
  }

  _bind() {
    this._lockPageGestures();
    if (this.stick) this._bindStick();
    this._bindAction(this.shootBtn, 'shoot');
    this._bindAction(this.passBtn, 'pass');
    this._bindAction(this.specialBtn, 'special');
  }

  _lockPageGestures() {
    const shell = document.getElementById('game-shell');
    const lock = (e) => {
      const hud = document.getElementById('hud');
      if (!hud?.classList.contains('visible')) return;
      e.preventDefault();
    };
    const opts = { passive: false };
    (shell || document.body).addEventListener('touchstart', lock, opts);
    (shell || document.body).addEventListener('touchmove', lock, opts);
    document.addEventListener('gesturestart', (e) => e.preventDefault());
    document.addEventListener('contextmenu', (e) => {
      if (e.target.closest('#touch-controls, #game-canvas, #hud')) e.preventDefault();
    });
  }

  _bindStick() {
    const onDown = (e) => {
      if (this.stickId !== null) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      this.reveal();
      this.stickId = e.pointerId;
      this.stick.setPointerCapture(e.pointerId);
      const ring = this.stick.querySelector('.touch-stick-ring') || this.stick;
      const r = ring.getBoundingClientRect();
      this.originX = r.left + r.width / 2;
      this.originY = r.top + r.height / 2;
      this.radius = Math.min(r.width, r.height) * 0.42;
      this._applyStick(e);
    };

    const onMove = (e) => {
      if (e.pointerId !== this.stickId) return;
      e.preventDefault();
      this._applyStick(e);
    };

    const onUp = (e) => {
      if (e.pointerId !== this.stickId) return;
      this.stickId = null;
      this.input.setTouchMove(0, 0);
      if (this.knob) this.knob.style.transform = '';
    };

    this.stick.addEventListener('pointerdown', onDown);
    this.stick.addEventListener('pointermove', onMove);
    this.stick.addEventListener('pointerup', onUp);
    this.stick.addEventListener('pointercancel', onUp);
  }

  _applyStick(e) {
    let dx = e.clientX - this.originX;
    let dy = e.clientY - this.originY;
    const len = Math.hypot(dx, dy);
    if (len > this.radius && this.radius > 0) {
      dx = (dx / len) * this.radius;
      dy = (dy / len) * this.radius;
    }
    if (this.knob) {
      this.knob.style.transform = `translate(${dx}px, ${dy}px)`;
    }
    const nx = this.radius > 0 ? dx / this.radius : 0;
    const ny = this.radius > 0 ? dy / this.radius : 0;
    const mag = Math.hypot(nx, ny);
    if (mag < DEADZONE) {
      this.input.setTouchMove(0, 0);
      return;
    }
    const gain = (mag - DEADZONE) / (1 - DEADZONE);
    const scale = gain / mag;
    // Stick up → +z (W). Stick right → +x (D).
    this.input.setTouchMove(nx * scale, -ny * scale);
  }

  _bindAction(el, name) {
    if (!el) return;
    const down = (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      this.reveal();
      try { el.setPointerCapture(e.pointerId); } catch { /* already captured */ }
      el.classList.add('active');
      this.input.pulseTouchAction(name);
    };
    const up = () => el.classList.remove('active');
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('lostpointercapture', up);
  }
}
