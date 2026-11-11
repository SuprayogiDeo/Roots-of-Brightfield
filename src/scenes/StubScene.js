import Phaser from 'phaser';
import { centerCamera } from '../systems/ui.js';
import { t } from '../i18n/index.js';
import { makeText, makeButton, goTo } from '../systems/ui.js';
import { drawPlayer } from '../systems/placeholderArt.js';
import { loadSave } from '../systems/save.js';

// Temporary end point. Replaced by the real Farm scene in the next steps.
export default class StubScene extends Phaser.Scene {
  constructor() {
    super('Stub');
  }

  create() {
    centerCamera(this);
    this.leaving = false;
    const save = loadSave();
    if (!save) {
      this.scene.start('Title');
      return;
    }
    this.cameras.main.setBackgroundColor('#2b1d12');
    this.cameras.main.fadeIn(200, 0, 0, 0);

    drawPlayer(this, 240, 84, save.player.gender, 5);
    makeText(this, 240, 158, t('stub.welcome', { name: save.player.name }), 16, '#EF9F27', {
      align: 'center',
      wordWrap: { width: 440, useAdvancedWrap: true }
    });
    makeText(this, 240, 196, t('stub.note'), 8, '#F6E7C1');
    makeButton(this, 240, 238, 140, 20, t('common.back'), () => goTo(this, 'Title'));
  }
}
