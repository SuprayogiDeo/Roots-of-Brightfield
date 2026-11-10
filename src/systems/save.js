// Versioned save in localStorage. Export/Import comes in a later step.
const KEY = 'roots_of_brightfield_save';
export const SAVE_VERSION = 5;
export const BAG_SIZE = 18;

// Row 1 = tools, row 2 = starter seeds, row 3 empty.
function starterInventory() {
  const slots = new Array(BAG_SIZE).fill(null);
  ['hoe', 'watering_can', 'axe', 'pickaxe', 'fishing_rod'].forEach((id, i) => { slots[i] = { id, qty: 1 }; });
  slots[6] = { id: 'carrot_seeds', qty: 5 };
  slots[7] = { id: 'corn_seeds', qty: 5 };
  slots[8] = { id: 'chili_seeds', qty: 3 };
  slots[9] = { id: 'tomato_seeds', qty: 3 };
  return { size: BAG_SIZE, slots, row: 0, sel: 0 };
}

// Upgrade older saves step by step so players never lose progress.
function migrate(data) {
  if (data.version < 2) {
    data.flags = { prologueSeen: false, shedOpen: false, ...data.flags };
    data.stamina = data.stamina || { cur: 100, max: 100 };
    data.inventory = data.inventory || starterInventory();
    data.pos = data.pos || null;
    data.version = 2;
  }
  if (data.version < 3) {
    data.plots = data.plots || {};        // "tx,ty" -> { crop, grown, watered }
    data.quest = data.quest || { id: 'old_shed', step: data.flags.shedOpen ? 1 : 0, done: false };
    data.version = 3;
  }
  if (data.version < 4) {
    data.friends = data.friends || {}; // npcId -> { points, lastDay }
    data.version = 4;
  }
  if (data.version < 5) {
    data.animals = data.animals || []; // { id, type, fed, ready }
    data.xp = data.xp || { level: 1, xp: 0 };
    data.version = 5;
  }
  return data;
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object' || typeof data.version !== 'number') return null;
    if (data.version > SAVE_VERSION) return null; // saved by a newer build
    return migrate(data);
  } catch (e) {
    return null;
  }
}

export function hasSave() {
  return loadSave() !== null;
}

export function writeSave(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...data, version: SAVE_VERSION, savedAt: Date.now() }));
    return true;
  } catch (e) {
    return false;
  }
}

export function deleteSave() {
  try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
}

export function newSave({ name, gender }) {
  return {
    version: SAVE_VERSION,
    player: { name, gender },
    flags: { prologueSeen: false, shedOpen: false },
    time: { season: 0, day: 1, minutes: 360 },
    coins: 0,
    stamina: { cur: 100, max: 100 },
    inventory: starterInventory(),
    plots: {},
    quest: { id: 'old_shed', step: 0, done: false },
    friends: {},
    animals: [],
    xp: { level: 1, xp: 0 },
    pos: null // { map, x, y } — null = map spawn point
  };
}
