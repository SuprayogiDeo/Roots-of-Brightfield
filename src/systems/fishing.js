import Phaser from 'phaser';
import { t } from '../i18n/index.js';
import { makeText } from './ui.js';
import { ITEMS } from './items.js';
import { playSfx } from './audio.js';

// Simple fishing minigame (Step 4.1). One button (A) only:
//   1. CAST   - the bobber lands on the water tile in front of the player.
//   2. WAIT   - random 1.5-4.5 s. Pressing A now scares the fish away.
//   3. BITE   - a "!" shows for ~0.9 s. Tap A in time to hook the fish.
//   4. REEL   - a marker slides along a bar; tap A while it is inside the green zone.
//               Heavier fish need more hits, run faster and have a smaller zone.
// Result is reported through onCatch(fishId) / onFail(messageKey).

export const FISH = [
  // weight = how common, hits = successful taps needed, speed = marker px/s, zone = green px
  { id: 'fish_sardine', weight: 30, hits: 1, speed: 120, zone: 52 },
  { id: 'fish_mackerel', weight: 25, hits: 2, speed: 140, zone: 44 },
  { id: 'fish_bass', weight: 18, hits: 2, speed: 160, zone: 40 },
  { id: 'fish_catfish', weight: 12, hits: 2, speed: 150, zone: 38 },
  { id: 'fish_snapper', weight: 10, hits: 3, speed: 185, zone: 34 },
  { id: 'fish_golden_carp', weight: 5, hits: 3, speed: 210, zone: 28 }
];

export function rollFish(rand = Math.random) {
  const total = FISH.reduce((n, f) => n + f.weight, 0);
  let r = rand() * total;
  for (const f of FISH) {
    r -= f.weight;
    if (r <= 0) return f;
  }
  return FISH[0];
}

const BAR_W = 160;
const BAR_H = 10;
const DEPTH = 1100;

export default class FishingGame {
  constructor(scene, { onCatch, onFail, getLevel }) {
    this.scene = scene;
    this.onCatch = onCatch;
    this.onFail = onFail;
    this.getLevel = getLevel || (() => 1);
    this.state = 'idle'; // idle | wait | bite | reel
    this.timer = 0;
    this.line = scene.add.graphics().setDepth(DEPTH - 1);
    this.bobber = scene.add.circle(0, 0, 2.5, 0xc4553f).setStrokeStyle(1, 0xf6e7c1).setDepth(DEPTH - 1).setVisible(false);
    this.mark = makeText(scene, 0, 0, '', 8, '#EF9F27').setDepth(DEPTH).setVisible(false);
    this.ui = null;
  }

  get active() {
    return this.state !== 'idle';
  }

  // target = { x, y } world position of the water tile centre; from = player position getter
  start(target, from) {
    if (this.active) return;
    this.target = target;
    this.from = from;
    this.state = 'wait';
    this.timer = Phaser.Math.Between(1500, 4500);
    this.bobber.setPosition(target.x, target.y).setVisible(true);
    this.mark.setText('...').setColor('#F6E7C1').setPosition(target.x, target.y - 12).setVisible(true);
    playSfx(this.scene, 'sfx_splash');
    this.scene.hud.toast(t('fish.wait'), '#F6E7C1');
  }

  cancel(messageKey) {
    if (!this.active) return;
    this.reset();
    if (messageKey) this.onFail(messageKey);
  }

  reset() {
    this.state = 'idle';
    this.bobber.setVisible(false);
    this.mark.setVisible(false);
    this.line.clear();
    if (this.ui) { this.ui.forEach((o) => o.destroy()); this.ui = null; }
    this.fish = null;
  }

  // Returns true when the press was consumed by the minigame.
  pressA() {
    if (!this.active) return false;
    if (this.state === 'wait') {
      this.cancel('fish.early');
    } else if (this.state === 'bite') {
      this.fish = rollFish();
      this.hits = 0;
      this.state = 'reel';
      this.mark.setVisible(false);
      this.buildBar();
      playSfx(this.scene, 'sfx_click');
    } else if (this.state === 'reel') {
      const inZone = this.markerX >= this.zoneX && this.markerX <= this.zoneX + this.zoneW;
      if (!inZone) {
        this.reset();
        this.onFail('fish.lost');
        return true;
      }
      this.hits += 1;
      playSfx(this.scene, 'sfx_plant');
      if (this.hits >= this.fish.hits) {
        const id = this.fish.id;
        this.reset();
        this.onCatch(id);
      } else {
        this.speed *= 1.12;
        this.placeZone();
        this.refreshPips();
      }
    }
    return true;
  }

  buildBar() {
    const s = this.scene;
    const cx = s.scale.width / 2;
    const y = 190;
    const x0 = cx - BAR_W / 2;
    this.barX = x0;
    this.barY = y;
    const fix = (o, d = 0) => o.setScrollFactor(0).setDepth(DEPTH + d);
    const panel = fix(s.add.rectangle(cx, y + 4, BAR_W + 20, 44, 0x2b1d12, 0.85).setStrokeStyle(1, 0x854f0b));
    const title = fix(makeText(s, cx, y - 12, t('fish.reel'), 8, '#F6E7C1'), 1);
    const back = fix(s.add.rectangle(x0, y, BAR_W, BAR_H, 0x1a120b).setOrigin(0, 0).setStrokeStyle(1, 0x854f0b), 1);
    this.zoneRect = fix(s.add.rectangle(x0, y, 10, BAR_H, 0x639922).setOrigin(0, 0), 2);
    this.markerRect = fix(s.add.rectangle(x0, y - 2, 3, BAR_H + 4, 0xf6e7c1).setOrigin(0, 0), 3);
    this.pips = fix(makeText(s, cx, y + 22, '', 8, '#EF9F27'), 1);
    this.ui = [panel, title, back, this.zoneRect, this.markerRect, this.pips];

    const bonus = Math.min(14, (this.getLevel() - 1) * 1.5);
    this.zoneW = this.fish.zone + bonus;
    this.zoneRect.width = this.zoneW;
    this.speed = this.fish.speed;
    this.markerX = 0;
    this.dir = 1;
    this.placeZone();
    this.refreshPips();
  }

  placeZone() {
    this.zoneX = Phaser.Math.Between(20, BAR_W - 20 - this.zoneW);
    this.zoneRect.x = this.barX + this.zoneX;
  }

  refreshPips() {
    const done = '● '.repeat(this.hits).trim();
    const left = '○ '.repeat(this.fish.hits - this.hits).trim();
    this.pips.setText(`${done} ${left}`.trim());
  }

  update(delta, moveLen) {
    if (!this.active) return;
    const dt = delta / 1000;
    // redraw the line from the rod tip to the bobber
    const p = this.from();
    this.line.clear();
    this.line.lineStyle(1, 0xf6e7c1, 0.8);
    this.line.lineBetween(p.x, p.y - 6, this.target.x, this.target.y);

    if (this.state === 'wait') {
      this.bobber.y = this.target.y + Math.sin(this.scene.time.now / 250) * 0.8;
      if (moveLen > 0.5) { this.cancel('fish.cancel'); return; }
      this.timer -= delta;
      if (this.timer <= 0) {
        this.state = 'bite';
        this.timer = 900;
        this.mark.setText('!').setColor('#C4553F');
        playSfx(this.scene, 'sfx_water');
      }
    } else if (this.state === 'bite') {
      this.bobber.y = this.target.y + Math.sin(this.scene.time.now / 40) * 1.6;
      this.timer -= delta;
      if (this.timer <= 0) { this.reset(); this.onFail('fish.away'); }
    } else if (this.state === 'reel') {
      this.markerX += this.dir * this.speed * dt;
      if (this.markerX >= BAR_W - 3) { this.markerX = BAR_W - 3; this.dir = -1; }
      if (this.markerX <= 0) { this.markerX = 0; this.dir = 1; }
      this.markerRect.x = this.barX + this.markerX;
      this.bobber.y = this.target.y + Math.sin(this.scene.time.now / 60) * 1.2;
    }
    this.mark.setPosition(this.target.x, this.target.y - 12);
  }

  destroy() {
    this.reset();
    this.line.destroy();
    this.bobber.destroy();
    this.mark.destroy();
  }
}

export function fishName(id) {
  return ITEMS[id] ? ITEMS[id].name : id;
}
