import Phaser from 'phaser';
import { t } from '../i18n/index.js';
import { makeText, makeButton, goTo } from '../systems/ui.js';
import { drawPlayer } from '../systems/placeholderArt.js';
import { newSave, writeSave } from '../systems/save.js';

const GAME_W = 480;
// Name field position in internal game pixels (480x270). Kept in the upper half
// so the phone keyboard does not cover it.
const NAME_BOX = { x: 188, y: 62, w: 156, h: 20 };
const CARD_X = { male: 172, female: 308 };

export default class CharacterSelectScene extends Phaser.Scene {
  constructor() {
    super('CharacterSelect');
  }

  create() {
    this.leaving = false;
    this.gender = 'male';
    this.entries = {};
    this.cameras.main.setBackgroundColor('#2b1d12');
    this.cameras.main.fadeIn(200, 0, 0, 0);

    makeButton(this, 58, 22, 72, 18, t('common.back'), () => goTo(this, 'Title'));
    makeText(this, 240, 46, t('char.title'), 16, '#EF9F27');
    makeText(this, 180, 72, t('char.name'), 8, '#F6E7C1', { origin: [1, 0.5] });
    this.createNameInput();

    this.toast = makeText(this, 240, 90, t('char.needName'), 8, '#E8745A').setAlpha(0);

    ['male', 'female'].forEach((g) => {
      const x = CARD_X[g];
      const card = this.add
        .rectangle(x, 152, 104, 112, 0x3a2615)
        .setStrokeStyle(2, 0x854f0b)
        .setInteractive({ useHandCursor: true });
      card.on('pointerup', () => this.select(g));
      const fig = drawPlayer(this, x, 140, g, 5);
      makeText(this, x, 192, t(`char.${g}`), 8, '#F6E7C1');
      this.entries[g] = { card, fig, baseY: fig.y };
    });

    makeButton(this, 96, 152, 24, 32, '<', () => this.toggle());
    makeButton(this, 384, 152, 24, 32, '>', () => this.toggle());
    makeButton(this, 240, 232, 140, 22, t('char.start'), () => this.onStart());

    this.select('male');

    // Tapping the canvas closes the keyboard
    this.input.on('pointerdown', () => {
      if (document.activeElement === this.nameEl) this.nameEl.blur();
    });
  }

  toggle() {
    this.select(this.gender === 'male' ? 'female' : 'male');
  }

  select(g) {
    this.gender = g;
    Object.entries(this.entries).forEach(([key, e]) => {
      const on = key === g;
      e.card.setStrokeStyle(2, on ? 0xef9f27 : 0x854f0b);
      e.card.setFillStyle(on ? 0x5a3a1e : 0x3a2615);
      this.tweens.killTweensOf(e.fig);
      e.fig.y = e.baseY;
      if (on) {
        this.tweens.add({
          targets: e.fig,
          y: e.baseY - 4,
          duration: 450,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
      }
    });
  }

  // HTML overlay input (the only place where text selection / keyboard is used)
  createNameInput() {
    const el = document.createElement('input');
    el.type = 'text';
    el.className = 'name-input allow-select';
    el.maxLength = 12;
    el.placeholder = t('char.namePlaceholder');
    el.setAttribute('autocomplete', 'off');
    el.setAttribute('autocapitalize', 'words');
    el.setAttribute('autocorrect', 'off');
    el.setAttribute('spellcheck', 'false');
    el.setAttribute('enterkeyhint', 'done');
    el.setAttribute('aria-label', t('char.name'));
    // ASCII only: the pixel font has no other glyphs
    el.addEventListener('input', () => {
      el.value = el.value.replace(/[^A-Za-z0-9 '\-]/g, '');
    });
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        el.blur();
      }
    });
    document.body.appendChild(el);
    this.nameEl = el;

    this.placeInput = () => {
      if (!this.nameEl) return;
      const r = this.game.canvas.getBoundingClientRect();
      const k = r.width / GAME_W;
      Object.assign(this.nameEl.style, {
        left: `${r.left + NAME_BOX.x * k}px`,
        top: `${r.top + NAME_BOX.y * k}px`,
        width: `${NAME_BOX.w * k}px`,
        height: `${NAME_BOX.h * k}px`,
        fontSize: `${8 * k}px`,
        borderWidth: `${Math.max(1, Math.round(k * 0.7))}px`
      });
    };
    this.placeInput();
    this.time.delayedCall(120, this.placeInput);
    window.addEventListener('resize', this.placeInput);
    this.scale.on('resize', this.placeInput);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('resize', this.placeInput);
      this.scale.off('resize', this.placeInput);
      if (this.nameEl) this.nameEl.remove();
      this.nameEl = null;
    });
  }

  onStart() {
    if (this.leaving) return;
    const name = this.nameEl.value.trim().replace(/\s+/g, ' ');
    if (!name) {
      this.tweens.killTweensOf(this.toast);
      this.toast.setAlpha(1);
      this.tweens.add({ targets: this.toast, alpha: 0, delay: 1200, duration: 300 });
      this.nameEl.classList.remove('shake');
      void this.nameEl.offsetWidth; // restart CSS animation
      this.nameEl.classList.add('shake');
      return;
    }
    this.nameEl.blur();
    writeSave(newSave({ name, gender: this.gender }));
    goTo(this, 'Prologue');
  }
}
