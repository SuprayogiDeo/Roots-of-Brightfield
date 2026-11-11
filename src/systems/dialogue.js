import { makeText } from './ui.js';
import { playSfx } from './audio.js';

// Dialogue box: portrait left, name tab above, text centre, choices on the right.
// All elements are camera-fixed (scrollFactor 0) and sit above the day-night overlay.
const BOX0 = { x: 8, y: 188, w: 464, h: 74 };
const D = 1400; // above the HUD and the night overlay

export default class Dialogue {
  constructor(scene) {
    this.scene = scene;
    const BOX = { ...BOX0, x: Math.round((scene.scale.width - BOX0.w) / 2) };
    this.open = false;
    this.lines = [];
    this.index = 0;

    const fix = (o, depth = D) => o.setScrollFactor(0).setDepth(depth);
    this.bg = fix(scene.add.rectangle(BOX.x, BOX.y, BOX.w, BOX.h, 0x2b1d12, 0.92)
      .setOrigin(0).setStrokeStyle(1, 0xef9f27));
    this.portraitBg = fix(scene.add.rectangle(BOX.x + 6, BOX.y + 6, 46, 46, 0x854f0b, 1)
      .setOrigin(0).setStrokeStyle(1, 0xba7517), D + 1);
    this.portrait = fix(scene.add.image(BOX.x + 29, BOX.y + 29, 'player', 0), D + 2).setScale(1.35);
    this.nameTab = fix(scene.add.rectangle(BOX.x + 56, BOX.y - 11, 120, 14, 0x854f0b, 1)
      .setOrigin(0).setStrokeStyle(1, 0xef9f27), D + 1);
    this.nameTxt = fix(makeText(scene, BOX.x + 62, BOX.y - 4, '', 8, '#F6E7C1', { origin: [0, 0.5] }), D + 2);
    this.bodyTxt = fix(makeText(scene, BOX.x + 60, BOX.y + 12, '', 8, '#F6E7C1', {
      origin: [0, 0], wordWrap: { width: 228 }, lineSpacing: 2
    }), D + 2);
    this.hintTxt = fix(makeText(scene, BOX.x + BOX.w - 8, BOX.y + BOX.h - 10, '', 8, '#EF9F27',
      { origin: [1, 1] }), D + 2);
    this.choiceTxts = [0, 1, 2].map((i) => {
      const txt = fix(makeText(scene, BOX.x + 310, BOX.y + 12 + i * 16, '', 8, '#EF9F27',
        { origin: [0, 0] }), D + 3);
      txt.setInteractive({ useHandCursor: true });
      txt.on('pointerup', () => this.choose(i));
      return txt;
    });

    this.bg.setInteractive({ useHandCursor: true });
    this.bg.on('pointerup', () => this.advance());

    this.parts = [this.bg, this.portraitBg, this.portrait, this.nameTab, this.nameTxt,
      this.bodyTxt, this.hintTxt, ...this.choiceTxts];
    this.setVisible(false);
  }

  setVisible(v) {
    this.parts.forEach((p) => p.setVisible(v));
  }

  isOpen() {
    return this.open;
  }

  // opts: { name, hearts, tint, lines[], choices[{label,value}], onChoice(value) }
  show(opts) {
    this.opts = opts;
    this.lines = opts.lines || [];
    this.index = 0;
    this.open = true;
    this.choicesShown = false;
    this.setVisible(true);
    this.choiceTxts.forEach((c) => c.setVisible(false));
    this.portrait.setTexture(opts.textureKey || 'player', opts.frame || 0);
    this.portrait.setTint(opts.tint || 0xffffff);
    const hearts = typeof opts.hearts === 'number' ? `  ${opts.hearts}/10` : '';
    this.nameTxt.setText(`${opts.name || ''}${hearts}`);
    this.nameTab.setSize(Math.max(80, this.nameTxt.width + 14), 14);
    this.render();
  }

  render() {
    this.bodyTxt.setText(this.lines[this.index] || '');
    const last = this.index >= this.lines.length - 1;
    const hasChoices = last && this.opts.choices && this.opts.choices.length > 0;
    this.hintTxt.setText(hasChoices ? '' : '▸');
    if (hasChoices && !this.choicesShown) {
      this.choicesShown = true;
      this.opts.choices.forEach((c, i) => {
        if (i > 2) return;
        this.choiceTxts[i].setText(`> ${c.label}`).setVisible(true);
      });
    }
  }

  // Returns true when the press was consumed by the dialogue.
  advance() {
    if (!this.open) return false;
    if (this.choicesShown) { this.choose(0); return true; } // A picks the first choice
    if (this.index < this.lines.length - 1) {
      this.index += 1;
      playSfx(this.scene, 'sfx_click');
      this.render();
      return true;
    }
    this.hide();
    return true;
  }

  choose(i) {
    if (!this.open || !this.choicesShown) return;
    const choice = this.opts.choices[i];
    if (!choice) return;
    playSfx(this.scene, 'sfx_click');
    const cb = this.opts.onChoice;
    this.hide();
    if (cb) cb(choice.value);
  }

  hide() {
    this.open = false;
    this.choicesShown = false;
    this.setVisible(false);
  }
}
