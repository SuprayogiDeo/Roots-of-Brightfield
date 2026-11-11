import { playSfx } from './audio.js';
import { t } from '../i18n/index.js';
import { makeText, getSafe } from './ui.js';
import { ITEMS, createItemIcons } from './items.js';
import { xpNeeded, MAX_LEVEL } from './xp.js';
import { todayWeather } from './calendar.js';

// In-game HUD (landscape, ~4% safe margin). Top-center stays EMPTY.
//  top-left : date + time panel with stamina bar
//  top-right: coins + menu button
//  bottom-center: 6-slot hotbar (tap to select, B cycles rows 1-3)
//  plus: contextual prompt above the player and a simple message box.
// Screen-space objects use scrollFactor 0 at depth 1000 (warm tint is 900).

const M = 11;
const D = 1000;
const SLOT = 24;
const GAP = 2;
export const HOTBAR_SIZE = 6;
export const BAG_ROWS = 3;
const BAR_W = HOTBAR_SIZE * SLOT + (HOTBAR_SIZE - 1) * GAP; // 130
const BAR_Y = 270 - M - SLOT;

export function formatTime(minutes) {
  const h24 = Math.floor(minutes / 60) % 24;
  const mm = String(minutes % 60).padStart(2, '0');
  const ampm = h24 < 12 ? 'AM' : 'PM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${String(h12).padStart(2, '0')}:${mm} ${ampm}`;
}

export default class Hud {
  constructor(scene, save, { onMenu }) {
    this.scene = scene;
    this.save = save;
    createItemIcons(scene);
    const W = scene.scale.width;
    const safe = getSafe(scene);
    const ML = M + safe.l;
    const MR = M + safe.r;
    const CX = W / 2;
    const BAR_X = CX - BAR_W / 2;
    this.barX = BAR_X;
    const fix = (o, depth = D) => o.setScrollFactor(0).setDepth(depth);

    // --- top-left: date / time / stamina ---
    this.datePanel = fix(scene.add.rectangle(ML, M, 160, 43, 0x2b1d12, 0.72)
      .setOrigin(0).setStrokeStyle(1, 0x854f0b));
    this.dateTxt = fix(makeText(scene, ML + 6, M + 6, '', 8, '#F6E7C1', { origin: [0, 0] }), D + 1);
    this.weatherTxt = fix(makeText(scene, ML + 154, M + 6, '', 8, '#9AD5FF', { origin: [1, 0] }), D + 1);
    this.timeTxt = fix(makeText(scene, ML + 6, M + 19, '', 8, '#EF9F27', { origin: [0, 0] }), D + 1);
    this.lvTxt = fix(makeText(scene, ML + 6, M + 32, '', 8, '#F6E7C1', { origin: [0, 0] }), D + 1);
    fix(scene.add.rectangle(ML + 50, M + 32, 100, 7, 0x1a120b).setOrigin(0).setStrokeStyle(1, 0x854f0b), D + 1);
    this.xpFill = fix(scene.add.rectangle(ML + 51, M + 33, 98, 5, 0x5b9bd5).setOrigin(0), D + 2);

    // --- top-right: menu button + coins ---
    const mx = W - MR - 26;
    const menuBg = fix(scene.add.rectangle(mx, M, 26, 26, 0x2b1d12, 0.72)
      .setOrigin(0).setStrokeStyle(1, 0x854f0b)).setInteractive({ useHandCursor: true });
    [8, 12, 16].forEach((y) => fix(scene.add.rectangle(mx + 7, M + y, 12, 2, 0xf6e7c1).setOrigin(0), D + 1));
    menuBg.on('pointerdown', () => menuBg.setFillStyle(0x854f0b, 0.9));
    menuBg.on('pointerout', () => menuBg.setFillStyle(0x2b1d12, 0.72));
    menuBg.on('pointerup', () => { menuBg.setFillStyle(0x2b1d12, 0.72); playSfx(scene, 'sfx_click'); onMenu(); });
    this.menuBtn = menuBg;

    const cx = mx - 4 - 74;
    // (coin panel is 22 high; the menu button next to it is 26 high for bigger touch target)
    fix(scene.add.rectangle(cx, M, 74, 22, 0x2b1d12, 0.72).setOrigin(0).setStrokeStyle(1, 0x854f0b));
    fix(scene.add.circle(cx + 10, M + 11, 5, 0xef9f27).setStrokeStyle(1, 0x854f0b), D + 1);
    fix(scene.add.rectangle(cx + 10, M + 11, 1, 5, 0x854f0b), D + 2);
    this.coinTxt = fix(makeText(scene, cx + 70, M + 12, '0', 8, '#F6E7C1', { origin: [1, 0.5] }), D + 1);

    // --- bottom-center: hotbar ---
    fix(scene.add.rectangle(BAR_X - 3, BAR_Y - 3, BAR_W + 6, SLOT + 6, 0x2b1d12, 0.45).setOrigin(0));
    this.icons = [];
    this.qtys = [];
    this.slots = [];
    for (let i = 0; i < HOTBAR_SIZE; i++) {
      const x = BAR_X + i * (SLOT + GAP);
      const slot = fix(scene.add.rectangle(x, BAR_Y, SLOT, SLOT, 0xf6e7c1, 0.16)
        .setOrigin(0).setStrokeStyle(1, 0xf6e7c1, 0.45), D + 1).setInteractive();
      this.slots.push(slot);
      slot.on('pointerdown', () => this.select(i));
      this.icons.push(fix(scene.add.image(x + SLOT / 2, BAR_Y + SLOT / 2, 'item_hoe'), D + 2).setVisible(false));
      this.qtys.push(fix(makeText(scene, x + SLOT - 1, BAR_Y + SLOT, '', 8, '#F6E7C1', {
        origin: [1, 1], stroke: '#2b1d12', strokeThickness: 2
      }), D + 3));
    }
    this.selRect = fix(scene.add.rectangle(0, BAR_Y - 1, SLOT + 2, SLOT + 2)
      .setOrigin(0).setStrokeStyle(2, 0xef9f27), D + 4);
    this.rowTxt = fix(makeText(scene, BAR_X + BAR_W + 7, BAR_Y + SLOT / 2 + 1, '1', 8, '#F6E7C1', {
      origin: [0, 0.5], stroke: '#2b1d12', strokeThickness: 2
    }), D + 1);
    this.nameTxt = fix(makeText(scene, CX, BAR_Y - 6, '', 8, '#F6E7C1', {
      origin: [0.5, 1], stroke: '#2b1d12', strokeThickness: 3
    }), D + 1).setAlpha(0);

    // --- top-left (below the date panel): current quest objective ---
    this.questBg = fix(scene.add.rectangle(ML, M + 47, 10, 14, 0x2b1d12, 0.72)
      .setOrigin(0).setStrokeStyle(1, 0xef9f27)).setVisible(false);
    this.questTxt = fix(makeText(scene, ML + 5, M + 53, '', 8, '#EF9F27', { origin: [0, 0] }), D + 1)
      .setVisible(false);

    // --- floating toast (rewards / short feedback) ---
    this.toastTxt = fix(makeText(scene, CX, BAR_Y - 34, '', 8, '#F6E7C1', {
      origin: [0.5, 1], stroke: '#2b1d12', strokeThickness: 3
    }), D + 7).setAlpha(0);

    // --- contextual prompt (world space, follows the player) ---
    this.promptBg = scene.add.rectangle(0, 0, 10, 13, 0x2b1d12, 0.82).setStrokeStyle(1, 0xef9f27).setDepth(1050);
    this.promptTxt = makeText(scene, 0, 0, '', 8, '#F6E7C1').setDepth(1051);
    this.promptKey = null;
    this.setPrompt(null);

    // --- message box (temporary until the real dialogue box arrives) ---
    this.msgBg = fix(scene.add.rectangle(CX, BAR_Y - 14, 320, 30, 0x2b1d12, 0.9)
      .setOrigin(0.5, 1).setStrokeStyle(1, 0xef9f27), D + 5).setInteractive().setVisible(false);
    this.msgTxt = fix(makeText(scene, CX, BAR_Y - 22, '', 8, '#F6E7C1', {
      origin: [0.5, 1], align: 'center', lineSpacing: 4, wordWrap: { width: 300, useAdvancedWrap: true }
    }), D + 6).setVisible(false);
    this.msgBg.on('pointerup', () => this.hideMessage());

    this.refresh();
  }

  // ---------------- state -> visuals ----------------
  refresh() {
    this.refreshTime();
    const s = this.save;
    const xp = s.xp || { level: 1, xp: 0 };
    this.lvTxt.setText(`Lv ${xp.level}`);
    const ratio = xp.level >= MAX_LEVEL ? 1 : xp.xp / xpNeeded(xp.level);
    this.xpFill.setSize(Math.max(0, Math.round(98 * ratio)), 5);
    this.coinTxt.setText(String(s.coins));
    this.refreshHotbar();
  }

  refreshTime() {
    const { season, day, minutes } = this.save.time;
    this.dateTxt.setText(t('hud.date', { season: t(`season.${season}`), day }));
    this.timeTxt.setText(formatTime(minutes));
    const w = todayWeather(this.save);
    this.weatherTxt.setText(t(`weather.${w}`));
    const panelW = Math.max(160, Math.ceil(this.dateTxt.width + this.weatherTxt.width) + 26);
    this.datePanel.setSize(panelW, 43);
    this.weatherTxt.setX(this.datePanel.x + panelW - 6);
  }

  refreshHotbar() {
    const inv = this.save.inventory;
    for (let i = 0; i < HOTBAR_SIZE; i++) {
      const item = inv.slots[inv.row * HOTBAR_SIZE + i];
      this.icons[i].setVisible(!!item);
      if (item) this.icons[i].setTexture(`item_${item.id}`);
      this.qtys[i].setText(item && item.qty > 1 ? String(item.qty) : '');
    }
    this.selRect.x = this.barX + inv.sel * (SLOT + GAP) - 1;
    this.rowTxt.setText(String(inv.row + 1));
  }

  selectedItem() {
    const inv = this.save.inventory;
    return inv.slots[inv.row * HOTBAR_SIZE + inv.sel] || null;
  }

  // ---------------- hotbar actions ----------------
  select(i) {
    playSfx(this.scene, 'sfx_click');
    this.save.inventory.sel = i;
    this.refreshHotbar();
    this.flashName();
  }

  nextRow() {
    const inv = this.save.inventory;
    inv.row = (inv.row + 1) % Math.max(1, Math.floor(inv.slots.length / HOTBAR_SIZE));
    this.refreshHotbar();
    this.flashName();
  }

  flashName() {
    const item = this.selectedItem();
    const label = item ? ITEMS[item.id].name : t('hud.empty');
    this.nameTxt.setText(label).setAlpha(1);
    this.scene.tweens.killTweensOf(this.nameTxt);
    this.scene.tweens.add({ targets: this.nameTxt, alpha: 0, delay: 1100, duration: 400 });
  }

  // ---------------- contextual prompt ----------------
  setPrompt(text) {
    if (text === this.promptKey) return;
    this.promptKey = text;
    const on = !!text;
    this.promptBg.setVisible(on);
    this.promptTxt.setVisible(on);
    if (!on) return;
    this.promptTxt.setText(text);
    this.promptBg.setSize(Math.ceil(this.promptTxt.width) + 8, 13);
  }

  // Keeps the prompt above the player but inside the camera view.
  placePrompt(x, y) {
    if (!this.promptKey) return;
    const view = this.scene.cameras.main.worldView;
    const half = this.promptBg.width / 2 + 2;
    const px = Math.round(Math.min(Math.max(x, view.x + half), view.right - half));
    const py = Math.round(Math.max(y, view.y + 68)); // stay below the top HUD + quest line
    this.promptBg.setPosition(px, py);
    this.promptTxt.setPosition(px, py + 1);
  }

  // Hides the hotbar while a dialogue covers the bottom of the screen.
  setHotbarVisible(v) {
    this.slots.forEach((slot) => slot.setVisible(v));
    this.qtys.forEach((q) => q.setVisible(v));
    if (!v) this.icons.forEach((i) => i.setVisible(false));
    else this.refreshHotbar();
    if (this.rowTxt) this.rowTxt.setVisible(v);
  }

  // ---------------- quest line + toast ----------------
  setQuest(text) {
    if (text === this.questKey) return;
    this.questKey = text;
    const on = !!text;
    this.questBg.setVisible(on);
    this.questTxt.setVisible(on);
    if (!on) return;
    this.questTxt.setText(text);
    this.questBg.setSize(Math.ceil(this.questTxt.width) + 10, Math.ceil(this.questTxt.height) + 10);
  }

  toast(text, color = '#EF9F27') {
    this.toastTxt.setText(text).setColor(color).setAlpha(1).setY(BAR_Y - 34);
    this.scene.tweens.killTweensOf(this.toastTxt);
    this.scene.tweens.add({ targets: this.toastTxt, y: BAR_Y - 48, alpha: 0, duration: 1100, delay: 350 });
  }

  // ---------------- message box ----------------
  showMessage(text) {
    this.msgTxt.setText(text).setVisible(true);
    this.msgBg.setSize(320, Math.ceil(this.msgTxt.height) + 16).setVisible(true);
    if (this.msgTimer) this.msgTimer.remove();
    this.msgTimer = this.scene.time.delayedCall(5000, () => this.hideMessage());
  }

  hideMessage() {
    this.msgBg.setVisible(false);
    this.msgTxt.setVisible(false);
    if (this.msgTimer) { this.msgTimer.remove(); this.msgTimer = null; }
  }

  messageOpen() {
    return this.msgBg.visible;
  }
}
