import { usingRealPlayer, idleFrameFor, setPlayerDir } from './farmArt.js';

// ---------------------------------------------------------------------------
// FISHING POSE (Step 4.4, part 1) — no new art.
// The player freezes on the idle frame of the direction it faces and holds the
// existing `item_fishing_rod` icon, rotated so the rod points at the water. The
// icon has its own line + bobber baked in at the right edge; a masked copy
// (`rod_held`) keeps only the bent rod so the code-drawn line can start at the tip.
// ---------------------------------------------------------------------------

// Hand position relative to the 32x32 walk sprite's centre, and the wanted rod angle
// (degrees, 0 = right, +90 = down) for each facing.
const HAND = { right: [5, 1], left: [-5, 1], down: [5, 2], up: [5, 0] };
const AIM = { right: -30, left: -150, down: 55, up: -65 };
// In the 16x16 icon: handle (2, 12.5) -> tip (14.5, 1.5).
const ORIGIN = [2 / 16, 12.5 / 16];
const TIP = [12.5, -11];

function makeHeldRod(scene) {
  if (scene.textures.exists('rod_held')) return;
  const src = scene.textures.get('item_fishing_rod').getSourceImage();
  const tex = scene.textures.createCanvas('rod_held', 16, 16);
  const ctx = tex.getContext();
  ctx.drawImage(src, 0, 0, 16, 16);
  ctx.clearRect(13, 3, 3, 13); // the baked-in line ...
  ctx.clearRect(12, 5, 4, 11); // ... and bobber
  tex.refresh();
}

export default class RodPose {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;
    this.facing = 'down';
    this.offset = 0; // extra rod angle in degrees (negative = back-swing / yank up)
    this.on = false;
    this.token = 0;
    this.real = usingRealPlayer(scene) && scene.textures.exists('item_fishing_rod');
    if (this.real) {
      makeHeldRod(scene);
      this.sprite = scene.add.image(0, 0, 'rod_held').setOrigin(ORIGIN[0], ORIGIN[1]).setVisible(false);
    }
  }

  begin(facing, offset = 0) {
    this.token += 1;
    this.facing = facing;
    this.offset = offset;
    this.on = true;
    if (!this.real) return;
    this.player.anims.stop();
    this.player.setFlipX(facing === 'left');
    this.player.setFrame(idleFrameFor(facing));
    this.sprite.setVisible(true);
    this.place();
  }

  place() {
    if (!this.real || !this.on) return;
    const [hx, hy] = HAND[this.facing];
    const sx = this.facing === 'left' ? -1 : 1;
    const dir = this.facing === 'left' ? -1 : 1;
    const base = Math.atan2(TIP[1], TIP[0] * sx);
    const rot = ((AIM[this.facing] + dir * this.offset) * Math.PI) / 180 - base;
    this.sprite
      .setScale(sx, 1)
      .setRotation(rot)
      .setPosition(this.player.x + hx, this.player.y + hy)
      .setDepth(this.player.depth + (this.facing === 'up' ? -0.5 : 0.5));
  }

  // World position of the rod tip (where the line starts).
  tip() {
    if (!this.real) return { x: this.player.x, y: this.player.y - 6 };
    const s = this.sprite;
    const vx = TIP[0] * s.scaleX;
    const vy = TIP[1];
    const c = Math.cos(s.rotation);
    const n = Math.sin(s.rotation);
    return { x: s.x + vx * c - vy * n, y: s.y + vx * n + vy * c };
  }

  update() {
    this.place();
  }

  // yank = quick pull-up before the rod disappears (a successful catch)
  release(yank) {
    if (!this.on) return;
    if (!yank) { this.end(); return; }
    const token = this.token;
    this.scene.tweens.add({
      targets: this,
      offset: -34,
      duration: 200,
      ease: 'Quad.easeOut',
      onComplete: () => { if (token === this.token) this.end(); }
    });
  }

  end() {
    if (!this.on) return;
    this.on = false;
    if (this.sprite) this.sprite.setVisible(false);
    // back to the normal idle pose (a held joystick takes over on the next frame)
    if (this.real && !this.scene.moving) setPlayerDir(this.scene, this.player, this.scene.gender, this.facing, false);
  }

  destroy() {
    this.token += 1;
    if (this.sprite) this.sprite.destroy();
  }
}
