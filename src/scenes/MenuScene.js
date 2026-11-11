import Phaser from 'phaser';
import { centerCamera } from '../systems/ui.js';
import { t } from '../i18n/index.js';
import { makeText, makeButton, goTo } from '../systems/ui.js';
import { loadSave, writeSave } from '../systems/save.js';
import { ITEMS, createItemIcons, STACK_MAX } from '../systems/items.js';
import { CROPS } from '../systems/crops.js';
import { xpNeeded, MAX_LEVEL } from '../systems/xp.js';
import { buildQuestLog } from './questLog.js';
import { preloadAssets } from '../systems/assets.js';
import { playSfx, SFX_KEYS } from '../systems/audio.js';

const TABS = ['bag', 'skills', 'quests', 'map', 'settings'];
const COLS = 6;
const S = 24; // slot size
const G = 3; // gap
const GX = 92;
const GY = 40;
const TOOLS = ['hoe', 'watering_can', 'axe', 'pickaxe', 'fishing_rod'];

// Pause menu. The Bag tab = full backpack grid: tap to select, drag (or Move button) to rearrange.
export default class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  init(data) {
    this.fromKey = (data && data.from) || 'Farm';
    this.tab = (data && data.tab) || 'bag';
  }

  preload() {
    preloadAssets(this, SFX_KEYS);
  }

  create() {
    centerCamera(this);
    this.leaving = false;
    const save = loadSave();
    if (!save) { this.scene.start('Title'); return; }
    this.save = save;
    createItemIcons(this);
    this.cameras.main.setBackgroundColor('#2b1d12');
    this.cameras.main.fadeIn(150, 0, 0, 0);

    this.tabBtns = TABS.map((id, i) => makeButton(this, 44, 44 + i * 28, 72, 22, t(`tab.${id}`), () => {
      playSfx(this, 'sfx_click');
      this.showTab(id);
    }));
    makeButton(this, 44, 250, 72, 18, t('common.back'), () => this.close());

    this.onKey = (e) => { if (e.key === 'Escape') this.close(); };
    this.input.keyboard.on('keydown', this.onKey);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.clearTab();
      this.input.keyboard.off('keydown', this.onKey);
      writeSave(this.save);
    });
    this.showTab(this.tab);
  }

  close() {
    writeSave(this.save);
    goTo(this, this.fromKey);
  }

  // ---------------- tabs ----------------
  keep(o) {
    this.content.push(o);
    return o;
  }

  clearTab() {
    (this.content || []).forEach((o) => o.destroy());
    this.content = [];
    if (this.handlers) {
      this.input.off('pointermove', this.handlers.move);
      this.input.off('pointerup', this.handlers.up);
      this.handlers = null;
    }
    this.press = null;
    this.drag = null;
    this.moveFrom = null;
  }

  showTab(id) {
    this.clearTab();
    this.tab = id;
    this.tabBtns.forEach((b, i) => b.bg.setStrokeStyle(TABS[i] === id ? 2 : 1, TABS[i] === id ? 0xef9f27 : 0x2b1d12));
    this.keep(makeText(this, GX, 20, t(`tab.${id}`), 8, '#EF9F27', { origin: [0, 0.5] }));
    if (id === 'bag') this.buildBag();
    else if (id === 'skills') this.buildSkills();
    else if (id === 'quests') this.buildQuests();
    else if (id === 'map') this.keep(makeText(this, 280, 130, t('map.soon'), 8, '#9c8a6e'));
    else if (id === 'settings') goTo(this, 'Settings', { from: 'Menu', menuFrom: this.fromKey });
  }

  buildSkills() {
    const s = this.save;
    const x = s.xp || { level: 1, xp: 0 };
    const need = x.level >= MAX_LEVEL ? 0 : xpNeeded(x.level);
    const lines = [
      t('skills.level', { level: x.level }),
      x.level >= MAX_LEVEL ? t('skills.max') : t('skills.xp', { xp: x.xp, need }),
      t('skills.coins', { coins: s.coins })
    ];
    lines.forEach((l, i) => this.keep(makeText(this, GX, 54 + i * 24, l, 8, '#F6E7C1', { origin: [0, 0.5] })));
    this.keep(makeText(this, GX, 160, t('skills.hint'), 8, '#9c8a6e', {
      origin: [0, 0], wordWrap: { width: 370, useAdvancedWrap: true }, lineSpacing: 4
    }));
  }

  buildQuests() {
    buildQuestLog(this);
  }

  // ---------------- bag ----------------
  slotXY(i) {
    return { x: GX + (i % COLS) * (S + G), y: GY + Math.floor(i / COLS) * (S + G) };
  }

  slotAt(px, py) {
    const n = this.save.inventory.slots.length;
    const col = Math.floor((px - GX) / (S + G));
    const row = Math.floor((py - GY) / (S + G));
    if (col < 0 || col >= COLS || row < 0) return -1;
    const i = row * COLS + col;
    if (i >= n) return -1;
    const { x, y } = this.slotXY(i);
    return px <= x + S && py <= y + S ? i : -1;
  }

  buildBag() {
    const inv = this.save.inventory;
    const n = inv.slots.length;
    this.selected = Math.min(inv.row * COLS + inv.sel, n - 1);
    this.bagTitle = this.keep(makeText(this, 268, 20, '', 8, '#9c8a6e', { origin: [0, 0.5] }));
    this.cells = [];
    for (let i = 0; i < n; i++) {
      const { x, y } = this.slotXY(i);
      const bg = this.keep(this.add.rectangle(x, y, S, S, 0xf6e7c1, 0.16).setOrigin(0).setInteractive());
      bg.on('pointerdown', (p) => { this.press = { i, x: p.x, y: p.y }; });
      const icon = this.keep(this.add.image(x + S / 2, y + S / 2, 'item_hoe').setVisible(false));
      const qty = this.keep(makeText(this, x + S - 1, y + S, '', 8, '#F6E7C1', {
        origin: [1, 1], stroke: '#2b1d12', strokeThickness: 2
      }));
      this.cells.push({ bg, icon, qty });
    }

    // detail panel
    this.keep(this.add.rectangle(268, GY, 204, 150, 0x1a120b, 0.8).setOrigin(0).setStrokeStyle(1, 0x854f0b));
    this.detIcon = this.keep(this.add.image(292, GY + 26, 'item_hoe').setScale(3));
    this.detName = this.keep(makeText(this, 322, GY + 16, '', 8, '#EF9F27', { origin: [0, 0.5] }));
    this.detQty = this.keep(makeText(this, 322, GY + 32, '', 8, '#9c8a6e', { origin: [0, 0.5] }));
    this.detDesc = this.keep(makeText(this, 276, GY + 56, '', 8, '#F6E7C1', {
      origin: [0, 0], wordWrap: { width: 190, useAdvancedWrap: true }, lineSpacing: 4
    }));
    this.useBtn = this.keep(makeButton(this, 318, GY + 130, 80, 18, t('bag.use'), () => this.useSelected()));
    this.moveBtn = this.keep(makeButton(this, 422, GY + 130, 80, 18, t('bag.move'), () => this.startMove()));
    this.useBtn.bg.setDepth(0);
    this.hint = this.keep(makeText(this, 268, GY + 160, t('bag.hint'), 8, '#9c8a6e', {
      origin: [0, 0], wordWrap: { width: 204, useAdvancedWrap: true }, lineSpacing: 4
    }));

    this.handlers = {
      move: (p) => this.onMove(p),
      up: (p) => this.onUp(p)
    };
    this.input.on('pointermove', this.handlers.move);
    this.input.on('pointerup', this.handlers.up);
    this.refreshBag();
  }

  refreshBag() {
    const inv = this.save.inventory;
    const used = inv.slots.filter(Boolean).length;
    this.bagTitle.setText(t('bag.title', { used, max: inv.slots.length }));
    this.cells.forEach((c, i) => {
      const item = inv.slots[i];
      const inRow = i >= inv.row * COLS && i < inv.row * COLS + COLS;
      c.bg.setFillStyle(0xf6e7c1, inRow ? 0.3 : 0.16);
      if (i === this.moveFrom) c.bg.setStrokeStyle(2, 0x5b9bd5);
      else if (i === this.selected) c.bg.setStrokeStyle(2, 0xef9f27);
      else c.bg.setStrokeStyle(1, 0xf6e7c1, inRow ? 0.8 : 0.45);
      c.icon.setVisible(!!item).setAlpha(this.drag && this.drag.from === i ? 0.3 : 1);
      if (item) c.icon.setTexture(`item_${item.id}`);
      c.qty.setText(item && item.qty > 1 ? String(item.qty) : '');
    });
    this.refreshDetail();
  }

  refreshDetail() {
    const item = this.save.inventory.slots[this.selected];
    this.useBtn.setDisabled(!item);
    this.moveBtn.setDisabled(!item);
    if (!item) {
      this.detIcon.setVisible(false);
      this.detName.setText(t('bag.empty'));
      this.detQty.setText('');
      this.detDesc.setText('');
      return;
    }
    const def = ITEMS[item.id];
    this.detIcon.setVisible(true).setTexture(`item_${item.id}`);
    this.detName.setText(def.name);
    this.detQty.setText(`x${item.qty}`);
    const parts = [];
    if (TOOLS.includes(item.id)) parts.push(t('item.tool'));
    if (def.seed) {
      parts.push(t('item.seed', { days: CROPS[def.seed].days }));
      parts.push(t('item.grows', { seasons: CROPS[def.seed].seasons.map((s) => t(`season.${s}`)).join(', ') }));
    }
    if (item.id === 'animal_feed') parts.push(t('item.feed'));
    if (def.price) parts.push(t('item.sell', { price: def.price }));
    this.detDesc.setText(parts.join('\n'));
  }

  // ---- input: tap / drag ----
  onMove(p) {
    if (!this.press) return;
    const inv = this.save.inventory;
    if (!this.drag) {
      if (Math.hypot(p.x - this.press.x, p.y - this.press.y) < 5 || !inv.slots[this.press.i]) return;
      this.drag = {
        from: this.press.i,
        ghost: this.add.image(p.worldX, p.worldY, `item_${inv.slots[this.press.i].id}`).setScale(1.25).setAlpha(0.9).setDepth(100)
      };
      this.refreshBag();
    }
    this.drag.ghost.setPosition(p.worldX, p.worldY);
  }

  onUp(p) {
    if (!this.press) return;
    const press = this.press;
    this.press = null;
    if (this.drag) {
      const from = this.drag.from;
      this.drag.ghost.destroy();
      this.drag = null;
      const to = this.slotAt(p.worldX, p.worldY);
      if (to >= 0 && to !== from) this.moveItem(from, to);
      else this.refreshBag();
      return;
    }
    // plain tap
    if (this.moveFrom !== null) {
      const from = this.moveFrom;
      this.moveFrom = null;
      this.hint.setText(t('bag.hint'));
      if (press.i !== from) { this.moveItem(from, press.i); return; }
    }
    playSfx(this, 'sfx_click');
    this.selected = press.i;
    this.refreshBag();
  }

  startMove() {
    if (!this.save.inventory.slots[this.selected]) return;
    this.moveFrom = this.selected;
    this.hint.setText(t('bag.moveHint'));
    this.refreshBag();
  }

  // Swap two slots, or merge when both hold the same item.
  moveItem(a, b) {
    const slots = this.save.inventory.slots;
    const sa = slots[a];
    const sb = slots[b];
    if (sa && sb && sa.id === sb.id) {
      const total = sa.qty + sb.qty;
      sb.qty = Math.min(STACK_MAX, total);
      sa.qty = total - sb.qty;
      if (sa.qty <= 0) slots[a] = null;
    } else {
      slots[a] = sb || null;
      slots[b] = sa || null;
    }
    this.selected = b;
    playSfx(this, 'sfx_click');
    writeSave(this.save);
    this.refreshBag();
  }

  // Put the selected item on the hotbar (its row + slot) and go back to the game.
  useSelected() {
    const inv = this.save.inventory;
    if (!inv.slots[this.selected]) return;
    inv.row = Math.floor(this.selected / COLS);
    inv.sel = this.selected % COLS;
    this.close();
  }
}
