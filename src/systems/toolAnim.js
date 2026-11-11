import { usingRealPlayer, idleFrameFor } from './farmArt.js';

// ---------------------------------------------------------------------------
// TOOL ANIMATIONS + SIMPLE CODE EFFECTS (Step 4.3)
//
// Art: Cute Fantasy `Player/Player_Actions.png` = public/assets/characters/player_actions.png
//   96x576 px = 2 columns x 12 rows of 48x48 frames.  Column 0 = wind-up, column 1 = strike.
//   Rows (all frames face RIGHT for "side"; left = flipX):
//     0 pickaxe side · 1 pickaxe down · 2 pickaxe up
//     3 axe     side · 4 axe     down · 5 axe     up
//     6 hoe     side · 7 hoe     down · 8 hoe     up
//     9 water   DOWN · 10 water  UP   · 11 water  SIDE      (watering can has a different order!)
//   Feet line up with the 32x32 walk frames when both are drawn with origin (0.5, 0.5).
//
// The physics player is hidden while an action plays and a separate overlay sprite shows the
// pose, so the arcade body (collider, tile lookup, interact zones) never moves or resizes.
// ---------------------------------------------------------------------------

export const TOOLS = {
  hoe: { rows: { side: 6, down: 7, up: 8 }, windup: 170, hold: 230 },
  water: { rows: { down: 9, up: 10, side: 11 }, windup: 200, hold: 330 },
  axe: { rows: { side: 3, down: 4, up: 5 }, windup: 150, hold: 220 },
  pickaxe: { rows: { side: 0, down: 1, up: 2 }, windup: 150, hold: 220 } // used from Step 4.5
};

const WALK_FEET_ORIGIN_Y = 25 / 32; // feet line in a 32x32 walk frame
const WALK_FEET_DY = 9; // feet are 9 px below the walk sprite's centre

const sideOf = (dir) => (dir === 'up' || dir === 'down' ? dir : 'side');

export function createFxTextures(scene) {
  if (scene.textures.exists('fx_spark')) return;
  const g = scene.make.graphics({ add: false });
  g.fillStyle(0xffffff, 1);
  g.fillRect(2, 0, 1, 5);
  g.fillRect(0, 2, 5, 1);
  g.generateTexture('fx_spark', 5, 5);
  g.clear();
  g.fillStyle(0xffffff, 1);
  g.fillRect(0, 1, 3, 1);
  g.fillRect(1, 0, 2, 1);
  g.generateTexture('fx_leaf', 3, 2);
  g.clear();
  g.fillStyle(0xffffff, 1);
  g.fillRect(0, 0, 2, 2);
  g.generateTexture('fx_dot', 2, 2);
  g.destroy();
}

// Owns the overlay sprite and the "busy" lock. One instance per scene.
export default class ActionRig {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;
    this.busy = false;
    this.ready = usingRealPlayer(scene) && scene.textures.exists('player_actions');
    this.sprite = scene.add.sprite(player.x, player.y, 'player', 0).setVisible(false);
    createFxTextures(scene);
  }

  // Swing a tool. onImpact fires exactly when the strike frame appears; onDone when control returns.
  playTool(tool, facing, { onImpact, onDone } = {}) {
    const def = TOOLS[tool];
    if (this.busy) return;
    if (!this.ready || !def) { if (onImpact) onImpact(); if (onDone) onDone(); return; }
    const row = def.rows[sideOf(facing)];
    this.begin('player_actions', row * 2, facing, 0.5, 0);
    this.after(def.windup, () => {
      this.sprite.setFrame(row * 2 + 1);
      if (onImpact) onImpact();
    });
    this.after(def.windup + def.hold, () => this.end(facing, onDone));
  }

  // Bend down and pop back up (plant / harvest / feed). Squash is anchored at the feet.
  playCrouch(facing, { onImpact, onDone } = {}) {
    if (this.busy) return;
    if (!this.ready) { if (onImpact) onImpact(); if (onDone) onDone(); return; }
    this.begin('player', idleFrameFor(facing), facing, WALK_FEET_ORIGIN_Y, WALK_FEET_DY);
    this.scene.tweens.add({
      targets: this.sprite,
      scaleY: 0.78,
      scaleX: 1.06,
      duration: 140,
      yoyo: true,
      ease: 'Sine.easeOut'
    });
    this.after(140, () => { if (onImpact) onImpact(); });
    this.after(300, () => this.end(facing, onDone));
  }

  begin(texture, frame, facing, originY, dy) {
    const p = this.player;
    this.busy = true;
    p.setVelocity(0, 0);
    p.anims.stop();
    p.setVisible(false);
    this.sprite.setTexture(texture, frame)
      .setOrigin(0.5, originY)
      .setScale(1)
      .setFlipX(facing === 'left')
      .setPosition(p.x, p.y + dy)
      .setDepth(p.depth)
      .setVisible(true);
  }

  end(facing, onDone) {
    this.sprite.setVisible(false).setScale(1);
    this.player.setVisible(true);
    this.busy = false;
    if (onDone) onDone(facing);
  }

  after(ms, fn) {
    this.scene.time.delayedCall(ms, () => { if (this.busy) fn(); });
  }
}

// ---------------------------------------------------------------------------
// Code-drawn particles (no art needed). Everything cleans itself up.
// ---------------------------------------------------------------------------
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// A bit flies up in an arc, falls, and fades.
function arc(scene, x, y, tex, tint, { dx, peak, fall, up = 170, down = 230 }) {
  const img = scene.add.image(x, y, tex).setTint(tint).setDepth(2000);
  scene.tweens.add({ targets: img, x: x + dx, duration: up + down, ease: 'Linear' });
  scene.tweens.add({
    targets: img,
    y: y - peak,
    duration: up,
    ease: 'Quad.easeOut',
    onComplete: () => {
      scene.tweens.add({
        targets: img, y: y - peak + fall, alpha: 0, duration: down, ease: 'Quad.easeIn',
        onComplete: () => img.destroy()
      });
    }
  });
}

// A sparkle grows, floats up and vanishes.
function twinkle(scene, x, y, tint, delay = 0) {
  const img = scene.add.image(x, y, 'fx_spark').setTint(tint).setDepth(2001).setScale(0.2).setAlpha(0);
  scene.tweens.add({
    targets: img,
    scale: { from: 0.2, to: 1.1 },
    alpha: { from: 1, to: 0 },
    y: y - rnd(8, 14),
    angle: rnd(-40, 40),
    duration: 480,
    delay,
    ease: 'Sine.easeOut',
    onStart: () => img.setAlpha(1),
    onComplete: () => img.destroy()
  });
}

const SOIL = [0x8a5a33, 0x6b4426, 0xa06c3e];
const LEAF = [0x7fb85a, 0x5f9a3e, 0xa5d06b];
const GOLD = [0xfff2b0, 0xf6e7c1, 0xef9f27];
const GRAIN = [0xe8c66a, 0xc9a24a, 0xf3dd95];

// Seed goes in: soil crumbs + a couple of leaf specks, and the sprout pops up.
export function fxPlant(scene, x, y, plantImage) {
  for (let i = 0; i < 6; i++) arc(scene, x + rnd(-3, 3), y, 'fx_dot', pick(SOIL), { dx: rnd(-10, 10), peak: rnd(6, 11), fall: rnd(10, 14) });
  for (let i = 0; i < 2; i++) arc(scene, x, y - 2, 'fx_leaf', pick(LEAF), { dx: rnd(-8, 8), peak: rnd(9, 14), fall: rnd(12, 16) });
  if (plantImage) {
    plantImage.setScale(0.3);
    scene.tweens.add({ targets: plantImage, scale: 1, duration: 240, ease: 'Back.easeOut' });
  }
}

// Crop comes out: leaves burst + gold sparkles.
export function fxHarvest(scene, x, y) {
  for (let i = 0; i < 7; i++) arc(scene, x + rnd(-3, 3), y - 4, 'fx_leaf', pick(LEAF), { dx: rnd(-14, 14), peak: rnd(10, 18), fall: rnd(14, 22) });
  for (let i = 0; i < 4; i++) twinkle(scene, x + rnd(-9, 9), y - rnd(2, 12), pick(GOLD), i * 60);
}

// Feed: grain rains down on the animal, with a few sparkles.
export function fxFeed(scene, x, y) {
  for (let i = 0; i < 7; i++) {
    const gx = x + rnd(-6, 6);
    const img = scene.add.image(gx, y - rnd(16, 24), 'fx_dot').setTint(pick(GRAIN)).setDepth(2000);
    scene.tweens.add({
      targets: img, y: y - rnd(0, 6), alpha: { from: 1, to: 0.2 }, duration: rnd(260, 380), delay: i * 35,
      ease: 'Quad.easeIn', onComplete: () => img.destroy()
    });
  }
  for (let i = 0; i < 3; i++) twinkle(scene, x + rnd(-8, 8), y - rnd(6, 16), pick(GOLD), 120 + i * 70);
}

// Collecting an egg / milk: sparkles only.
export function fxCollect(scene, x, y) {
  for (let i = 0; i < 5; i++) twinkle(scene, x + rnd(-9, 9), y - rnd(4, 14), pick(GOLD), i * 50);
}
