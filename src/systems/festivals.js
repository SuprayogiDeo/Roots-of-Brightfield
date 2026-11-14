// Festivals (Step 5.2). Pure logic, no Phaser: the Village scene and the mini-games call into this.
//
// 3 festivals, one per season (Winter has none yet). All held in Brightfield Village.
//   market       Spring 14  06:00-12:00  Morning Market: sell at +25%, cheap feed bundle
//   independence Summer 17  09:00-17:00  Independence-Day games: Sack Race + Cracker Eating
//   harvest      Fall 21    10:00-18:00  Harvest Festival: crop contest + shared feast

import { t } from '../i18n/index.js';
import { seasonOf, dayOf } from './calendar.js';
import { ITEMS, addItem } from './items.js';
import { addXp } from './xp.js';

export const FESTIVALS = {
  market: { id: 'market', season: 0, day: 14, open: 360, close: 720, spots: ['sell', 'deal'] },
  independence: { id: 'independence', season: 1, day: 17, open: 540, close: 1020, spots: ['sack', 'krupuk'] },
  harvest: { id: 'harvest', season: 2, day: 21, open: 600, close: 1080, spots: ['contest', 'feast'] }
};

export const festivalOn = (total) => Object.values(FESTIVALS)
  .find((f) => f.season === seasonOf(total) && f.day === dayOf(total)) || null;

export const isOpen = (f, minutes) => minutes >= f.open && minutes < f.close;

function clock(minutes) {
  const h24 = Math.floor(minutes / 60) % 24;
  const ampm = h24 < 12 ? 'AM' : 'PM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(minutes % 60).padStart(2, '0')} ${ampm}`;
}

export const festivalName = (f) => t(`festival.name.${f.id}`);

// Per-day bookkeeping: what the player already did today (resets on a new day).
export function festState(save) {
  if (!save.festival || save.festival.day !== save.time.total) save.festival = { day: save.time.total, done: {}, seen: false };
  return save.festival;
}

// Line for the "new day" message: "Today is ..." / "Tomorrow: ...". null = nothing special.
export function festivalNote(save) {
  const today = festivalOn(save.time.total);
  if (today) return t('festival.today', { name: festivalName(today), from: clock(today.open), to: clock(today.close) });
  const next = festivalOn(save.time.total + 1);
  return next ? t('festival.tomorrow', { name: festivalName(next) }) : null;
}

export const openText = (f) => t('festival.notYet', { name: festivalName(f), time: clock(f.open) });

// ---------------- prizes (mini-games + contest) ----------------
export const GAME_PRIZES = [
  { coins: 200, xp: 10 }, { coins: 120, xp: 6 }, { coins: 60, xp: 3 }, { coins: 20, xp: 1 }
];
export const rankLabel = (rank) => t(`festival.rank.${rank + 1}`); // rank is 0-based

// Pay the prize for a finished mini-game and remember it for today.
export function awardGame(save, game, rank) {
  const prize = GAME_PRIZES[Math.min(rank, GAME_PRIZES.length - 1)];
  save.coins += prize.coins;
  addXp(save, prize.xp);
  festState(save).done[game] = rank + 1;
  save.time.minutes = Math.min(save.time.minutes + 30, 26 * 60 - 10); // games take half an hour
  return prize;
}

// ---------------- Morning Market ----------------
export const MARKET_BONUS = 1.25;
export const DEAL = { item: 'animal_feed', qty: 5, cost: 15 };

// Sell every sellable item at +25%. Returns { coins, count }.
export function sellAtMarket(save) {
  const inv = save.inventory;
  let coins = 0;
  let count = 0;
  inv.slots.forEach((s, i) => {
    const def = s && ITEMS[s.id];
    if (!def || !def.price) return;
    coins += Math.round(def.price * MARKET_BONUS) * s.qty;
    count += s.qty;
    inv.slots[i] = null;
  });
  save.coins += coins;
  return { coins, count };
}

// Returns 'ok' | 'coins' | 'full'.
export function buyDeal(save) {
  if (save.coins < DEAL.cost) return 'coins';
  const copy = JSON.parse(JSON.stringify(save.inventory));
  if (addItem(copy, DEAL.item, DEAL.qty) > 0) return 'full';
  save.inventory = copy;
  save.coins -= DEAL.cost;
  return 'ok';
}

// ---------------- Harvest Festival ----------------
// The player enters the most valuable sellable item in the bag. The item is left at the display table.
export function bestEntry(save) {
  let best = null;
  save.inventory.slots.forEach((s, i) => {
    const def = s && ITEMS[s.id];
    if (def && def.price && (!best || def.price > best.price)) best = { index: i, id: s.id, price: def.price };
  });
  return best;
}

// 100g+ = 1st, 40g+ = 2nd, anything else = 3rd.
export function contestResult(price) {
  const rank = price >= 100 ? 0 : price >= 40 ? 1 : 2;
  const coins = [500, 250, 100][rank];
  return { rank, coins, xp: [12, 8, 4][rank] };
}

export function enterContest(save) {
  const e = bestEntry(save);
  if (!e) return null;
  const inv = save.inventory;
  inv.slots[e.index].qty -= 1;
  if (inv.slots[e.index].qty <= 0) inv.slots[e.index] = null;
  const res = contestResult(e.price);
  save.coins += res.coins;
  addXp(save, res.xp);
  festState(save).done.contest = res.rank + 1;
  return { ...res, item: ITEMS[e.id].name };
}

// Share a meal: +2 friendship points with every villager. Returns the number of villagers.
export function shareFeast(save, npcIds) {
  if (!save.friends) save.friends = {};
  npcIds.forEach((id) => {
    const f = save.friends[id] || (save.friends[id] = { points: 0, lastDay: 0 });
    f.points += 2;
  });
  festState(save).done.feast = 1;
  return npcIds.length;
}
