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
 *
 * Drag tracking is window-level (pointer + touch fallback). setPointerCapture
 * is best-effort only — iOS Safari drops capture / move events on the 104px
 * hit box, which used to zero velocity after the first frame.
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
    this.stickVia = null;
    this.originX = 0;
    this.originY = 0;
    this.radius = 48;

    this._onWinPointerMove = (e) => this._onPointerMove(e);
    this._onWinPointerUp = (e) => this._onPointerUp(e);
    this._onWinLostCapture = (e) => this._onLostCapture(e);
    this._onWinTouchMove = (e) => this._onTouchMove(e);
    this._onWinTouchEnd = (e) => this._onTouchEnd(e);

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

  reset() {
    this._releaseStick();
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
      // Stick / pads own their touches — parent preventDefault races WebKit pointer streams.
      if (e.target?.closest?.('#touch-controls')) return;
      if (!e.target?.closest?.('#game-canvas, #game-shell')) return;
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
    this.stick.addEventListener('pointerdown', (e) => this._onPointerDown(e));
    this.stick.addEventListener('touchstart', (e) => this._onTouchStart(e), { passive: false });

    window.addEventListener('pointermove', this._onWinPointerMove);
    window.addEventListener('pointerup', this._onWinPointerUp);
    window.addEventListener('pointercancel', this._onWinPointerUp);
    window.addEventListener('lostpointercapture', this._onWinLostCapture);
    window.addEventListener('touchmove', this._onWinTouchMove, { passive: false });
    window.addEventListener('touchend', this._onWinTouchEnd, { passive: false });
    window.addEventListener('touchcancel', this._onWinTouchEnd, { passive: false });
  }

  _armOrigin() {
    const ring = this.stick.querySelector('.touch-stick-ring') || this.stick;
    const r = ring.getBoundingClientRect();
    this.originX = r.left + r.width / 2;
    this.originY = r.top + r.height / 2;
    this.radius = Math.min(r.width, r.height) * 0.42;
    this.stick.classList.add('engaged');
  }

  _releaseStick() {
    this.stickId = null;
    this.stickVia = null;
    this.input.setTouchMove(0, 0);
    this.stick?.classList.remove('engaged');
    if (this.knob) this.knob.style.transform = '';
  }

  _onPointerDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (this.stickId !== null && this.stickId !== e.pointerId) this._releaseStick();
    if (this.stickId !== null) return;
    e.preventDefault();
    this.reveal();
    this.stickId = e.pointerId;
    this.stickVia = 'pointer';
    try { this.stick.setPointerCapture(e.pointerId); } catch { /* synthetic / already captured */ }
    this._armOrigin();
    this._applyStick(e);
  }

  _onPointerMove(e) {
    if (this.stickId === null || e.pointerId !== this.stickId) return;
    if (e.cancelable) e.preventDefault();
    this._applyStick(e);
  }

  _onPointerUp(e) {
    if (this.stickId === null || e.pointerId !== this.stickId) return;
    this._releaseStick();
  }

  _onLostCapture(e) {
    if (this.stickId === null || e.pointerId !== this.stickId) return;
    // Capture drop with the finger still down: keep window-level tracking.
    if ((e.buttons ?? 0) > 0) return;
    this._releaseStick();
  }

  _touchById(list, id) {
    if (!list) return null;
    for (let i = 0; i < list.length; i++) {
      if (list[i].identifier === id) return list[i];
    }
    return null;
  }

  _onTouchStart(e) {
    if (this.stickId !== null) return;
    const t = e.changedTouches?.[0];
    if (!t) return;
    e.preventDefault();
    this.reveal();
    this.stickId = t.identifier;
    this.stickVia = 'touch';
    this._armOrigin();
    this._applyStick(t);
  }

  _onTouchMove(e) {
    if (this.stickId === null || this.stickVia === 'pointer') return;
    const t = this._touchById(e.changedTouches, this.stickId)
      || this._touchById(e.touches, this.stickId);
    if (!t) return;
    e.preventDefault();
    this._applyStick(t);
  }

  _onTouchEnd(e) {
    if (this.stickId === null || this.stickVia === 'pointer') return;
    if (!this._touchById(e.changedTouches, this.stickId)) return;
    this._releaseStick();
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
