import { createFxTextures, arc, twinkle } from './toolAnim.js';
import { makeText } from './ui.js';

// ---------------------------------------------------------------------------
// FISHING EFFECTS (Step 4.4, part 2) — code-drawn, no art.
// splash / ripple at the bobber, and the caught fish jumping into the bag.
// ---------------------------------------------------------------------------

const WATER = [0xdff3ff, 0xa8d8f0, 0x7cc0e6];
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// A ring that spreads over the water and fades.
export function ripple(scene, x, y, size = 1) {
  const e = scene.add.ellipse(x, y + 1, 5 * size, 2.5 * size).setStrokeStyle(1, 0xdff3ff, 0.9).setDepth(1090);
  scene.tweens.add({
    targets: e, scaleX: 3.2, scaleY: 3.2, alpha: 0, duration: 650, ease: 'Sine.easeOut',
    onComplete: () => e.destroy()
  });
}

// Droplets thrown up + rings. size: 'big' (landing / jump) or 'small' (bite, hit, escape).
export function splash(scene, x, y, size = 'big') {
  createFxTextures(scene);
  const big = size === 'big';
  const n = big ? 9 : 4;
  for (let i = 0; i < n; i++) {
    arc(scene, x + rnd(-2, 2), y, 'fx_dot', pick(WATER), {
      dx: rnd(-10, 10) * (big ? 1 : 0.6), peak: rnd(6, big ? 15 : 9), fall: rnd(6, 11), up: 150, down: 200
    });
  }
  ripple(scene, x, y, big ? 1.2 : 0.8);
  if (big) scene.time.delayedCall(140, () => ripple(scene, x, y, 0.8));
}

// "+1" floating up from a point.
export function plusOne(scene, x, y) {
  const txt = makeText(scene, x, y, '+1', 8, '#9BD36A').setDepth(2200);
  scene.tweens.add({
    targets: txt, y: y - 16, alpha: { from: 1, to: 0 }, duration: 850, ease: 'Sine.easeOut',
    onComplete: () => txt.destroy()
  });
}

// The caught fish leaps out of the water, flips through the air and drops into the bag
// (it follows the player's position while it flies), then "+1" appears.
export function fishJump(scene, fishId, from, getPlayer) {
  splash(scene, from.x, from.y, 'big');
  const key = `item_${fishId}`;
  const finish = () => {
    const to = getPlayer();
    plusOne(scene, to.x, to.y - 14);
    if (fishId === 'fish_golden_carp') for (let i = 0; i < 4; i++) twinkle(scene, to.x + rnd(-10, 10), to.y - rnd(4, 18), 0xfff2b0, i * 70);
  };
  if (!scene.textures.exists(key)) { finish(); return; }
  const img = scene.add.image(from.x, from.y, key).setDepth(2100);
  const spin = getPlayer().x >= from.x ? 1 : -1;
  const st = { p: 0 };
  scene.tweens.add({
    targets: st, p: 1, duration: 720, ease: 'Linear',
    onUpdate: () => {
      const p = st.p;
      const to = getPlayer();
      img.x = from.x + (to.x - from.x) * p;
      img.y = from.y + (to.y - from.y) * p - Math.sin(Math.PI * p) * 34;
      img.angle = p * 360 * spin;
      img.setScale(p < 0.7 ? 1 : 1 - ((p - 0.7) / 0.3) * 0.85);
    },
    onComplete: () => { img.destroy(); finish(); }
  });
}
