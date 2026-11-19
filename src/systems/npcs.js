// The three Brightfield villagers. NPC names stay English in both languages.
// Art (Step A1): each villager has its own 32x32 sheet (`sprite` = ASSET_MANIFEST key).
// `tint` is only the fallback colour used when that sheet is missing.

export const NPCS = {
  mina: { name: 'Mina', sprite: 'npc_mina', tint: 0xffc9a0, role: 'shop', lines: ['npc.mina.1', 'npc.mina.2', 'npc.mina.3'] },
  rangga: { name: 'Rangga', sprite: 'npc_rangga', tint: 0x9ad5ff, lines: ['npc.rangga.1', 'npc.rangga.2', 'npc.rangga.3'] },
  ayu: { name: 'Ayu', sprite: 'npc_ayu', tint: 0xd7b0ff, lines: ['npc.ayu.1', 'npc.ayu.2', 'npc.ayu.3'] }
};

export const MAX_HEARTS = 10;
const POINTS_PER_HEART = 3;

export function heartsOf(save, id) {
  const f = save.friends && save.friends[id];
  return f ? Math.min(MAX_HEARTS, Math.floor(f.points / POINTS_PER_HEART)) : 0;
}

// First chat of the day gives +1 friendship point. Returns { hearts, gained }.
export function greet(save, id) {
  if (!save.friends) save.friends = {};
  const f = save.friends[id] || (save.friends[id] = { points: 0, lastDay: 0 });
  const before = heartsOf(save, id);
  let gained = false;
  if (f.lastDay !== save.time.total) {
    f.lastDay = save.time.total;
    f.points += 1;
    gained = true;
  }
  return { hearts: heartsOf(save, id), gained, leveledUp: heartsOf(save, id) > before };
}

// Line index rotates so repeated chats are not identical.
export function lineFor(save, id) {
  const def = NPCS[id];
  const f = (save.friends && save.friends[id]) || { points: 0 };
  return def.lines[f.points % def.lines.length];
}
