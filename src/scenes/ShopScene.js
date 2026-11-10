import Phaser from 'phaser';
import { t } from '../i18n/index.js';
import { makeText, makeButton, goTo } from '../systems/ui.js';
import { preloadAssets } from '../systems/assets.js';
import { loadSave, writeSave } from '../systems/save.js';
import { ITEMS, addItem, createItemIcons, countItem, nextBagUpgrade, upgradeBag } from '../systems/items.js';
import { ANIMALS, newAnimal } from '../systems/animals.js';
import { playSfx, SFX_KEYS } from '../systems/audio.js';

// Item rows (cost in ITEMS) and animal rows (price in ANIMALS).
const GOODS = ['carrot_seeds', 'corn_seeds', 'chili_seeds', 'tomato_seeds', 'animal_feed'];
const ANIMAL_ROWS = ['chicken', 'cow'];
const ROW0 = 48;
const ROW_H = 20;

// Mina's Seed Shop: buy seeds, feed and animals; sell everything harvested.
export default class ShopScene extends Phaser.Scene {
  constructor() {
    super('Shop');
  }

  init(data) {
    this.fromKey = (data && data.from) || 'Village';
  }

  preload() {
    preloadAssets(this, [...SFX_KEYS, 'animal_chicken', 'animal_cow']);
  }

  create() {
    const save = loadSave();
    if (!save) { this.scene.start('Title'); return; }
    this.save = save;
    createItemIcons(this);

    this.cameras.main.setBackgroundColor('#2b1d12');
    this.cameras.main.fadeIn(200, 0, 0, 0);
    makeText(this, 240, 22, t('shop.title'), 16, '#EF9F27');
    this.coinsTxt = makeText(this, 460, 22, '', 8, '#F6E7C1', { origin: [1, 0.5] });
    this.owned = {};

    GOODS.forEach((id, i) => {
      const y = ROW0 + i * ROW_H;
      const def = ITEMS[id];
      this.add.image(40, y, `item_${id}`).setScale(1.25);
      makeText(this, 58, y, def.name, 8, '#F6E7C1', { origin: [0, 0.5] });
      makeText(this, 240, y, `${def.cost}g`, 8, '#EF9F27', { origin: [0, 0.5] });
      this.owned[id] = makeText(this, 300, y, '', 8, '#9aa0a6', { origin: [0, 0.5] });
      makeButton(this, 400, y, 80, 18, t('shop.buy'), () => this.buy(id));
    });

    ANIMAL_ROWS.forEach((type, i) => {
      const y = ROW0 + (GOODS.length + i) * ROW_H;
      const def = ANIMALS[type];
      this.add.image(40, y - 2, def.sheet, 0).setScale(0.75);
      makeText(this, 58, y, def.name, 8, '#F6E7C1', { origin: [0, 0.5] });
      makeText(this, 240, y, `${def.price}g`, 8, '#EF9F27', { origin: [0, 0.5] });
      this.owned[type] = makeText(this, 300, y, '', 8, '#9aa0a6', { origin: [0, 0.5] });
      makeButton(this, 400, y, 80, 18, t('shop.buy'), () => this.buyAnimal(type));
    });

    // Backpack upgrade row (18 -> 24 -> 30 -> 36 slots)
    const by = ROW0 + (GOODS.length + ANIMAL_ROWS.length) * ROW_H;
    this.add.image(40, by, 'item_backpack').setScale(1.25);
    makeText(this, 58, by, ITEMS.backpack.name, 8, '#F6E7C1', { origin: [0, 0.5] });
    this.bagPrice = makeText(this, 240, by, '', 8, '#EF9F27', { origin: [0, 0.5] });
    this.bagSlots = makeText(this, 300, by, '', 8, '#9aa0a6', { origin: [0, 0.5] });
    this.bagBtn = makeButton(this, 400, by, 80, 18, t('shop.buy'), () => this.buyBag());

    this.sellBtn = makeButton(this, 240, 210, 200, 20, t('shop.sellAll'), () => this.sellAll());
    this.sellInfo = makeText(this, 240, 230, '', 8, '#F6E7C1');

    makeButton(this, 62, 250, 80, 18, t('common.back'), () => {
      writeSave(this.save);
      goTo(this, this.fromKey);
    });

    this.refresh();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => writeSave(this.save));
  }

  animalCount(type) {
    return this.save.animals.filter((a) => a.type === type).length;
  }

  sellValue() {
    return this.save.inventory.slots.reduce((sum, s) => {
      const def = s && ITEMS[s.id];
      return sum + (def && def.price ? def.price * s.qty : 0);
    }, 0);
  }

  refresh() {
    this.coinsTxt.setText(t('shop.coins', { coins: this.save.coins }));
    GOODS.forEach((id) => this.owned[id].setText(`x${countItem(this.save.inventory, id)}`));
    ANIMAL_ROWS.forEach((type) => this.owned[type].setText(`${this.animalCount(type)}/${ANIMALS[type].max}`));
    const up = nextBagUpgrade(this.save.inventory);
    this.bagSlots.setText(`${this.save.inventory.slots.length}`);
    this.bagPrice.setText(up ? `${up.cost}g` : '');
    this.bagBtn.setLabel(up ? t('shop.buy') : t('shop.max'));
    this.bagBtn.setDisabled(!up);
    const value = this.sellValue();
    this.sellInfo.setText(value > 0 ? t('shop.sellValue', { coins: value }) : t('shop.nothing'));
    this.sellBtn.setDisabled(value <= 0);
  }

  buy(id) {
    const cost = ITEMS[id].cost;
    if (this.save.coins < cost) {
      playSfx(this, 'sfx_deny');
      this.sellInfo.setText(t('shop.noCoins'));
      return;
    }
    if (addItem(this.save.inventory, id, 1) > 0) {
      playSfx(this, 'sfx_deny');
      this.sellInfo.setText(t('msg.bagFull'));
      return;
    }
    this.save.coins -= cost;
    playSfx(this, 'sfx_coins');
    writeSave(this.save);
    this.refresh();
  }

  buyAnimal(type) {
    const def = ANIMALS[type];
    if (this.animalCount(type) >= def.max) {
      playSfx(this, 'sfx_deny');
      this.sellInfo.setText(t('shop.pastureFull'));
      return;
    }
    if (this.save.coins < def.price) {
      playSfx(this, 'sfx_deny');
      this.sellInfo.setText(t('shop.noCoins'));
      return;
    }
    this.save.coins -= def.price;
    this.save.animals.push(newAnimal(type));
    playSfx(this, 'sfx_coins');
    writeSave(this.save);
    this.refresh();
    this.sellInfo.setText(t('shop.animalBought', { name: def.name }));
  }

  buyBag() {
    const up = nextBagUpgrade(this.save.inventory);
    if (!up) return;
    if (this.save.coins < up.cost) {
      playSfx(this, 'sfx_deny');
      this.sellInfo.setText(t('shop.noCoins'));
      return;
    }
    this.save.coins -= up.cost;
    upgradeBag(this.save.inventory, up.size);
    playSfx(this, 'sfx_coins');
    writeSave(this.save);
    this.refresh();
    this.sellInfo.setText(t('shop.bagUpgraded', { size: up.size }));
  }

  sellAll() {
    const inv = this.save.inventory;
    let coins = 0;
    inv.slots.forEach((s, i) => {
      const def = s && ITEMS[s.id];
      if (!def || !def.price) return;
      coins += def.price * s.qty;
      inv.slots[i] = null;
    });
    if (!coins) { playSfx(this, 'sfx_deny'); return; }
    this.save.coins += coins;
    playSfx(this, 'sfx_coins');
    writeSave(this.save);
    this.refresh();
  }
}
