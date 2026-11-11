import Phaser from 'phaser';
import { centerCamera } from '../systems/ui.js';
import { t } from '../i18n/index.js';
import { makeText, makeButton, addLangToggle, goTo } from '../systems/ui.js';
import { drawLogo } from '../systems/placeholderArt.js';
import { hasSave, deleteSave, loadSave } from '../systems/save.js';

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    centerCamera(this);
    this.leaving = false;
    this.confirm = null;
    this.cameras.main.setBackgroundColor('#2b1d12');
    this.cameras.main.fadeIn(200, 0, 0, 0);

    drawLogo(this);
    makeText(this, 240, 171, t('title.tagline'), 8, '#E0B878');
    addLangToggle(this, 428, 18);

    this.btnNew = makeButton(this, 240, 192, 150, 20, t('title.newGame'), () => this.onNew());
    this.btnContinue = makeButton(this, 240, 216, 150, 20, t('title.continue'), () => goTo(this, resumeScene()));
    this.btnContinue.setDisabled(!hasSave());
    this.btnSettings = makeButton(this, 240, 240, 150, 20, t('title.settings'), () =>
      goTo(this, 'Settings', { from: 'Title' })
    );
  }

  onNew() {
    if (this.confirm || this.leaving) return;
    if (hasSave()) this.showConfirm();
    else goTo(this, 'CharacterSelect');
  }

  showConfirm() {
    const parts = [];
    parts.push(this.add.rectangle(240, 135, 480, 270, 0x000000, 0.75).setDepth(10).setInteractive());
    parts.push(this.add.rectangle(240, 135, 360, 100, 0x3a2615).setStrokeStyle(2, 0xef9f27).setDepth(11));
    parts.push(
      makeText(this, 240, 112, t('title.confirmNew'), 8, '#F6E7C1', {
        align: 'center',
        wordWrap: { width: 330 },
        lineSpacing: 6
      }).setDepth(12)
    );
    parts.push(
      makeButton(this, 190, 158, 100, 20, t('common.yes'), () => {
        deleteSave();
        goTo(this, 'CharacterSelect');
      }, { depth: 12 })
    );
    parts.push(
      makeButton(this, 290, 158, 100, 20, t('common.no'), () => {
        parts.forEach((p) => p.destroy());
        this.confirm = null;
      }, { depth: 12 })
    );
    this.confirm = parts;
  }
}

// Continue resumes the map the player saved on.
function resumeScene() {
  const save = loadSave();
  const map = save && save.pos ? save.pos.map : null;
  return map === 'village' ? 'Village' : map === 'beach' ? 'Beach' : 'Farm';
}
