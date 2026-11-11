import Phaser from 'phaser';
import { t } from '../i18n/index.js';
import { makeText, makeButton, goTo, centerCamera } from '../systems/ui.js';
import { preloadAssets } from '../systems/assets.js';
import { loadSave, writeSave } from '../systems/save.js';
import { ITEMS, addItem, createItemIcons, countItem } from '../systems/items.js';
import { playSfx, SFX_KEYS } from '../systems/audio.js';
import { RECIPES, PANTRY, canCraft, craft } from '../systems/crafting.js';
import { addXp, XP_GAIN } from '../systems/xp.js';

const REC_Y0 = 58;
const REC_H = 38;
const PANTRY_Y0 = 192;

// The Kitchen: cook Nusantara dishes from crops, eggs and pantry goods.
export default class CraftScene extends Phaser.Scene {
  constructor() {
    super('Craft');
  }

  init(data) {
    this.fromKey = (data && data.from) || 'Farm';
  }

  preload() {
    preloadAssets(this, [...SFX_KEYS]);
  }

  create() {
    centerCamera(this);
    this.leaving = false;
    const save = loadSave();
    if (!save) { this.scene.start('Title'); return; }
    this.save = save;
    createItemIcons(this);

    this.cameras.main.setBackgroundColor('#2b1d12');
    this.cameras.main.fadeIn(200, 0, 0, 0);
    makeText(this, 240, 22, t('kitchen.title'), 16, '#EF9F27');
    this.coinsTxt = makeText(this, 460, 22, '', 8, '#F6E7C1', { origin: [1, 0.5] });

    // ---- recipes ----
    this.recRows = RECIPES.map((r, i) => {
      const y = REC_Y0 + i * REC_H;
      const out = ITEMS[r.out];
      this.add.rectangle(240, y, 452, 34, 0x3a2a1c).setStrokeStyle(1, 0x854f0b);
      this.add.image(34, y, `item_${r.out}`).setScale(1.5);
      makeText(this, 54, y - 9, out.name, 8, '#F6E7C1', { origin: [0, 0.5] });
      makeText(this, 318, y, `${out.price}g`, 8, '#EF9F27', { origin: [0, 0.5] });
      const chips = Object.entries(r.needs).map(([id, need], k) => {
        const x = 58 + k * 82;
        this.add.image(x, y + 8, `item_${id}`);
        return { id, need, txt: makeText(this, x + 10, y + 8, '', 8, '#F6E7C1', { origin: [0, 0.5] }) };
      });
      const btn = makeButton(this, 410, y, 84, 20, t('kitchen.cook'), () => this.cook(r));
      return { r, chips, btn };
    });

    // ---- pantry ----
    makeText(this, 30, PANTRY_Y0 - 20, t('kitchen.pantry'), 8, '#9aa0a6', { origin: [0, 0.5] });
    this.owned = {};
    PANTRY.forEach((id, i) => {
      const y = PANTRY_Y0 + i * 20;
      const def = ITEMS[id];
      this.add.image(40, y, `item_${id}`).setScale(1.25);
      makeText(this, 58, y, def.name, 8, '#F6E7C1', { origin: [0, 0.5] });
      makeText(this, 240, y, `${def.cost}g`, 8, '#EF9F27', { origin: [0, 0.5] });
      this.owned[id] = makeText(this, 300, y, '', 8, '#9aa0a6', { origin: [0, 0.5] });
      makeButton(this, 400, y, 80, 18, t('shop.buy'), () => this.buy(id));
    });

    this.msg = makeText(this, 240, 234, '', 8, '#F6E7C1');
    makeButton(this, 62, 252, 80, 18, t('common.back'), () => {
      writeSave(this.save);
      goTo(this, this.fromKey);
    });

    this.refresh();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => writeSave(this.save));
  }

  say(text, color = '#F6E7C1') {
    this.msg.setText(text).setColor(color);
  }

  refresh() {
    const inv = this.save.inventory;
    this.coinsTxt.setText(t('shop.coins', { coins: this.save.coins }));
    this.recRows.forEach((row) => {
      row.chips.forEach((c) => {
        const have = countItem(inv, c.id);
        c.txt.setText(`${have}/${c.need}`).setColor(have >= c.need ? '#8fd16a' : '#e0705a');
      });
      row.btn.setDisabled(!canCraft(inv, row.r));
    });
    PANTRY.forEach((id) => this.owned[id].setText(`x${countItem(inv, id)}`));
  }

  cook(r) {
    const res = craft(this.save.inventory, r);
    if (res === 'missing') {
      playSfx(this, 'sfx_deny');
      this.say(t('kitchen.missing'), '#e0705a');
    } else if (res === 'full') {
      playSfx(this, 'sfx_deny');
      this.say(t('msg.bagFull'), '#e0705a');
    } else {
      playSfx(this, 'sfx_water');
      this.time.delayedCall(250, () => playSfx(this, 'sfx_harvest'));
      const lv = addXp(this.save, XP_GAIN.cook);
      let text = t('kitchen.cooked', { item: ITEMS[r.out].name });
      if (lv.leveled) {
        text += ` ${t('level.up', { level: lv.level })}`;
        this.time.delayedCall(500, () => playSfx(this, 'jingle_quest'));
      }
      this.say(text, '#8fd16a');
      writeSave(this.save);
    }
    this.refresh();
  }

  buy(id) {
    const def = ITEMS[id];
    if (this.save.coins < def.cost) {
      playSfx(this, 'sfx_deny');
      this.say(t('shop.noCoins'), '#e0705a');
      return;
    }
    if (addItem(this.save.inventory, id, 1) > 0) {
      playSfx(this, 'sfx_deny');
      this.say(t('msg.bagFull'), '#e0705a');
      return;
    }
    this.save.coins -= def.cost;
    playSfx(this, 'sfx_coins');
    this.say(t('kitchen.bought', { item: def.name }));
    writeSave(this.save);
    this.refresh();
  }
}
