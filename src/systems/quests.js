// Quest system (Step 5.1b). Pure logic, no Phaser: data-driven quests, events, rewards, notebook pages.
//
// Save: save.quests = { active: { id: { p: [progress per objective] } }, done: { id: day }, tracked: id|null }
//
// Game code reports what the player did with questEvent(save, type, payload); the system advances every
// matching objective, completes quests, pays rewards and starts follow-up quests.
//   events: shed till plant{crop} water harvest{crop} sell{count} feed collect{item} fish{id} mine{item}
//           cook{recipe} visit{map} talk{npc} season{season}      (NPC "deliver" objectives: see deliver())

import { addItem, countItem } from './items.js';
import { addXp } from './xp.js';

const o = (type, count = 1, match = null) => ({ type, count, match });

// giver: 'notebook' = starts by itself when unlocked; an NPC id = offered by that villager (accept in dialogue).
// after: quest ids that must be done first. ordered: objectives must be done in order (tutorial).
export const QUESTS = {
  old_shed: {
    giver: 'notebook', ordered: true, page: 1,
    objectives: [o('shed'), o('till'), o('plant'), o('water'), o('harvest'), o('sell')],
    reward: { coins: 100, xp: 10, items: [['animal_feed', 3]], animal: 'chicken' }
  },
  flock: {
    giver: 'notebook', after: ['old_shed'], page: 2,
    objectives: [o('feed'), o('collect')],
    reward: { coins: 80, xp: 8, items: [['animal_feed', 2]] }
  },
  first_catch: {
    giver: 'notebook', after: ['flock'], page: 3,
    objectives: [o('fish', 3)],
    reward: { coins: 120, xp: 10 }
  },
  explorer: {
    giver: 'notebook', after: ['flock'], page: 4,
    objectives: [o('visit', 1, { map: 'beach' }), o('visit', 1, { map: 'forest' }), o('visit', 1, { map: 'mine' })],
    reward: { coins: 150, xp: 12 }
  },
  rock_collector: {
    giver: 'notebook', after: ['explorer'], page: 5,
    objectives: [o('mine', 5, { item: 'stone' }), o('mine', 1, { item: 'copper_ore' })],
    reward: { coins: 150, xp: 12 }
  },
  kitchen_table: {
    giver: 'notebook', after: ['flock'], page: 6,
    objectives: [o('cook')],
    reward: { coins: 100, xp: 8 }
  },
  green_thumb: {
    giver: 'notebook', after: ['flock'], page: 7,
    objectives: [o('harvest', 10)],
    reward: { coins: 200, xp: 15 }
  },
  new_season: {
    giver: 'notebook', after: ['old_shed'], page: 8,
    objectives: [o('season')],
    reward: { coins: 200, xp: 15 }
  },
  secret: {
    giver: 'notebook', after: ['first_catch', 'explorer', 'rock_collector', 'kitchen_table', 'green_thumb', 'new_season'], page: 9,
    objectives: [o('talk', 1, { npc: 'ayu' })],
    reward: { coins: 500, xp: 30 }
  },
  // --- villager requests (accepted by talking to them) ---
  mina_eggs: {
    giver: 'mina', after: ['flock'],
    objectives: [{ type: 'deliver', count: 3, match: { npc: 'mina', item: 'egg' } }],
    reward: { coins: 120, xp: 6, friend: { mina: 3 } }
  },
  rangga_fish: {
    giver: 'rangga', after: ['first_catch'],
    objectives: [{ type: 'deliver', count: 2, match: { npc: 'rangga', item: 'fish' } }], // 'fish' = any fish
    reward: { coins: 150, xp: 8, friend: { rangga: 3 } }
  },
  ayu_sambal: {
    giver: 'ayu', after: ['kitchen_table'],
    objectives: [{ type: 'deliver', count: 1, match: { npc: 'ayu', item: 'sambal' } }],
    reward: { coins: 200, xp: 10, friend: { ayu: 3 } }
  }
};

export const QUEST_IDS = Object.keys(QUESTS);
export const NOTEBOOK = QUEST_IDS.filter((id) => QUESTS[id].page).sort((a, b) => QUESTS[a].page - QUESTS[b].page);

// ---------------- state ----------------
export function newQuestState() {
  return { active: {}, done: {}, tracked: null };
}

export const isDone = (save, id) => Object.prototype.hasOwnProperty.call(save.quests.done, id);
export const isActive = (save, id) => Object.prototype.hasOwnProperty.call(save.quests.active, id);

export function isAvailable(save, id) {
  const q = QUESTS[id];
  if (!q || isDone(save, id) || isActive(save, id)) return false;
  return (q.after || []).every((a) => isDone(save, a));
}

export function startQuest(save, id) {
  save.quests.active[id] = { p: QUESTS[id].objectives.map(() => 0), since: save.time.total };
  if (!save.quests.tracked || !isActive(save, save.quests.tracked)) save.quests.tracked = id;
}

// Start every notebook quest that is unlocked. Returns the ids that started (follow-ups chain automatically).
export function refreshQuests(save) {
  const started = [];
  let again = true;
  while (again) {
    again = false;
    QUEST_IDS.forEach((id) => {
      if (QUESTS[id].giver === 'notebook' && isAvailable(save, id)) {
        startQuest(save, id);
        started.push(id);
        again = true;
      }
    });
  }
  return started;
}

// ---------------- events ----------------
function matches(obj, payload) {
  if (!obj.match) return true;
  return Object.keys(obj.match).every((k) => payload[k] === obj.match[k]);
}

// The objective the player should work on now (null when finished): first unfinished one.
export function currentObjective(save, id) {
  const st = save.quests.active[id];
  if (!st) return null;
  const objs = QUESTS[id].objectives;
  const i = objs.findIndex((ob, k) => st.p[k] < ob.count);
  return i < 0 ? null : { index: i, obj: objs[i], value: st.p[i], need: objs[i].count };
}

// Report an action. Returns { progressed: [{id, index, value, need}], completed: [reward results], started: [ids] }
export function questEvent(save, type, payload = {}) {
  const res = { progressed: [], completed: [], started: [] };
  Object.keys(save.quests.active).forEach((id) => {
    const q = QUESTS[id];
    const st = save.quests.active[id];
    const objs = q.objectives;
    const first = q.ordered ? objs.findIndex((ob, k) => st.p[k] < ob.count) : -1;
    objs.forEach((ob, k) => {
      if (ob.type !== type || st.p[k] >= ob.count) return;
      if (q.ordered && k !== first) return;
      if (!matches(ob, payload)) return;
      const add = type === 'sell' ? Math.max(1, payload.count || 1) : 1;
      st.p[k] = Math.min(ob.count, st.p[k] + add);
      res.progressed.push({ id, index: k, value: st.p[k], need: ob.count });
    });
    if (objs.every((ob, k) => st.p[k] >= ob.count)) res.completed.push(completeQuest(save, id));
  });
  // completing a quest may unlock follow-ups
  res.started.push(...refreshQuests(save));
  return res;
}

// ---------------- rewards ----------------
export function completeQuest(save, id) {
  const q = QUESTS[id];
  delete save.quests.active[id];
  save.quests.done[id] = save.time.total;
  const r = q.reward || {};
  const out = { id, coins: r.coins || 0, xp: r.xp || 0, items: [], lost: 0, animal: r.animal || null, friend: r.friend || null, leveled: false, level: 0 };
  save.coins += out.coins;
  (r.items || []).forEach(([item, n]) => {
    const left = addItem(save.inventory, item, n);
    if (left < n) out.items.push([item, n - left]);
    if (left > 0) { out.lost += left; save.coins += left * 10; } // bag full: paid out as coins instead
  });
  if (r.friend) {
    save.friends = save.friends || {};
    Object.keys(r.friend).forEach((npc) => {
      const f = save.friends[npc] || (save.friends[npc] = { points: 0, lastDay: 0 });
      f.points += r.friend[npc];
    });
  }
  const lv = addXp(save, out.xp);
  out.leveled = lv.leveled;
  out.level = lv.level;
  if (save.quests.tracked === id) save.quests.tracked = Object.keys(save.quests.active)[0] || null;
  return out;
}

// ---------------- villager requests ----------------
export const offerFor = (save, npc) => QUEST_IDS.find((id) => QUESTS[id].giver === npc && isAvailable(save, id)) || null;
export const activeFor = (save, npc) => QUEST_IDS.find((id) => QUESTS[id].giver === npc && isActive(save, id)) || null;

const itemMatches = (spec, id) => (spec === 'fish' ? id.startsWith('fish_') : id === spec);

export function countMatching(inv, spec) {
  return inv.slots.reduce((n, s) => n + (s && itemMatches(spec, s.id) ? s.qty : 0), 0);
}

function removeMatching(inv, spec, n) {
  let left = n;
  for (let i = 0; i < inv.slots.length && left > 0; i++) {
    const s = inv.slots[i];
    if (s && itemMatches(spec, s.id)) {
      const take = Math.min(left, s.qty);
      s.qty -= take;
      left -= take;
      if (s.qty <= 0) inv.slots[i] = null;
    }
  }
}

// Can the active request of `id` be handed in right now?
export function canDeliver(save, id) {
  const ob = QUESTS[id].objectives[0];
  return ob.type === 'deliver' && countMatching(save.inventory, ob.match.item) >= ob.count;
}

// Hand in the items; completes the quest. Returns the reward result or null.
export function deliver(save, id) {
  if (!isActive(save, id) || !canDeliver(save, id)) return null;
  const ob = QUESTS[id].objectives[0];
  removeMatching(save.inventory, ob.match.item, ob.count);
  save.quests.active[id].p[0] = ob.count;
  const res = { progressed: [], completed: [completeQuest(save, id)], started: [] };
  res.started.push(...refreshQuests(save));
  return res;
}

// ---------------- notebook ----------------
export const notebookOpen = (save) => isDone(save, 'old_shed');

// 'done' = story revealed, 'active' = hint shown, 'locked' = blank page
export function pageState(save, id) {
  if (isDone(save, id)) return 'done';
  if (isActive(save, id)) return 'active';
  return 'locked';
}

// ---------------- tracker (HUD line) ----------------
export function trackedQuest(save) {
  const q = save.quests;
  if (q.tracked && isActive(save, q.tracked)) return q.tracked;
  const ids = Object.keys(q.active).filter((id) => QUESTS[id].giver === 'notebook');
  return ids[0] || Object.keys(q.active)[0] || null;
}

export function setTracked(save, id) {
  if (isActive(save, id)) save.quests.tracked = id;
}

// ---------------- migration from the old single-quest save ----------------
export function migrateLegacyQuest(old, total = 1) {
  const st = newQuestState();
  if (old && old.done) st.done.old_shed = total;
  else {
    const step = (old && old.step) || 0;
    st.active.old_shed = { p: QUESTS.old_shed.objectives.map((_, k) => (k < step ? 1 : 0)), since: total };
    st.tracked = 'old_shed';
  }
  return st;
}
