import Phaser from 'phaser';
import { FONT } from './ui.js';

// On-screen controls: joystick (bottom-left), A / B / Run (bottom-right).
// Everything is scrollFactor 0 at depth 1000 (above the warm tint at 900).
// Keyboard (PC bonus): WASD/arrows, E/Space = A, Q = B, Shift = run.

const M = 11; // ~4% safe-area margin
const JOY = { x: M + 34, y: 270 - M - 34, r: 26, hit: 44 }; // ~19% of 270 high
const BTN = {
  a: { x: 480 - M - 18, y: 270 - M - 18, r: 18, label: 'A' },
  b: { x: 480 - M - 55, y: 270 - M - 13, r: 13, label: 'B' },
  run: { x: 480 - M - 18, y: 270 - M - 51, r: 10, label: 'R' }
};

export default class TouchControls {
  constructor(scene, { onA, onB }) {
    this.scene = scene;
    this.onA = onA || (() => {});
    this.onB = onB || (() => {});
    this.joyVec = new Phaser.Math.Vector2(0, 0);
    this.joyPointer = -1;
    this.runHeld = false;

    scene.input.addPointer(3); // multi-touch: joystick + A + B + Run at once

    // --- joystick ---
    this.base = scene.add.circle(JOY.x, JOY.y, JOY.r, 0x2b1d12, 0.45)
      .setStrokeStyle(2, 0xf6e7c1, 0.7).setScrollFactor(0).setDepth(1000);
    this.knob = scene.add.circle(JOY.x, JOY.y, 12, 0xf6e7c1, 0.85)
      .setScrollFactor(0).setDepth(1001);
    const hit = scene.add.circle(JOY.x, JOY.y, JOY.hit, 0x000000, 0.001)
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
    this.mkBtn(BTN.a, () => this.onA());
    this.mkBtn(BTN.b, () => this.onB());
    this.mkBtn(BTN.run, () => { this.runHeld = true; }, () => { this.runHeld = false; });

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
      fontFamily: FONT, fontSize: `${cfg.label.length > 1 ? 7 : 10}px`, color: '#F6E7C1'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);
    c.on('pointerdown', () => { c.setFillStyle(0x854f0b, 0.8); if (down) down(); });
    const release = () => { c.setFillStyle(0x2b1d12, 0.55); if (up) up(); };
    c.on('pointerup', release);
    c.on('pointerout', release);
    this.btnObjects.push(c, t);
  }

  moveJoy(p) {
    const v = new Phaser.Math.Vector2(p.x - JOY.x, p.y - JOY.y);
    if (v.length() > JOY.r) v.setLength(JOY.r);
    this.knob.x = JOY.x + v.x;
    this.knob.y = JOY.y + v.y;
    this.joyVec.copy(v).scale(1 / JOY.r);
    if (this.joyVec.length() < 0.15) this.joyVec.set(0, 0); // dead zone
  }

  resetJoy() {
    this.joyPointer = -1;
    this.joyVec.set(0, 0);
    this.knob.setPosition(JOY.x, JOY.y);
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
