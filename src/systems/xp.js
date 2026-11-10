// XP / level system. Level 1..MAX_LEVEL. Each level raises max stamina by 10.
export const MAX_LEVEL = 10;

// XP needed to go from `level` to `level + 1` (20, 35, 50, ...).
export function xpNeeded(level) {
  return 20 + (level - 1) * 15;
}

export function staminaMaxFor(level) {
  return 100 + (level - 1) * 10;
}

// XP rewards per action.
export const XP_GAIN = { till: 1, plant: 1, water: 1, harvest: 4, feed: 2, collect: 3 };

// Adds XP to the save. Returns { leveled, level }.
export function addXp(save, amount) {
  const x = save.xp;
  let leveled = false;
  if (!amount || x.level >= MAX_LEVEL) return { leveled, level: x.level };
  x.xp += amount;
  while (x.level < MAX_LEVEL && x.xp >= xpNeeded(x.level)) {
    x.xp -= xpNeeded(x.level);
    x.level += 1;
    leveled = true;
    save.stamina.max = staminaMaxFor(x.level);
    save.stamina.cur = Math.min(save.stamina.max, save.stamina.cur + 10);
  }
  if (x.level >= MAX_LEVEL) x.xp = 0;
  return { leveled, level: x.level };
}
