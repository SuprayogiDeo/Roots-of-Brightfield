import Phaser from 'phaser';
import { t } from '../i18n/index.js';
import { makeText } from './ui.js';
import { ITEMS } from './items.js';
import { playSfx } from './audio.js';
import RodPose from './fishingPose.js';
import { splash, ripple, fishJump } from './fishingFx.js';

// Simple fishing minigame (Step 4.1). One button (A) only:
//   1. CAST   - rod swings, the bobber flies in an arc and lands (splash) on the water tile in front.
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
const CAST_SWING = 180; // ms of rod swing before the bobber is thrown
const CAST_FLIGHT = 340; // ms the bobber is in the air
const WINDUP_DEG = -38; // back-swing angle of the rod

export default class FishingGame {
  constructor(scene, { onCatch, onFail, getLevel, player }) {
    this.scene = scene;
    this.player = player;
    this.pose = new RodPose(scene, player);
    this.kick = 0; // rod yank (degrees) added on each successful reel hit
    this.bobKick = 0; // bobber jerk (px)
    this.onCatch = onCatch;
    this.onFail = onFail;
    this.getLevel = getLevel || (() => 1);
    this.state = 'idle'; // idle | cast | wait | bite | reel
    this.timer = 0;
    this.line = scene.add.graphics().setDepth(DEPTH - 1);
    this.bobber = scene.add.circle(0, 0, 2.5, 0xc4553f).setStrokeStyle(1, 0xf6e7c1).setDepth(DEPTH - 1).setVisible(false);
    this.mark = makeText(scene, 0, 0, '', 8, '#EF9F27').setDepth(DEPTH).setVisible(false);
    this.ui = null;
  }

  get active() {
    return this.state !== 'idle';
  }

  // target = { x, y } world position of the water tile centre; facing = player's facing direction
  start(target, facing) {
    if (this.active) return;
    this.target = target;
    this.state = 'cast';
    this.t = 0;
    this.launch = null;
    this.kick = 0;
    this.bobKick = 0;
    this.pose.begin(facing, WINDUP_DEG);
    const tip = this.pose.tip();
    this.bobber.setPosition(tip.x, tip.y + 2).setVisible(true);
    this.mark.setVisible(false);
  }

  // The bobber hit the water: splash, then the wait for a bite begins.
  land() {
    this.state = 'wait';
    this.timer = Phaser.Math.Between(1500, 4500);
    this.rippleT = 900;
    this.bobber.setPosition(this.target.x, this.target.y);
    this.mark.setText('...').setColor('#F6E7C1').setScale(1).setPosition(this.target.x, this.target.y - 12).setVisible(true);
    splash(this.scene, this.target.x, this.target.y, 'big');
    playSfx(this.scene, 'sfx_splash');
    this.scene.hud.toast(t('fish.wait'), '#F6E7C1');
  }

  cancel(messageKey) {
    if (!this.active) return;
    this.reset();
    if (messageKey) this.onFail(messageKey);
  }

  reset(how = 'cancel') {
    this.state = 'idle';
    this.launch = null;
    this.bobber.setVisible(false);
    this.mark.setVisible(false);
    this.line.clear();
    if (this.ui) { this.ui.forEach((o) => o.destroy()); this.ui = null; }
    this.fish = null;
    this.pose.release(how === 'success');
  }

  // Returns true when the press was consumed by the minigame.
  pressA() {
    if (!this.active) return false;
    if (this.state === 'cast') {
      return true; // the line is still in the air
    } else if (this.state === 'wait') {
      splash(this.scene, this.target.x, this.target.y, 'small');
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
        splash(this.scene, this.target.x, this.target.y, 'small');
        this.reset('fail');
        this.onFail('fish.lost');
        return true;
      }
      this.hits += 1;
      playSfx(this.scene, 'sfx_plant');
      if (this.hits >= this.fish.hits) {
        const id = this.fish.id;
        const target = this.target;
        this.reset('success');
        // the fish leaps out of the water and drops into the bag
        if (this.onCatch(id) !== false) fishJump(this.scene, id, target, () => ({ x: this.player.x, y: this.player.y - 4 }));
      } else {
        this.yank();
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

  // A reel hit: the rod snaps back, the bobber jerks and a little water flies.
  yank() {
    this.kick = -16;
    this.bobKick = -4;
    this.scene.tweens.add({ targets: this, kick: 0, bobKick: 0, duration: 260, ease: 'Back.easeOut' });
    splash(this.scene, this.target.x, this.target.y, 'small');
  }

  // Line from the rod tip to the bobber, sagging by `sag` px in the middle.
  drawLine(a, b, sag) {
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2 + sag;
    this.line.clear();
    this.line.lineStyle(1, 0xf6e7c1, 0.85);
    this.line.beginPath();
    this.line.moveTo(a.x, a.y);
    for (let i = 1; i <= 10; i++) {
      const k = i / 10;
      const u = 1 - k;
      this.line.lineTo(u * u * a.x + 2 * u * k * mx + k * k * b.x, u * u * a.y + 2 * u * k * my + k * k * b.y);
    }
    this.line.strokePath();
  }

  update(delta, moveLen) {
    this.pose.update();
    if (!this.active) return;
    const dt = delta / 1000;
    const now = this.scene.time.now;
    const tg = this.target;
    let sag = 4;

    if (this.state === 'cast') {
      this.t += delta;
      if (this.t < CAST_SWING) {
        // back-swing -> forward whip; the bobber hangs from the tip
        const k = this.t / CAST_SWING;
        this.pose.offset = Phaser.Math.Linear(WINDUP_DEG, 6, k * k);
        const tip = this.pose.tip();
        this.bobber.setPosition(tip.x, tip.y + 2);
        sag = 0;
      } else {
        if (!this.launch) {
          const tip = this.pose.tip();
          this.launch = { x: tip.x, y: tip.y };
          playSfx(this.scene, 'sfx_click');
        }
        const k = Math.min(1, (this.t - CAST_SWING) / CAST_FLIGHT);
        const arcH = Math.max(10, Phaser.Math.Distance.Between(this.launch.x, this.launch.y, tg.x, tg.y) * 0.4);
        this.pose.offset = Phaser.Math.Linear(6, 0, k);
        this.bobber.setPosition(
          Phaser.Math.Linear(this.launch.x, tg.x, k),
          Phaser.Math.Linear(this.launch.y, tg.y, k) - Math.sin(Math.PI * k) * arcH
        );
        sag = 2;
        if (k >= 1) this.land();
      }
    } else if (this.state === 'wait') {
      this.pose.offset = 0;
      this.bobber.setPosition(tg.x + Math.sin(now / 700) * 0.5, tg.y + Math.sin(now / 250) * 0.8);
      sag = 4 + Math.sin(now / 900);
      this.rippleT -= delta;
      if (this.rippleT <= 0) { ripple(this.scene, tg.x, tg.y, 0.6); this.rippleT = 1500; }
      if (moveLen > 0.5) { this.cancel('fish.cancel'); return; }
      this.timer -= delta;
      if (this.timer <= 0) {
        this.state = 'bite';
        this.timer = 900;
        this.mark.setText('!').setColor('#C4553F').setScale(1);
        splash(this.scene, tg.x, tg.y, 'small');
        playSfx(this.scene, 'sfx_water');
      }
    } else if (this.state === 'bite') {
      this.pose.offset = 4 + Math.sin(now / 45) * 3; // the rod trembles
      this.bobber.setPosition(tg.x, tg.y + 1.5 + Math.sin(now / 40) * 1.6);
      sag = 1.5;
      this.timer -= delta;
      if (this.timer <= 0) {
        ripple(this.scene, tg.x, tg.y, 0.8);
        this.reset('fail');
        this.onFail('fish.away');
        return;
      }
    } else if (this.state === 'reel') {
      this.markerX += this.dir * this.speed * dt;
      if (this.markerX >= BAR_W - 3) { this.markerX = BAR_W - 3; this.dir = -1; }
      if (this.markerX <= 0) { this.markerX = 0; this.dir = 1; }
      this.markerRect.x = this.barX + this.markerX;
      this.pose.offset = 3 + Math.sin(now / 70) * 2 + this.kick;
      this.bobber.setPosition(tg.x, tg.y + Math.sin(now / 60) * 1.2 + this.bobKick);
      sag = 0.5;
    }

    this.drawLine(this.pose.tip(), { x: this.bobber.x, y: this.bobber.y }, sag);
    if (this.state === 'wait' || this.state === 'bite') {
      // the "!" bounces when a fish bites
      const hop = this.state === 'bite' ? Math.abs(Math.sin(now / 110)) : 0;
      this.mark.setPosition(tg.x, tg.y - 12 - hop * 6).setScale(1 + hop * 0.25);
    }
  }

  destroy() {
    if (this.ui) { this.ui.forEach((o) => o.destroy()); this.ui = null; }
    this.pose.destroy();
    this.line.destroy();
    this.bobber.destroy();
    this.mark.destroy();
  }
}

export function fishName(id) {
  return ITEMS[id] ? ITEMS[id].name : id;
}
