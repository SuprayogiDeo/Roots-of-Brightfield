// Versioned save in localStorage. Export/Import comes in a later step.
import { syncCalendar } from './calendar.js';
import { newQuestState, migrateLegacyQuest, refreshQuests } from './quests.js';
const KEY = 'roots_of_brightfield_save';
export const SAVE_VERSION = 7;
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
  if (data.version < 6) {
    data.mine = data.mine || { nodes: {} }; // node id -> in-game day it was mined out (Step 4.5)
    data.version = 6;
  }
  if (data.version < 7) {
    // Step 5.1: absolute day counter + 4 seasons x 28 days, weather bookkeeping, multi-quest log.
    // Old saves counted days forever in time.day: keep that number as time.total.
    data.time = data.time || { season: 0, day: 1, minutes: 360 };
    data.time.total = Math.max(1, data.time.day || 1);
    syncCalendar(data.time);
    data.weather = data.weather || { rainWatered: 0 };
    data.quests = migrateLegacyQuest(data.quest, data.time.total);
    delete data.quest;
    data.version = 7;
    refreshQuests(data);
  }
  if (!data.mine || typeof data.mine.nodes !== 'object' || !data.mine.nodes) data.mine = { nodes: {} };
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

function startQuests() {
  const s = { quests: newQuestState(), time: { total: 1 }, coins: 0 };
  refreshQuests(s); // starts "Old Shed"
  return s.quests;
}

export function newSave({ name, gender }) {
  return {
    version: SAVE_VERSION,
    player: { name, gender },
    flags: { prologueSeen: false, shedOpen: false },
    time: { season: 0, day: 1, total: 1, minutes: 360 },
    coins: 0,
    stamina: { cur: 100, max: 100 },
    inventory: starterInventory(),
    plots: {},
    weather: { rainWatered: 0 },
    quests: startQuests(),
    friends: {},
    animals: [],
    xp: { level: 1, xp: 0 },
    mine: { nodes: {} },
    pos: null // { map, x, y } — null = map spawn point
  };
}
