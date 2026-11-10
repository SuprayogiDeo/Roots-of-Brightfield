import Phaser from 'phaser';
import { createItemIcons } from './items.js';

// Animal definitions. Names stay English in both languages (design rule).
// Sheets are 64x64 = 2x2 frames of 32x32: frames 0-1 idle, 2-3 walking. Sprites face LEFT.
export const ANIMALS = {
  chicken: { name: 'Chicken', price: 100, product: 'egg', max: 6, speed: 14, sheet: 'animal_chicken', originY: 0.75, bubbleY: 20 },
  cow: { name: 'Cow', price: 400, product: 'milk', max: 3, speed: 10, sheet: 'animal_cow', originY: 0.85, bubbleY: 28 }
};

// Pasture = tile rectangle on the Farm map (south-west meadow).
export const PASTURE = { x1: 2, y1: 16, x2: 14, y2: 22 };
const PX = { x1: PASTURE.x1 * 16, y1: PASTURE.y1 * 16, x2: (PASTURE.x2 + 1) * 16, y2: (PASTURE.y2 + 1) * 16 };

export function newAnimal(type) {
  return { id: `${type}_${Date.now()}_${Math.floor(Math.random() * 1000)}`, type, fed: false, ready: false };
}

// Draws and moves the animals living in save.animals. The save objects ARE the state
// (fed / ready), so the normal autosave keeps everything.
export class AnimalManager {
  constructor(scene, save) {
    this.scene = scene;
    this.save = save;
    this.views = [];
    createItemIcons(scene);
    Object.keys(ANIMALS).forEach((type) => {
      const def = ANIMALS[type];
      if (!scene.textures.exists(def.sheet)) return;
      if (!scene.anims.exists(`${type}_idle`)) {
        scene.anims.create({ key: `${type}_idle`, frames: scene.anims.generateFrameNumbers(def.sheet, { start: 0, end: 1 }), frameRate: 2, repeat: -1 });
        scene.anims.create({ key: `${type}_walk`, frames: scene.anims.generateFrameNumbers(def.sheet, { start: 2, end: 3 }), frameRate: 6, repeat: -1 });
      }
    });
  }

  spawnAll() {
    this.save.animals.forEach((data) => this.spawn(data));
  }

  spawn(data) {
    const def = ANIMALS[data.type];
    if (!def || !this.scene.textures.exists(def.sheet)) return null;
    let x = PX.x1 + 24;
    let y = PX.y1 + 24;
    for (let i = 0; i < 20; i++) {
      const tx = Phaser.Math.Between(PASTURE.x1, PASTURE.x2);
      const ty = Phaser.Math.Between(PASTURE.y1, PASTURE.y2);
      if (!this.blocked(tx * 16 + 8, ty * 16 + 8)) { x = tx * 16 + 8; y = ty * 16 + 8; break; }
    }
    const sprite = this.scene.add.sprite(x, y, def.sheet, 0).setOrigin(0.5, def.originY);
    sprite.play(`${data.type}_idle`);
    const bubble = this.scene.add.image(x, y, 'item_animal_feed').setDepth(950).setVisible(false);
    const view = { data, def, sprite, bubble, state: 'idle', wait: Phaser.Math.FloatBetween(0.5, 3), tx: x, ty: y };
    this.views.push(view);
    this.refreshBubble(view);
    return view;
  }

  // Tile blocked by an Objects-layer tile, or outside the pasture.
  blocked(x, y) {
    if (x < PX.x1 || x > PX.x2 || y < PX.y1 || y > PX.y2) return true;
    return !!this.scene.objLayer.getTileAt(Math.floor(x / 16), Math.floor(y / 16));
  }

  nearest(px, py, radius) {
    let best = null;
    let bestD = radius;
    this.views.forEach((v) => {
      const d = Math.hypot(v.sprite.x - px, v.sprite.y - 6 - py);
      if (d <= bestD) { best = v; bestD = d; }
    });
    return best;
  }

  // ready -> product icon, hungry -> feed icon, fed and waiting -> no bubble.
  refreshBubble(v) {
    if (v.data.ready) v.bubble.setTexture(`item_${v.def.product}`).setScale(1).setVisible(true);
    else if (!v.data.fed) v.bubble.setTexture('item_animal_feed').setScale(0.75).setVisible(true);
    else v.bubble.setVisible(false);
  }

  // Overnight: fed animals produce, then everybody is hungry again.
  newDay() {
    this.views.forEach((v) => {
      if (v.data.fed) v.data.ready = true;
      v.data.fed = false;
      this.refreshBubble(v);
    });
  }

  rest(v) {
    v.state = 'idle';
    v.wait = Phaser.Math.FloatBetween(1.5, 5);
    v.sprite.play(`${v.data.type}_idle`, true);
  }

  pickTarget(v) {
    const s = v.sprite;
    for (let i = 0; i < 6; i++) {
      const tx = s.x + Phaser.Math.Between(-48, 48);
      const ty = s.y + Phaser.Math.Between(-32, 32);
      if (this.blocked(tx, ty)) continue;
      v.tx = tx;
      v.ty = ty;
      v.state = 'walk';
      s.setFlipX(tx > s.x); // art faces left
      s.play(`${v.data.type}_walk`, true);
      return;
    }
    this.rest(v);
  }

  update(delta) {
    const dt = Math.min(delta, 100) / 1000;
    const now = this.scene.time.now / 1000;
    this.views.forEach((v) => {
      const s = v.sprite;
      if (v.state === 'idle') {
        v.wait -= dt;
        if (v.wait <= 0) this.pickTarget(v);
      } else {
        const dx = v.tx - s.x;
        const dy = v.ty - s.y;
        const dist = Math.hypot(dx, dy);
        const step = v.def.speed * dt;
        if (dist <= step) { s.x = v.tx; s.y = v.ty; this.rest(v); }
        else {
          const nx = s.x + (dx / dist) * step;
          const ny = s.y + (dy / dist) * step;
          if (this.blocked(nx, ny)) this.rest(v);
          else { s.x = nx; s.y = ny; }
        }
      }
      s.setDepth(s.y);
      if (v.bubble.visible) v.bubble.setPosition(Math.round(s.x), Math.round(s.y - v.def.bubbleY + Math.sin(now * 3) * 1.5));
    });
  }
}
