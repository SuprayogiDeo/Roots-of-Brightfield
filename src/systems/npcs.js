// The three Brightfield villagers. NPC names stay English in both languages.
// Until the paid art pack arrives they reuse the player sheet with a colour tint
// (ASSET_MANIFEST key `player`), so swapping in real sheets is one line each.

export const NPCS = {
  mina: { name: 'Mina', tint: 0xffc9a0, role: 'shop', lines: ['npc.mina.1', 'npc.mina.2', 'npc.mina.3'] },
  rangga: { name: 'Rangga', tint: 0x9ad5ff, lines: ['npc.rangga.1', 'npc.rangga.2', 'npc.rangga.3'] },
  ayu: { name: 'Ayu', tint: 0xd7b0ff, lines: ['npc.ayu.1', 'npc.ayu.2', 'npc.ayu.3'] }
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
