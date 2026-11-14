import Phaser from 'phaser';
import { t } from '../i18n/index.js';
import { goTo } from '../systems/ui.js';
import { applyWarmTint, preloadAssets, FOREST_PROPS } from '../systems/assets.js';
import { createFarmTileset, createPlayerTextures, setPlayerDir, usingRealPlayer } from '../systems/farmArt.js';
import TouchControls from '../systems/touchControls.js';
import Hud from '../systems/hud.js';
import { loadSave, writeSave } from '../systems/save.js';
import { playSfx, SFX_KEYS, createFootsteps } from '../systems/audio.js';
import { createNightOverlay, updateDayNight } from '../systems/daynight.js';
import { createWeatherFx } from '../systems/weatherFx.js';
import { reportQuest, reportVisit, refreshTracker, flushQueuedQuests } from '../systems/questUi.js';
import { playMusicFor } from '../systems/music.js';

const CLOCK_STEP_MS = 7000;
const AUTOSAVE_MS = 30000;
const DAY_END = 26 * 60;

const propOf = (obj, name) => ((obj.properties || []).find((p) => p.name === name) || {}).value;

// Solid footprint [w, h] at the bottom-centre of each prop (trunks, rocks, bushes).
// Flowers, ferns and mushrooms are decoration only.
const SOLID = {
  oak_green: [10, 6], oak_yellow: [10, 6], oak_orange: [10, 6],
  pine_a: [8, 6], pine_b: [8, 6], pine_c: [8, 6], pine_big_a: [10, 6], pine_big_b: [10, 6],
  bush_a: [20, 8], bush_b: [22, 8], bush_small: [16, 6],
  rock_a: [20, 8], rock_b: [20, 10], rock_s: [12, 6],
  mine_entrance: [30, 8]
};

// The Forest: north of the Farm. Winding dirt trail, dense trees and a mushroom clearing.
export default class ForestScene extends Phaser.Scene {
  constructor() {
    super('Forest');
  }

  preload() {
    preloadAssets(this, [
      'map_forest', 'tiles_forest', 'player', ...SFX_KEYS,
      ...FOREST_PROPS.map((n) => `prop_${n}`), 'prop_mine_entrance'
    ]);
  }

  create() {
    this.leaving = false;
    const save = loadSave();
    if (!save) { this.scene.start('Title'); return; }
    this.save = save;
    playMusicFor(this, 'forest', save);
    this.gender = save.player.gender;

    this.cameras.main.fadeIn(250, 0, 0, 0);
    createFarmTileset(this);
    createPlayerTextures(this, this.gender);

    const map = this.make.tilemap({ key: 'map_forest' });
    const tiles = map.addTilesetImage('forest_tiles', 'tiles_forest');
    this.ground = map.createLayer('Ground', tiles, 0, 0).setDepth(0);
    const W = map.widthInPixels;
    const H = map.heightInPixels;
    this.physics.world.setBounds(0, 0, W, H);

    this.zones = map.getObjectLayer('Interact').objects.map((o) => ({
      action: propOf(o, 'action'),
      rect: new Phaser.Geom.Rectangle(o.x, o.y, o.width, o.height)
    }));
    const point = (n) => map.findObject('Points', (o) => o.name === n);
    const p = save.pos;
    let start = point('spawn');
    if (p && p.map === 'forest' && typeof p.x === 'number') start = p;
    else if (p && p.from) start = point(`from_${p.from}`) || start;

    // --- props: trees, bushes, rocks (solid) + flowers, ferns, mushrooms (decor) ---
    this.solids = this.physics.add.staticGroup();
    map.getObjectLayer('Props').objects.forEach((o) => {
      const key = `prop_${o.name}`;
      if (!this.textures.exists(key)) return;
      this.add.image(o.x, o.y, key).setOrigin(0.5, 1).setDepth(SOLID[o.name] ? o.y : 0.4);
      const s = SOLID[o.name];
      if (!s) return;
      const r = this.add.rectangle(o.x, o.y - s[1] / 2, s[0], s[1]).setVisible(false);
      this.physics.add.existing(r, true);
      this.solids.add(r);
    });

    // --- player ---
    this.facing = 'down';
    this.moving = false;
    this.footsteps = createFootsteps(this);
    this.zone = null;
    this.realPlayer = usingRealPlayer(this);
    this.player = this.realPlayer
      ? this.physics.add.sprite(start.x, start.y, 'player', 0)
      : this.physics.add.sprite(start.x, start.y, `p_${this.gender}_down_0`);
    if (this.realPlayer) this.player.body.setSize(10, 5).setOffset(11, 21);
    else this.player.body.setSize(8, 6).setOffset(4, 9);
    setPlayerDir(this, this.player, this.gender, 'down', false);
    this.player.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, this.solids);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, W, H);
    cam.startFollow(this.player, true, 0.12, 0.12);

    applyWarmTint(this);
    createNightOverlay(this);
    updateDayNight(this, save.time.minutes);
    createWeatherFx(this, save);

    this.hud = new Hud(this, save, { onMenu: () => { this.persist(); goTo(this, 'Menu', { from: 'Forest' }); } });
    refreshTracker(this);
    reportVisit(this, 'forest');
    this.controls = new TouchControls(this, {
      onA: () => this.pressA(),
      onB: () => this.hud.nextRow()
    });
    this.onKey = (e) => {
      const n = Number(e.key);
      if (n >= 1 && n <= 6) this.hud.select(n - 1);
      else if (e.key === 'Escape') { this.persist(); goTo(this, 'Menu', { from: 'Forest' }); }
    };
    this.input.keyboard.on('keydown', this.onKey);

    this.time.addEvent({ delay: CLOCK_STEP_MS, loop: true, callback: () => this.tickClock() });
    this.time.addEvent({ delay: AUTOSAVE_MS, loop: true, callback: () => this.persist() });
    this.events.on(Phaser.Scenes.Events.PAUSE, this.persist, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.persist();
      this.footsteps.stop();
      this.controls.destroy();
      this.input.keyboard.off('keydown', this.onKey);
      this.events.off(Phaser.Scenes.Events.PAUSE, this.persist, this);
    });

    if (!save.flags.forestSeen) {
      save.flags.forestSeen = true;
      this.time.delayedCall(600, () => this.hud.showMessage(t('forest.arrive')));
    }
  }

  pressA() {
    if (this.hud.messageOpen()) { this.hud.hideMessage(); return; }
    if (!this.zone) return;
    if (this.zone.action === 'to_farm') this.travel('farm');
    else if (this.zone.action === 'to_mine') this.travel('mine');
  }

  tickClock() {
    if (this.hud.messageOpen()) return;
    this.save.time.minutes += 10;
    this.hud.refreshTime();
    updateDayNight(this, this.save.time.minutes);
    if (this.save.time.minutes >= DAY_END) {
      // too late to stay out: walk home to the farm and collapse there
      this.save.time.minutes = DAY_END - 10;
      this.travel('farm');
    }
  }

  travel(to = 'farm') {
    if (this.leaving) return;
    this.leaving = true;
    playSfx(this, 'sfx_door');
    this.save.pos = { map: to, from: 'forest' };
    writeSave(this.save);
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(to === 'mine' ? 'Mine' : 'Farm');
    });
  }

  persist() {
    if (!this.player || !this.save || this.leaving) return;
    this.save.pos = { map: 'forest', x: Math.round(this.player.x), y: Math.round(this.player.y) };
    writeSave(this.save);
  }

  update(time, delta) {
    if (!this.player) return;
    const move = this.hud.messageOpen() ? new Phaser.Math.Vector2(0, 0) : this.controls.getMove();
    const speed = this.controls.isRunning() ? 105 : 62;
    this.player.setVelocity(move.x * speed, move.y * speed);

    const moving = move.lengthSq() > 0.01;
    if (moving) {
      const dir = Math.abs(move.x) > Math.abs(move.y)
        ? (move.x > 0 ? 'right' : 'left')
        : (move.y > 0 ? 'down' : 'up');
      if (dir !== this.facing || !this.moving) {
        this.facing = dir;
        setPlayerDir(this, this.player, this.gender, dir, true);
      }
    } else if (this.moving) {
      setPlayerDir(this, this.player, this.gender, this.facing, false);
    }
    this.moving = moving;
    this.player.setDepth(this.player.y + (this.realPlayer ? 8 : 0));
    this.footsteps.update(moving, this.controls.isRunning(), delta);

    const feet = this.player.body.center;
    this.zone = this.zones.find((z) => z.rect.contains(feet.x, feet.y)) || null;
    const label = !this.hud.messageOpen() && this.zone
      ? ({ to_farm: t('prompt.toFarmForest'), to_mine: t('prompt.toMine') }[this.zone.action] || null) : null;
    this.hud.setPrompt(label ? t('prompt.tapA', { action: label }) : null);
    this.hud.placePrompt(this.player.x, this.player.y - 18);
  }
}
