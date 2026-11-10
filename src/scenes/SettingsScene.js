import Phaser from 'phaser';
import { t } from '../i18n/index.js';
import { makeText, makeButton, addLangToggle, goTo } from '../systems/ui.js';
import { warmEnabled, setWarm } from '../systems/assets.js';
import { sfxEnabled, setSfx, playSfx } from '../systems/audio.js';

export default class SettingsScene extends Phaser.Scene {
  constructor() {
    super('Settings');
  }

  init(data) {
    this.fromKey = (data && data.from) || 'Title';
    this.menuFrom = (data && data.menuFrom) || null;
  }

  create() {
    this.leaving = false;
    this.cameras.main.setBackgroundColor('#2b1d12');
    this.cameras.main.fadeIn(200, 0, 0, 0);

    makeText(this, 240, 36, t('settings.title'), 16, '#EF9F27');

    // Language row
    makeText(this, 40, 90, t('settings.language'), 8, '#F6E7C1', { origin: [0, 0.5] });
    addLangToggle(this, 380, 90);

    // Fullscreen row (Android browsers; not available on iOS Safari)
    makeText(this, 40, 130, t('settings.fullscreen'), 8, '#F6E7C1', { origin: [0, 0.5] });
    const fsOk = !!this.game.device.fullscreen.available;
    const label = () =>
      !fsOk ? t('settings.na') : this.scale.isFullscreen ? t('settings.on') : t('settings.off');
    const btn = makeButton(this, 380, 130, 90, 18, label(), () => {
      if (!fsOk) return;
      if (this.scale.isFullscreen) this.scale.stopFullscreen();
      else this.scale.startFullscreen();
    });
    btn.setDisabled(!fsOk);
    const refresh = () => btn.setLabel(label());
    this.scale.on('enterfullscreen', refresh);
    this.scale.on('leavefullscreen', refresh);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('enterfullscreen', refresh);
      this.scale.off('leavefullscreen', refresh);
    });

    // Warm tint row (fixes over-bright pastel palettes)
    makeText(this, 40, 170, t('settings.warm'), 8, '#F6E7C1', { origin: [0, 0.5] });
    const warmBtn = makeButton(this, 380, 170, 90, 18,
      warmEnabled() ? t('settings.on') : t('settings.off'),
      () => {
        setWarm(!warmEnabled());
        warmBtn.setLabel(warmEnabled() ? t('settings.on') : t('settings.off'));
      }
    );

    // Sound row (SFX + jingles)
    makeText(this, 40, 206, t('settings.sound'), 8, '#F6E7C1', { origin: [0, 0.5] });
    const sndBtn = makeButton(this, 380, 206, 90, 18,
      sfxEnabled() ? t('settings.on') : t('settings.off'),
      () => {
        setSfx(!sfxEnabled());
        sndBtn.setLabel(sfxEnabled() ? t('settings.on') : t('settings.off'));
        playSfx(this, 'sfx_click');
      }
    );

    makeButton(this, 62, 246, 80, 18, t('common.back'), () => goTo(this, this.fromKey, this.menuFrom ? { from: this.menuFrom, tab: 'bag' } : undefined));
  }
}
