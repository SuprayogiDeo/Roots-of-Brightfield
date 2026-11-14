// Village side of the festivals (Step 5.2): code-drawn decorations, two festival spots, and what A does there.
// Called once from VillageScene.create(). Returns null on a normal day.

import Phaser from 'phaser';
import { t } from '../i18n/index.js';
import { goTo } from './ui.js';
import FestivalGameScene from '../scenes/FestivalGameScene.js';
import { playSfx } from './audio.js';
import { NPCS } from './npcs.js';
import { ITEMS } from './items.js';
import {
  festivalOn, festivalName, festState, isOpen, openText, sellAtMarket, buyDeal, DEAL,
  enterContest, shareFeast, rankLabel
} from './festivals.js';

const STALL_Y = 244;           // base line of the stalls (south side of the main road)
const SPOT_X = [376, 456];     // two stalls, each festival has two spots
const PALETTE = {
  market: { a: 0xef9f27, b: 0xf6e7c1, goods: [0xc4553f, 0x639922, 0xef9f27] },
  independence: { a: 0xd22b2b, b: 0xf6f1e6, goods: [0xd22b2b, 0xf6f1e6, 0xd22b2b] },
  harvest: { a: 0xba7517, b: 0xef9f27, goods: [0xef9f27, 0xc4553f, 0x854f0b] }
};

function drawBunting(scene, c) {
  const g = scene.add.graphics().setDepth(450);
  const x0 = 24;
  const x1 = 616;
  const y = (x) => 180 + 5 * Math.sin((Math.PI * (x - x0)) / (x1 - x0)) * 2; // gentle sag
  g.lineStyle(1, 0x2b1d12, 1);
  g.beginPath();
  for (let x = x0; x <= x1; x += 8) (x === x0 ? g.moveTo(x, y(x)) : g.lineTo(x, y(x)));
  g.strokePath();
  let i = 0;
  for (let x = x0 + 6; x < x1 - 6; x += 14) {
    g.fillStyle(i % 2 ? c.b : c.a, 1);
    g.fillTriangle(x - 5, y(x), x + 5, y(x), x, y(x) + 10);
    i += 1;
  }
  [x0, x1].forEach((x) => { g.fillStyle(0x6a3d22, 1); g.fillRect(x - 1, 170, 3, 30); });
}

function drawStall(scene, cx, c) {
  const g = scene.add.graphics().setDepth(STALL_Y);
  g.fillStyle(0x6a3d22, 1);                         // posts
  g.fillRect(cx - 15, STALL_Y - 26, 3, 26);
  g.fillRect(cx + 12, STALL_Y - 26, 3, 26);
  g.fillStyle(0x8a5a33, 1);                         // counter
  g.fillRect(cx - 16, STALL_Y - 10, 32, 10);
  g.fillStyle(0xba7517, 1);
  g.fillRect(cx - 16, STALL_Y - 10, 32, 2);
  for (let i = 0; i < 6; i++) {                     // striped awning
    g.fillStyle(i % 2 ? c.b : c.a, 1);
    g.fillRect(cx - 18 + i * 6, STALL_Y - 32, 6, 8);
  }
  g.fillStyle(c.a, 1);
  g.fillTriangle(cx - 18, STALL_Y - 24, cx + 18, STALL_Y - 24, cx, STALL_Y - 20);
  c.goods.forEach((col, i) => {                     // goods on the counter
    g.fillStyle(col, 1);
    g.fillCircle(cx - 8 + i * 8, STALL_Y - 13, 3);
  });
  return g;
}

export function createVillageFestival(scene) {
  const save = scene.save;
  const fest = festivalOn(save.time.total);
  if (!fest) return null;
  const c = PALETTE[fest.id];
  // Register the mini-game scene here so main.js does not need to change.
  if (!scene.scene.get('FestGame')) scene.scene.add('FestGame', FestivalGameScene);

  drawBunting(scene, c);
  const zones = [];
  fest.spots.forEach((spot, i) => {
    const cx = SPOT_X[i];
    drawStall(scene, cx, c);
    const wall = scene.add.rectangle(cx, STALL_Y - 4, 32, 8, 0x000000, 0);
    scene.physics.add.existing(wall, true);           // stalls are solid
    scene.physics.add.collider(scene.player, wall);
    const z = { action: `fest:${spot}`, rect: new Phaser.Geom.Rectangle(cx - 22, STALL_Y + 2, 44, 24) };
    scene.zones.push(z);
    zones.push(z);
  });

  const hud = () => scene.hud;
  const st = () => festState(save);
  const say = (text) => hud().showMessage(text);

  // Shared checks: open? already done today?
  const gate = (spot, once) => {
    if (!isOpen(fest, save.time.minutes)) {
      say(save.time.minutes < fest.open ? openText(fest) : t('festival.over', { name: festivalName(fest) }));
      playSfx(scene, 'sfx_deny');
      return false;
    }
    if (once && st().done[spot]) { say(t('festival.done')); playSfx(scene, 'sfx_deny'); return false; }
    return true;
  };

  const startGame = (game) => {
    scene.persist();
    goTo(scene, 'FestGame', { game, from: 'Village' });
  };

  const api = {
    // Once per festival day, when the player enters the village.
    welcome() {
      if (st().seen) return;
      st().seen = true;
      say(`${festivalName(fest)}\n${t(`festival.welcome.${fest.id}`)}`);
      scene.persist();
    },

    prompt(spot) { return t(`festival.prompt.${spot}`); },

    act(spot) {
      if (spot === 'sell') {
        if (!gate(spot, false)) return;
        const r = sellAtMarket(save);
        if (!r.coins) { say(t('festival.sell.none')); playSfx(scene, 'sfx_deny'); return; }
        playSfx(scene, 'sfx_coins');
        hud().toast(`+${r.coins}g`, '#EF9F27');
        say(t('festival.sell.done', { count: r.count, coins: r.coins }));
      } else if (spot === 'deal') {
        if (!gate(spot, true)) return;
        const r = buyDeal(save);
        if (r === 'coins') { say(t('festival.deal.coins', { cost: DEAL.cost })); playSfx(scene, 'sfx_deny'); return; }
        if (r === 'full') { say(t('msg.bagFull')); playSfx(scene, 'sfx_deny'); return; }
        st().done.deal = 1;
        playSfx(scene, 'sfx_coins');
        say(t('festival.deal.done', { qty: DEAL.qty, item: ITEMS[DEAL.item].name, cost: DEAL.cost }));
      } else if (spot === 'sack' || spot === 'krupuk') {
        if (!gate(spot, true)) return;
        startGame(spot);
        return;
      } else if (spot === 'contest') {
        if (!gate(spot, true)) return;
        const r = enterContest(save);
        if (!r) { say(t('festival.contest.none')); playSfx(scene, 'sfx_deny'); return; }
        playSfx(scene, 'jingle_quest');
        hud().toast(`+${r.coins}g`, '#EF9F27');
        say(t('festival.contest.result', { item: r.item, rank: rankLabel(r.rank), coins: r.coins }));
      } else if (spot === 'feast') {
        if (!gate(spot, true)) return;
        const n = shareFeast(save, Object.keys(NPCS));
        playSfx(scene, 'jingle_day');
        say(t('festival.feast.done', { n }));
      }
      hud().refresh();
      hud().refreshHotbar();
      scene.persist();
    }
  };
  return api;
}
