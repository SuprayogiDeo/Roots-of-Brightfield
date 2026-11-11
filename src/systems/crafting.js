import { addItem, countItem } from './items.js';

// Cooking recipes (Nusantara flavour). Item names stay English in both languages.
// needs = { itemId: amount }. Salt and Coffee Beans are bought in the Kitchen pantry.
export const RECIPES = [
  { id: 'sambal', out: 'sambal', qty: 1, needs: { chili: 2, tomato: 1, salt: 1 } },
  { id: 'salted_egg', out: 'salted_egg', qty: 1, needs: { egg: 1, salt: 1 } },
  { id: 'coffee', out: 'coffee', qty: 1, needs: { coffee_beans: 2 } }
];

export const PANTRY = ['salt', 'coffee_beans'];

export function canCraft(inv, recipe) {
  return Object.entries(recipe.needs).every(([id, n]) => countItem(inv, id) >= n);
}

function removeItems(inv, id, n) {
  let left = n;
  for (let i = 0; i < inv.slots.length && left > 0; i++) {
    const s = inv.slots[i];
    if (s && s.id === id) {
      const take = Math.min(left, s.qty);
      s.qty -= take;
      left -= take;
      if (s.qty <= 0) inv.slots[i] = null;
    }
  }
}

// Returns 'ok' | 'missing' | 'full'. The bag is only changed on 'ok'
// (a dry run on a copy makes sure the dish fits after the ingredients are used up).
export function craft(inv, recipe) {
  if (!canCraft(inv, recipe)) return 'missing';
  const trial = { ...inv, slots: inv.slots.map((s) => (s ? { ...s } : null)) };
  Object.entries(recipe.needs).forEach(([id, n]) => removeItems(trial, id, n));
  if (addItem(trial, recipe.out, recipe.qty || 1) > 0) return 'full';
  Object.entries(recipe.needs).forEach(([id, n]) => removeItems(inv, id, n));
  addItem(inv, recipe.out, recipe.qty || 1);
  return 'ok';
}

// ---------------- Kitchen station (code-drawn placeholder, 32x32) ----------------
export function createKitchenTexture(scene) {
  if (scene.textures.exists('kitchen')) return;
  const g = scene.make.graphics({ add: false });
  const R = (x, y, w, h, c) => { g.fillStyle(c, 1); g.fillRect(x, y, w, h); };
  // stone stove
  R(3, 14, 26, 15, 0x6f675c);
  R(2, 12, 28, 4, 0x8c8478);
  R(2, 12, 28, 1, 0xb3ab9f);
  [20, 25].forEach((y) => R(3, y, 26, 1, 0x5a544b));
  [[10, 16], [19, 16], [6, 21], [24, 21]].forEach(([x, y]) => R(x, y, 1, 4, 0x5a544b));
  // fire box + flames
  R(10, 19, 12, 9, 0x1a120b);
  R(12, 24, 3, 4, 0xef7b27); R(15, 22, 3, 6, 0xef9f27); R(18, 25, 3, 3, 0xc4553f); R(16, 24, 1, 3, 0xffd27a);
  // pot
  R(7, 4, 18, 9, 0x3a3a46);
  R(6, 3, 20, 2, 0x54545f);
  R(9, 6, 2, 5, 0x6a6a78);
  R(15, 1, 2, 2, 0x54545f);
  R(4, 6, 2, 3, 0x54545f); R(26, 6, 2, 3, 0x54545f);
  g.generateTexture('kitchen', 32, 32);
  g.destroy();
}

// Places the Kitchen (bottom-centre anchor) and two little steam puffs.
export function addKitchen(scene, x, y) {
  const img = scene.add.image(x, y, 'kitchen').setOrigin(0.5, 1).setDepth(y - 1);
  [[-3, 0], [4, 700]].forEach(([dx, delay]) => {
    const puff = scene.add.circle(x + dx, y - 28, 2, 0xf6e7c1, 0.55).setDepth(y);
    scene.tweens.add({
      targets: puff, y: y - 42, alpha: 0, scale: 1.8, duration: 1500, delay, repeat: -1
    });
  });
  return img;
}
