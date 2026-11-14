import Phaser from 'phaser';
import { t } from '../i18n/index.js';
import { centerCamera, makeText, makeButton, goTo } from '../systems/ui.js';
import { preloadAssets } from '../systems/assets.js';
import { loadSave, writeSave } from '../systems/save.js';
import { playSfx, SFX_KEYS } from '../systems/audio.js';
import { NPCS } from '../systems/npcs.js';
import { awardGame, rankLabel } from '../systems/festivals.js';

const RIVALS = ['rangga', 'ayu', 'mina'];

// Independence-Day mini-games (Step 5.2): Sack Race (tap fast) and Cracker Eating (tap on the green zone).
// Both end with a ranking, a prize, and back to the Village. Quitting early gives no prize and does not use up the try.
export default class FestivalGameScene extends Phaser.Scene {
  constructor() {
    super('FestGame');
  }

  init(data) {
    this.game_ = (data && data.game) || 'sack';
    this.fromKey = (data && data.from) || 'Village';
  }

  preload() {
    preloadAssets(this, ['player', ...SFX_KEYS]);
  }

  create() {
    centerCamera(this);
    this.leaving = false;
    this.phase = 'intro';
    const save = loadSave();
    if (!save) { this.scene.start('Title'); return; }
    this.save = save;
    this.cameras.main.setBackgroundColor('#3a2615');
    this.cameras.main.fadeIn(200, 0, 0, 0);

    if (!this.textures.exists('fest_dot')) {
      const g = this.make.graphics({ add: false });
      g.fillStyle(0xffffff, 1).fillRect(0, 0, 14, 20);
      g.generateTexture('fest_dot', 14, 20);
      g.destroy();
    }

    makeText(this, 240, 20, t(`game.${this.game_}.title`), 16, '#EF9F27').setDepth(5);
    this.quitBtn = makeButton(this, 44, 20, 72, 18, t('game.quit'), () => goTo(this, this.fromKey), { depth: 5 });
    this.hint = makeText(this, 240, 252, t(`game.${this.game_}.hint`), 8, '#F6E7C1').setDepth(5);
    this.big = makeText(this, 240, 135, '', 32, '#F6E7C1').setDepth(20);

    this.keys = this.input.keyboard.addKeys('SPACE,E,ENTER');
    this.input.on('pointerdown', (p, over) => { if (!over.length) this.tap(); });
    this.input.keyboard.on('keydown', (e) => { if (['Space', 'KeyE', 'Enter'].includes(e.code)) this.tap(); });

    if (this.game_ === 'sack') this.buildSack(); else this.buildKrupuk();
    this.countdown();
  }

  countdown() {
    const seq = ['3', '2', '1', t('game.go')];
    seq.forEach((s, i) => {
      this.time.delayedCall(500 + i * 750, () => {
        if (this.leaving) return;
        this.big.setText(s).setScale(1.4).setAlpha(1);
        this.tweens.add({ targets: this.big, scale: 1, alpha: i === 3 ? 0 : 1, duration: 450 });
        playSfx(this, 'sfx_click');
        if (i === 3) { this.phase = 'run'; this.startGame(); }
      });
    });
    this.time.delayedCall(500 + 3 * 750 + 500, () => this.big.setText(''));
  }

  tap() {
    if (this.phase !== 'run') return;
    if (this.game_ === 'sack') this.tapSack(); else this.tapKrupuk();
  }

  startGame() { if (this.game_ === 'krupuk') this.krupukRound(); }

  update(time, delta) {
    if (this.phase !== 'run') return;
    const dt = delta / 1000;
    if (this.game_ === 'sack') this.updateSack(dt); else this.updateKrupuk(dt);
  }

  // ------------------------------------------------------------------ Sack Race
  buildSack() {
    this.X0 = 90;
    this.X1 = 430;
    const names = [this.save.player.name || 'You', ...RIVALS.map((id) => NPCS[id].name)];
    this.racers = names.map((name, i) => {
      const y = 78 + i * 38;
      this.add.rectangle(240, y + 4, 420, 30, i % 2 ? 0x5a3a20 : 0x4d3019);
      makeText(this, 14, y - 2, name.slice(0, 8), 8, i === 0 ? '#EF9F27' : '#F6E7C1', { origin: [0, 0.5] }).setDepth(3);
      const real = this.textures.exists('player');
      const spr = this.add.sprite(this.X0, y, real ? 'player' : 'fest_dot', real ? 6 : 0).setDepth(4);
      if (i > 0) spr.setTint(NPCS[RIVALS[i - 1]].tint);
      const sack = this.add.rectangle(this.X0, y + 8, 12, 9, 0x9c7a4a).setStrokeStyle(1, 0x6a4a22).setDepth(5);
      return { name, base: y, spr, sack, p: 0, time: null, rate: [0, 0.112, 0.102, 0.092][i], wob: 1 };
    });
    // finish line
    for (let i = 0; i < 8; i++) this.add.rectangle(this.X1 + 14, 64 + i * 19, 6, 9.5, i % 2 ? 0xf6e7c1 : 0x2b1d12).setDepth(2);
    this.lastTap = 0;
    this.clock = 0;
    this.wobT = 0;
  }

  tapSack() {
    const me = this.racers[0];
    if (me.time !== null || this.time.now - this.lastTap < 70) return;
    this.lastTap = this.time.now;
    me.p = Math.min(1, me.p + 0.03);
    this.tweens.killTweensOf(me.spr);
    me.spr.y = me.base;
    this.tweens.add({ targets: me.spr, y: me.base - 6, duration: 70, yoyo: true });
    playSfx(this, 'sfx_plant');
    if (me.p >= 1) me.time = this.clock;
  }

  updateSack(dt) {
    this.clock += dt;
    this.wobT -= dt;
    this.racers.forEach((r, i) => {
      if (i > 0 && r.time === null) {
        if (this.wobT <= 0) r.wob = Phaser.Math.FloatBetween(0.75, 1.25);
        r.p = Math.min(1, r.p + r.rate * r.wob * dt);
        if (r.p >= 1) r.time = this.clock;
        // rivals hop with their own rhythm
        r.spr.y = r.base - Math.abs(Math.sin(this.clock * 9 + i * 2)) * 5;
      }
      const x = this.X0 + (this.X1 - this.X0) * r.p;
      r.spr.x = x;
      r.sack.setPosition(x, r.spr.y + 8);
    });
    if (this.wobT <= 0) this.wobT = 0.4;
    const me = this.racers[0];
    const allRivalsDone = this.racers.slice(1).every((r) => r.time !== null);
    if (me.time !== null || allRivalsDone) {
      const order = [...this.racers].sort((a, b) => {
        if (a.time !== null && b.time !== null) return a.time - b.time;
        if (a.time !== null) return -1;
        if (b.time !== null) return 1;
        return b.p - a.p;
      });
      this.finish(order.map((r) => ({ name: r.name, me: r === me })));
    }
  }

  // ------------------------------------------------------------------ Cracker Eating
  buildKrupuk() {
    this.ROUNDS = 6;
    this.hits = 0;
    this.round = 0;
    this.bites = [];
    this.rivals = RIVALS.map((id, i) => ({
      name: NPCS[id].name,
      score: Phaser.Math.Between([3, 2, 2][i], [5, 4, 4][i])
    }));
    this.add.rectangle(240, 60, 2, 50, 0x8a5a33); // string
    this.cracker = this.add.graphics().setDepth(2);
    this.drawCracker();
    this.scoreTxt = makeText(this, 240, 46, '', 8, '#F6E7C1').setDepth(6);
    // timing bar
    this.BX = 120;
    this.BW = 240;
    this.add.rectangle(240, 200, this.BW, 14, 0x2b1d12).setStrokeStyle(1, 0x854f0b);
    this.zone = this.add.rectangle(240, 200, 56, 14, 0x639922).setDepth(2);
    this.marker = this.add.rectangle(this.BX, 200, 4, 20, 0xef9f27).setDepth(3);
    this.mDir = 1;
    this.mSpeed = 130;
    this.mPos = 0;
    this.updateScore();
  }

  drawCracker() {
    const g = this.cracker;
    g.clear();
    g.fillStyle(0xe9d3a1, 1).fillEllipse(240, 120, 110, 60);
    g.lineStyle(1, 0xc9a96a, 1).strokeEllipse(240, 120, 110, 60);
    g.fillStyle(0xf6e7c1, 1).fillEllipse(228, 112, 40, 14);
    this.bites.forEach(([bx, by]) => g.fillStyle(0x3a2615, 1).fillCircle(bx, by, 11));
  }

  updateScore() {
    this.scoreTxt.setText(t('game.bites', { n: this.hits, total: this.ROUNDS }));
  }

  krupukRound() {
    this.zoneX = Phaser.Math.Between(this.BX + 40, this.BX + this.BW - 40);
    this.zone.x = this.zoneX;
    this.mPos = 0;
    this.mDir = 1;
    this.mSpeed = 130 + this.round * 22;
    this.waiting = false;
  }

  updateKrupuk(dt) {
    if (this.waiting) return;
    this.mPos += this.mDir * this.mSpeed * dt;
    if (this.mPos >= this.BW) { this.mPos = this.BW; this.mDir = -1; }
    if (this.mPos <= 0) { this.mPos = 0; this.mDir = 1; }
    this.marker.x = this.BX + this.mPos;
  }

  tapKrupuk() {
    if (this.waiting) return;
    this.waiting = true;
    const ok = Math.abs(this.marker.x - this.zoneX) <= 28 + 2;
    if (ok) {
      this.hits += 1;
      const a = Phaser.Math.FloatBetween(0, Math.PI * 2);
      this.bites.push([240 + Math.cos(a) * 48, 120 + Math.sin(a) * 25]);
      this.drawCracker();
      playSfx(this, 'sfx_harvest');
      this.tweens.add({ targets: this.cracker, y: 4, duration: 80, yoyo: true });
    } else {
      playSfx(this, 'sfx_deny');
      this.tweens.add({ targets: this.cracker, x: { from: -5, to: 0 }, duration: 160 });
    }
    this.updateScore();
    this.round += 1;
    this.time.delayedCall(450, () => {
      if (this.leaving || this.phase !== 'run') return;
      if (this.round >= this.ROUNDS) this.finishKrupuk();
      else this.krupukRound();
    });
  }

  finishKrupuk() {
    const all = [{ name: this.save.player.name || 'You', score: this.hits + 0.5, me: true }, // ties favour the player
      ...this.rivals.map((r) => ({ name: r.name, score: r.score, me: false }))];
    all.sort((a, b) => b.score - a.score);
    this.finish(all);
  }

  // ------------------------------------------------------------------ result
  finish(order) {
    if (this.phase === 'done') return;
    this.phase = 'done';
    this.quitBtn.destroy();
    const rank = order.findIndex((e) => e.me);
    const prize = awardGame(this.save, this.game_, rank);
    writeSave(this.save);
    playSfx(this, rank === 0 ? 'jingle_quest' : 'sfx_coins');

    this.add.rectangle(240, 135, 480, 270, 0x000000, 0.7).setDepth(30);
    this.add.rectangle(240, 135, 300, 190, 0x3a2615).setStrokeStyle(2, 0xef9f27).setDepth(31);
    makeText(this, 240, 58, t('game.result'), 16, '#EF9F27').setDepth(32);
    order.forEach((e, i) => {
      const row = makeText(this, 112, 88 + i * 20, `${rankLabel(i)}`, 8, e.me ? '#EF9F27' : '#F6E7C1', { origin: [0, 0.5] }).setDepth(32);
      makeText(this, 250, 88 + i * 20, (e.name || '').slice(0, 10), 8, e.me ? '#EF9F27' : '#F6E7C1', { origin: [0, 0.5] }).setDepth(32);
      row.setAlpha(1);
    });
    makeText(this, 240, 178, t('game.prize', { coins: prize.coins, xp: prize.xp }), 8, '#639922').setDepth(32);
    makeButton(this, 240, 208, 150, 20, t('game.back'), () => goTo(this, this.fromKey), { depth: 32 });
  }
}
