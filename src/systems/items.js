// Item definitions. Item NAMES stay English in both languages (design rule).
// Icons are code-drawn 16x16 placeholders under the key `item_<id>`;
// a real icon file can replace any of them via ASSET_MANIFEST (same key).

import { CROPS } from './crops.js';

export const ITEMS = {
  hoe: { name: 'Hoe' },
  watering_can: { name: 'Watering Can' },
  axe: { name: 'Axe' },
  pickaxe: { name: 'Pickaxe' },
  fishing_rod: { name: 'Fishing Rod' },

  carrot_seeds: { name: 'Carrot Seeds', seed: 'carrot', cost: 20 },
  corn_seeds: { name: 'Corn Seeds', seed: 'corn', cost: 25 },
  chili_seeds: { name: 'Chili Seeds', seed: 'chili', cost: 18 },
  tomato_seeds: { name: 'Tomato Seeds', seed: 'tomato', cost: 22 },

  carrot: { name: 'Carrot', price: CROPS.carrot.price },
  corn: { name: 'Corn', price: CROPS.corn.price },
  chili: { name: 'Chili', price: CROPS.chili.price },
  tomato: { name: 'Tomato', price: CROPS.tomato.price },

  backpack: { name: 'Backpack' },
  animal_feed: { name: 'Animal Feed', cost: 6 },
  egg: { name: 'Egg', price: 18 },
  milk: { name: 'Milk', price: 45 },

  // Fish (Step 4.1) — sold at the Shipping Bin like crops.
  fish_sardine: { name: 'Sardine', price: 15 },
  fish_mackerel: { name: 'Mackerel', price: 25 },
  fish_bass: { name: 'Sea Bass', price: 35 },
  fish_catfish: { name: 'Catfish', price: 45 },
  fish_snapper: { name: 'Red Snapper', price: 55 },
  fish_golden_carp: { name: 'Golden Carp', price: 120 }
};

export const STACK_MAX = 99;

// Backpack upgrades sold in the Seed Shop (the bag starts at 18 slots).
export const BAG_UPGRADES = [
  { size: 24, cost: 400 },
  { size: 30, cost: 1000 },
  { size: 36, cost: 2500 }
];

// Next upgrade the player can still buy, or null when the bag is maxed.
export function nextBagUpgrade(inv) {
  return BAG_UPGRADES.find((u) => u.size > inv.slots.length) || null;
}

export function upgradeBag(inv, size) {
  while (inv.slots.length < size) inv.slots.push(null);
  inv.size = size;
}

// ---------------- inventory helpers ----------------

// Adds qty of an item, stacking first. Returns the amount that did NOT fit.
export function addItem(inv, id, qty = 1) {
  let left = qty;
  for (let i = 0; i < inv.slots.length && left > 0; i++) {
    const s = inv.slots[i];
    if (s && s.id === id && s.qty < STACK_MAX) {
      const put = Math.min(STACK_MAX - s.qty, left);
      s.qty += put;
      left -= put;
    }
  }
  for (let i = 0; i < inv.slots.length && left > 0; i++) {
    if (!inv.slots[i]) {
      const put = Math.min(STACK_MAX, left);
      inv.slots[i] = { id, qty: put };
      left -= put;
    }
  }
  return left;
}

// Removes one unit from a specific slot index; clears the slot when empty.
export function consumeSlot(inv, index) {
  const s = inv.slots[index];
  if (!s) return false;
  s.qty -= 1;
  if (s.qty <= 0) inv.slots[index] = null;
  return true;
}

export function countItem(inv, id) {
  return inv.slots.reduce((n, s) => n + (s && s.id === id ? s.qty : 0), 0);
}

// ---------------- placeholder icons ----------------

const BROWN = 0x8a5a33, METAL = 0x9aa0a6, SHINE = 0xd7dbe0;

const DRAW = {
  hoe(R) {
    handle(R);
    R(9, 2, 6, 2, METAL); R(13, 2, 2, 6, METAL);
  },
  watering_can(R) {
    R(3, 6, 8, 7, 0x6d9cc4); R(3, 6, 8, 1, 0x9cc3e0);
    R(5, 3, 4, 1, 0x4f7cac); R(4, 4, 1, 2, 0x4f7cac); R(9, 4, 1, 2, 0x4f7cac);
    R(11, 8, 1, 2, 0x4f7cac); R(12, 7, 1, 2, 0x4f7cac); R(13, 5, 2, 2, 0x4f7cac);
  },
  axe(R) {
    handle(R);
    R(9, 1, 4, 6, METAL); R(12, 1, 2, 6, SHINE);
  },
  pickaxe(R) {
    handle(R);
    R(6, 3, 9, 2, METAL); R(5, 4, 2, 2, METAL); R(14, 4, 2, 2, METAL);
  },
  fishing_rod(R) {
    for (let n = 0; n < 11; n++) R(2 + n, 14 - n, 1, 1, BROWN);
    R(13, 4, 1, 7, 0xf6e7c1); R(12, 11, 3, 2, 0xc4553f);
  },
  carrot(R) {
    R(6, 6, 4, 8, 0xef7b27); R(7, 13, 2, 2, 0xc4553f);
    R(6, 3, 1, 3, 0x639922); R(8, 2, 1, 4, 0x639922); R(10, 3, 1, 3, 0x639922);
  },
  corn(R) {
    R(6, 4, 4, 9, 0xf2c438); R(7, 5, 1, 7, 0xffe08a);
    R(4, 5, 2, 6, 0x7cae4e); R(10, 6, 2, 6, 0x7cae4e);
  },
  chili(R) {
    R(7, 5, 3, 8, 0xc4553f); R(8, 6, 1, 6, 0xe0705a); R(9, 12, 2, 2, 0xc4553f);
    R(7, 3, 3, 2, 0x3b6d11); R(8, 2, 1, 2, 0x3b6d11);
  },
  backpack(R) {
    R(4, 4, 8, 10, 0x8a5a33); R(5, 2, 6, 3, 0xb08650); R(5, 8, 6, 4, 0x6f4526); R(7, 9, 2, 1, 0xef9f27);
    R(3, 6, 1, 5, 0x6f4526); R(12, 6, 1, 5, 0x6f4526);
  },
  animal_feed(R) {
    R(4, 6, 8, 8, 0xc9a35a); R(5, 4, 6, 2, 0xb08650); R(6, 8, 4, 1, 0x8a5a33); R(6, 10, 4, 1, 0x8a5a33);
    R(5, 3, 1, 2, 0xe0c27a); R(10, 3, 1, 2, 0xe0c27a);
  },
  tomato(R) {
    R(5, 6, 7, 7, 0xd14b3d); R(6, 7, 2, 2, 0xe8766a);
    R(6, 4, 5, 2, 0x4e7a2c); R(8, 3, 1, 2, 0x4e7a2c);
  }
};

// Seed packets share a shape; the dot color tells the crop apart.
function seedIcon(color) {
  return (R) => {
    R(4, 5, 8, 9, 0xd9b77a); R(6, 3, 4, 2, 0xb08650);
    R(7, 8, 2, 3, color); R(6, 10, 4, 1, color);
  };
}
Object.keys(CROPS).forEach((id) => { DRAW[CROPS[id].seed] = seedIcon(CROPS[id].fruit); });

// diagonal wooden handle shared by most tools
function handle(R) {
  for (let n = 0; n < 8; n++) R(3 + n, 12 - n, 2, 2, BROWN);
}

export function createItemIcons(scene) {
  Object.keys(ITEMS).forEach((id) => {
    const key = `item_${id}`;
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({ add: false });
    const R = (x, y, w, h, c) => { g.fillStyle(c, 1); g.fillRect(x, y, w, h); };
    (DRAW[id] || ((r) => r(4, 4, 8, 8, 0xef9f27)))(R);
    g.generateTexture(key, 16, 16);
    g.destroy();
  });
}
