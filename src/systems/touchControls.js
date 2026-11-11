import Phaser from 'phaser';
import { FONT, getSafe } from './ui.js';

// On-screen controls: joystick (bottom-left), A / B / Run (bottom-right).
// Everything is scrollFactor 0 at depth 1000 (above the warm tint at 900).
// Keyboard (PC bonus): WASD/arrows, E/Space = A, Q = B, Shift = run.

const M = 11; // ~4% safe-area margin

// Control size preset (Settings > Control size): s / m / l.
const UI_SCALE = { s: 1, m: 1.35, l: 1.7 };
export function getUiSize() {
  try {
    const v = localStorage.getItem('rob_ui');
    return UI_SCALE[v] ? v : 'm';
  } catch (e) { return 'm'; }
}
export function setUiSize(v) {
  try { localStorage.setItem('rob_ui', v); } catch (e) { /* ignore */ }
}

// Builds joystick + button geometry for the current canvas width and size preset.
function layout(scene) {
  const k = UI_SCALE[getUiSize()];
  const W = scene.scale.width;
  const safe = getSafe(scene);
  const left = M + safe.l;
  const right = W - M - safe.r;
  const jr = Math.round(26 * k);
  const ar = Math.round(18 * k);
  const br = Math.round(13 * k);
  const rr = Math.round(10 * k);
  return {
    joy: { x: left + jr + 4, y: 270 - M - jr - 2, r: jr, hit: Math.round(jr * 1.7), knob: Math.round(12 * k) },
    a: { x: right - ar, y: 270 - M - ar, r: ar, label: 'A' },
    b: { x: right - 2 * ar - br - 6, y: 270 - M - br - 2, r: br, label: 'B' },
    run: { x: right - ar, y: 270 - M - 2 * ar - rr - 6, r: rr, label: 'R' }
  };
}

export default class TouchControls {
  constructor(scene, { onA, onB }) {
    this.scene = scene;
    this.onA = onA || (() => {});
    this.onB = onB || (() => {});
    this.joyVec = new Phaser.Math.Vector2(0, 0);
    this.joyPointer = -1;
    this.runHeld = false;

    scene.input.addPointer(3); // multi-touch: joystick + A + B + Run at once
    const L = layout(scene);
    this.JOY = L.joy;

    // --- joystick ---
    this.base = scene.add.circle(L.joy.x, L.joy.y, L.joy.r, 0x2b1d12, 0.45)
      .setStrokeStyle(2, 0xf6e7c1, 0.7).setScrollFactor(0).setDepth(1000);
    this.knob = scene.add.circle(L.joy.x, L.joy.y, L.joy.knob, 0xf6e7c1, 0.85)
      .setScrollFactor(0).setDepth(1001);
    const hit = scene.add.circle(L.joy.x, L.joy.y, L.joy.hit, 0x000000, 0.001)
      .setScrollFactor(0).setDepth(1000).setInteractive();
    this.hitZone = hit;
    hit.on('pointerdown', (p) => { this.joyPointer = p.id; this.moveJoy(p); });
    this.onMove = (p) => { if (p.id === this.joyPointer) this.moveJoy(p); };
    this.onUp = (p) => { if (p.id === this.joyPointer) this.resetJoy(); };
    scene.input.on('pointermove', this.onMove);
    scene.input.on('pointerup', this.onUp);
    scene.input.on('pointerupoutside', this.onUp);

    // --- action buttons ---
    this.btnObjects = [];
    this.mkBtn(L.a, () => this.onA());
    this.mkBtn(L.b, () => this.onB());
    this.mkBtn(L.run, () => { this.runHeld = true; }, () => { this.runHeld = false; });

    // --- keyboard (PC bonus) ---
    this.keys = scene.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SHIFT');
    scene.input.keyboard.on('keydown-SPACE', this.onA);
    scene.input.keyboard.on('keydown-E', this.onA);
    scene.input.keyboard.on('keydown-Q', this.onB);
  }

  mkBtn(cfg, down, up) {
    const scene = this.scene;
    const c = scene.add.circle(cfg.x, cfg.y, cfg.r, 0x2b1d12, 0.55)
      .setStrokeStyle(2, 0xf6e7c1, 0.9).setScrollFactor(0).setDepth(1000).setInteractive();
    const t = scene.add.text(cfg.x, cfg.y + 1, cfg.label, {
      fontFamily: FONT, fontSize: `${Math.round(cfg.r * 0.8)}px`, color: '#F6E7C1'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);
    c.on('pointerdown', () => { c.setFillStyle(0x854f0b, 0.8); if (down) down(); });
    const release = () => { c.setFillStyle(0x2b1d12, 0.55); if (up) up(); };
    c.on('pointerup', release);
    c.on('pointerout', release);
    this.btnObjects.push(c, t);
  }

  moveJoy(p) {
    const v = new Phaser.Math.Vector2(p.x - this.JOY.x, p.y - this.JOY.y);
    if (v.length() > this.JOY.r) v.setLength(this.JOY.r);
    this.knob.x = this.JOY.x + v.x;
    this.knob.y = this.JOY.y + v.y;
    this.joyVec.copy(v).scale(1 / this.JOY.r);
    if (this.joyVec.length() < 0.15) this.joyVec.set(0, 0); // dead zone
  }

  resetJoy() {
    this.joyPointer = -1;
    this.joyVec.set(0, 0);
    this.knob.setPosition(this.JOY.x, this.JOY.y);
  }

  // Merged joystick + keyboard vector, length clamped to 1.
  getMove() {
    const k = this.keys;
    let x = (k.RIGHT.isDown || k.D.isDown ? 1 : 0) - (k.LEFT.isDown || k.A.isDown ? 1 : 0);
    let y = (k.DOWN.isDown || k.S.isDown ? 1 : 0) - (k.UP.isDown || k.W.isDown ? 1 : 0);
    x += this.joyVec.x;
    y += this.joyVec.y;
    const v = new Phaser.Math.Vector2(x, y);
    if (v.length() > 1) v.normalize();
    return v;
  }

  isRunning() {
    return this.runHeld || this.keys.SHIFT.isDown;
  }

  destroy() {
    const scene = this.scene;
    scene.input.off('pointermove', this.onMove);
    scene.input.off('pointerup', this.onUp);
    scene.input.off('pointerupoutside', this.onUp);
    scene.input.keyboard.off('keydown-SPACE', this.onA);
    scene.input.keyboard.off('keydown-E', this.onA);
    scene.input.keyboard.off('keydown-Q', this.onB);
    this.base.destroy();
    this.knob.destroy();
    this.hitZone.destroy();
    this.btnObjects.forEach((o) => o.destroy());
  }
}
