import { createFxTextures, arc, twinkle } from './toolAnim.js';
import { plusOne } from './fishingFx.js';

// ---------------------------------------------------------------------------
// MINING EFFECTS (Step 4.5, part 2) — code-drawn, no new art.
//   hitFx    : node shakes + flashes, rock chips fly (hits 1 and 2)
//   breakFx  : bigger burst + dust, node pops into rubble (hit 3)
//   oreJump  : the drop hops out of the node, then flies into the player and "+1" appears
// ---------------------------------------------------------------------------

const ROCK = [0xb9b3aa, 0x8f8a84, 0x6e6a66];
const DUST = 0x9a948c;
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Quick horizontal rattle + white flash on the node sprite.
export function shakeNode(scene, node) {
  const img = node.img;
  const baseX = node.x;
  scene.tweens.killTweensOf(img);
  img.x = baseX;
  img.setTintFill(0xffffff);
  scene.time.delayedCall(55, () => { if (img.active) img.clearTint(); });
  scene.tweens.add({
    targets: img, x: { from: baseX - 1.5, to: baseX + 1.5 }, duration: 38, yoyo: true, repeat: 3,
    onComplete: () => { if (img.active) img.x = baseX; }
  });
  scene.tweens.add({ targets: img, scaleY: { from: 0.9, to: 1 }, duration: 160, ease: 'Quad.easeOut' });
}

// Chips thrown out of the node. `n` rock chips + a few in the node's own colour.
function chips(scene, node, def, n, power) {
  const cx = node.x;
  const cy = node.y - 6;
  for (let i = 0; i < n; i++) {
    arc(scene, cx + rnd(-4, 4), cy + rnd(-2, 2), 'fx_dot', pick(ROCK), {
      dx: rnd(-16, 16) * power, peak: rnd(6, 14) * power, fall: rnd(10, 20), up: 150, down: 220
    });
  }
  for (let i = 0; i < Math.ceil(n / 2); i++) {
    arc(scene, cx + rnd(-4, 4), cy, 'fx_dot', pick(def.chips), {
      dx: rnd(-14, 14) * power, peak: rnd(8, 16) * power, fall: rnd(10, 18), up: 160, down: 220
    });
  }
}

export function hitFx(scene, node, def) {
  createFxTextures(scene);
  shakeNode(scene, node);
  chips(scene, node, def, 5, 1);
  twinkle(scene, node.x + rnd(-5, 5), node.y - rnd(6, 11), pick(def.chips), 0);
}

// A soft dust puff that grows and fades.
function puff(scene, x, y, delay) {
  const c = scene.add.circle(x, y, 2.5, DUST, 0.55).setDepth(2000);
  scene.tweens.add({
    targets: c, scale: { from: 0.6, to: 2.4 }, alpha: 0, x: x + rnd(-6, 6), y: y - rnd(3, 8),
    duration: 460, delay, ease: 'Sine.easeOut', onComplete: () => c.destroy()
  });
}

// The node bursts and turns into rubble (the sprite stays, only its texture changes).
export function breakFx(scene, node, def, rubbleKey) {
  createFxTextures(scene);
  scene.tweens.killTweensOf(node.img);
  node.img.x = node.x;
  node.img.clearTint();
  chips(scene, node, def, 12, 1.3);
  for (let i = 0; i < 3; i++) puff(scene, node.x + rnd(-6, 6), node.y - rnd(1, 6), i * 40);
  for (let i = 0; i < 4; i++) twinkle(scene, node.x + rnd(-8, 8), node.y - rnd(4, 14), pick(def.chips), i * 60);
  if (scene.textures.exists(rubbleKey)) {
    node.img.setTexture(rubbleKey).setScale(1.5);
    scene.tweens.add({ targets: node.img, scale: 1, duration: 260, ease: 'Back.easeOut' });
  } else {
    node.img.setAlpha(0.35); // no rubble art: just fade the node
  }
  scene.cameras.main.shake(70, 0.0014);
}

// The drop hops out of the node and lands a little toward the player, then flies into the player
// (following them if they move) and shrinks. Then floating "+1". onLand fires as it enters the bag.
export function oreJump(scene, itemId, from, getPlayer, onLand) {
  const key = `item_${itemId}`;
  const finish = () => {
    const to = getPlayer();
    plusOne(scene, to.x, to.y - 14);
    for (let i = 0; i < 3; i++) twinkle(scene, to.x + rnd(-8, 8), to.y - rnd(4, 16), 0xfff2b0, i * 60);
    if (onLand) onLand();
  };
  if (!scene.textures.exists(key)) { finish(); return; }

  const p0 = getPlayer();
  const sgn = p0.x >= from.x ? 1 : -1;
  const land = { x: from.x + sgn * rnd(8, 14), y: from.y + rnd(2, 6) };
  const img = scene.add.image(from.x, from.y - 6, key).setDepth(2100);
  const st = { p: 0 };
  const HOP = 0.45; // share of the animation spent hopping out
  scene.tweens.add({
    targets: st, p: 1, duration: 820, ease: 'Linear',
    onUpdate: () => {
      const p = st.p;
      if (p < HOP) {
        const q = p / HOP;
        img.x = from.x + (land.x - from.x) * q;
        img.y = (from.y - 6) + (land.y - (from.y - 6)) * q - Math.sin(Math.PI * q) * 22;
        img.angle = q * 200 * sgn;
        img.setScale(1);
      } else {
        const q = (p - HOP) / (1 - HOP);
        const to = getPlayer();
        const e = q * q; // accelerate toward the player
        img.x = land.x + (to.x - land.x) * e;
        img.y = land.y + ((to.y - 6) - land.y) * e - Math.sin(Math.PI * q) * 10;
        img.angle = 200 * sgn + q * 160 * sgn;
        img.setScale(1 - q * 0.8);
      }
    },
    onComplete: () => { img.destroy(); finish(); }
  });
}
