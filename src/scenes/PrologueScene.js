import Phaser from 'phaser';
import { centerCamera } from '../systems/ui.js';
import { t } from '../i18n/index.js';
import { makeText, makeButton, goTo } from '../systems/ui.js';
import { loadSave, writeSave } from '../systems/save.js';

const CARD_COUNT = 7;

export default class PrologueScene extends Phaser.Scene {
  constructor() {
    super('Prologue');
  }

  create() {
    centerCamera(this);
    this.leaving = false;
    this.cameras.main.setBackgroundColor('#14100c');
    this.cameras.main.fadeIn(400, 0, 0, 0);

    // light rain
    this.rain = this.add.graphics();
    this.drops = Array.from({ length: 50 }, () => ({
      x: Math.random() * 480,
      y: Math.random() * 270,
      v: 2 + Math.random() * 2
    }));

    this.cards = [];
    for (let i = 1; i <= CARD_COUNT; i++) this.cards.push(t(`prologue.${i}`));
    this.index = -1;
    this.timer = null;

    this.text = makeText(this, 240, 128, '', 16, '#F6E7C1', {
      align: 'center',
      lineSpacing: 8,
      wordWrap: { width: 400, useAdvancedWrap: true }
    }).setAlpha(0);

    makeText(this, 22, 248, t('prologue.tap'), 8, '#7a5a3a', { origin: [0, 0.5] });
    makeButton(this, 420, 247, 76, 18, t('common.skip'), () => this.finish());

    // Tap anywhere (not on a button) or press Space/E/Enter = next card; Esc = skip
    this.input.on('pointerdown', (pointer, over) => {
      if (over.length === 0) this.advance();
    });
    ['SPACE', 'E', 'ENTER'].forEach((k) => this.input.keyboard.on(`keydown-${k}`, () => this.advance()));
    this.input.keyboard.on('keydown-ESC', () => this.finish());

    this.showNext();
  }

  showNext() {
    this.index++;
    if (this.index >= this.cards.length) {
      this.finish();
      return;
    }
    const s = this.cards[this.index];
    this.text.setText(s);
    this.tweens.killTweensOf(this.text);
    this.text.setAlpha(0);
    this.tweens.add({ targets: this.text, alpha: 1, duration: 400 });
    if (this.timer) this.timer.remove();
    this.timer = this.time.delayedCall(1500 + s.length * 30, () => this.showNext());
  }

  advance() {
    if (this.leaving) return;
    if (this.timer) this.timer.remove();
    this.showNext();
  }

  finish() {
    if (this.leaving) return;
    const save = loadSave();
    if (save) {
      save.flags = { ...save.flags, prologueSeen: true };
      writeSave(save);
    }
    goTo(this, 'Farm');
  }

  update() {
    const g = this.rain;
    g.clear();
    g.fillStyle(0x6d8fa8, 0.5);
    for (const d of this.drops) {
      g.fillRect(Math.round(d.x), Math.round(d.y), 1, 4);
      d.y += d.v;
      if (d.y > 270) {
        d.y = -4;
        d.x = Math.random() * 480;
      }
    }
  }
}
