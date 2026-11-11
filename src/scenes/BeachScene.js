import Phaser from 'phaser';
import { t } from '../i18n/index.js';
import { goTo } from '../systems/ui.js';
import { applyWarmTint, preloadAssets, BEACH_PROPS, FISH_IDS } from '../systems/assets.js';
import { createFarmTileset, createPlayerTextures, setPlayerDir, usingRealPlayer } from '../systems/farmArt.js';
import TouchControls from '../systems/touchControls.js';
import Hud from '../systems/hud.js';
import { loadSave, writeSave } from '../systems/save.js';
import { playSfx, SFX_KEYS, createFootsteps } from '../systems/audio.js';
import { createNightOverlay, updateDayNight } from '../systems/daynight.js';
import { ITEMS, addItem } from '../systems/items.js';
import { addXp, XP_GAIN } from '../systems/xp.js';
import FishingGame, { fishName } from '../systems/fishing.js';

const CLOCK_STEP_MS = 7000;
const AUTOSAVE_MS = 30000;
const DAY_END = 26 * 60;
const WATER_TILE_INDEX = 4; // gid of the deep-water tile in beach_tiles.png (collides)

const propOf = (obj, name) => ((obj.properties || []).find((p) => p.name === name) || {}).value;

// Solid footprint [w, h] at the bottom-centre of each prop. Missing = decoration only.
const SOLID = {
  palm_a: [8, 6], palm_b: [8, 6], palm_big: [10, 8], palm_pair: [44, 8],
  rock_big: [24, 10], rock_tall: [10, 8], rock_s1: [8, 6], rock_s2: [10, 6],
  boat: [60, 8], barrel1: [14, 6], barrel2: [14, 6]
};

const FACING = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] };

// The Beach: south of the Farm. Sand, a pier, palm trees and the fishing minigame.
export default class BeachScene extends Phaser.Scene {
  constructor() {
    super('Beach');
  }

  preload() {
    preloadAssets(this, [
      'map_beach', 'tiles_beach', 'player', ...SFX_KEYS,
      ...BEACH_PROPS.map((n) => `prop_${n}`),
      ...FISH_IDS.map((n) => `item_${n}`), 'item_fishing_rod'
    ]);
  }

  create() {
    this.leaving = false;
    const save = loadSave();
    if (!save) { this.scene.start('Title'); return; }
    this.save = save;
    this.gender = save.player.gender;

    this.cameras.main.fadeIn(250, 0, 0, 0);
    createFarmTileset(this);
    createPlayerTextures(this, this.gender);

    const map = this.make.tilemap({ key: 'map_beach' });
    const tiles = map.addTilesetImage('beach_tiles', 'tiles_beach');
    this.ground = map.createLayer('Ground', tiles, 0, 0).setDepth(0);
    this.pierLayer = map.createLayer('Pier', tiles, 0, 0).setDepth(0.5);
    this.ground.setCollisionByProperty({ collides: true });
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
    if (p && p.map === 'beach' && typeof p.x === 'number') start = p;
    else if (p && p.from) start = point(`from_${p.from}`) || start;

    // --- props (palms, rocks, shells, boat, barrels...) ---
    this.solids = this.physics.add.staticGroup();
    map.getObjectLayer('Props').objects.forEach((o) => {
      const key = `prop_${o.name}`;
      if (!this.textures.exists(key)) return;
      this.add.image(o.x, o.y, key).setOrigin(0.5, 1).setDepth(o.y);
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
    this.physics.add.collider(this.player, [this.ground, this.solids]);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, W, H);
    cam.startFollow(this.player, true, 0.12, 0.12);

    applyWarmTint(this);
    createNightOverlay(this);
    updateDayNight(this, save.time.minutes);

    // --- HUD + controls ---
    this.hud = new Hud(this, save, { onMenu: () => { this.persist(); goTo(this, 'Menu', { from: 'Beach' }); } });
    this.fishing = new FishingGame(this, {
      getLevel: () => this.save.xp.level,
      player: this.player,
      onCatch: (id) => this.catchFish(id),
      onFail: (key) => { playSfx(this, 'sfx_deny'); this.hud.toast(t(key), '#C4553F'); }
    });
    this.controls = new TouchControls(this, {
      onA: () => this.pressA(),
      onB: () => { if (!this.fishing.active) this.hud.nextRow(); }
    });
    this.onKey = (e) => {
      const n = Number(e.key);
      if (n >= 1 && n <= 6 && !this.fishing.active) this.hud.select(n - 1);
      else if (e.key === 'Escape') { this.persist(); goTo(this, 'Menu', { from: 'Beach' }); }
    };
    this.input.keyboard.on('keydown', this.onKey);

    this.time.addEvent({ delay: CLOCK_STEP_MS, loop: true, callback: () => this.tickClock() });
    this.time.addEvent({ delay: AUTOSAVE_MS, loop: true, callback: () => this.persist() });
    this.events.on(Phaser.Scenes.Events.PAUSE, this.persist, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.persist();
      this.footsteps.stop();
      this.fishing.destroy();
      this.controls.destroy();
      this.input.keyboard.off('keydown', this.onKey);
      this.events.off(Phaser.Scenes.Events.PAUSE, this.persist, this);
    });

    // first visit: short hint about fishing
    if (!save.flags.beachSeen) {
      save.flags.beachSeen = true;
      this.time.delayedCall(600, () => this.hud.showMessage(t('beach.arrive')));
    }
  }

  // ---------------- fishing ----------------
  // Water tile centre in front of the player (null when not facing water).
  waterAhead() {
    const [dx, dy] = FACING[this.facing];
    const c = this.player.body.center;
    for (const dist of [10, 18, 26]) {
      const tile = this.ground.getTileAtWorldXY(c.x + dx * dist, c.y + dy * dist);
      if (tile && tile.index === WATER_TILE_INDEX) {
        return { x: tile.pixelX + 8, y: tile.pixelY + 8 };
      }
    }
    return null;
  }

  rodSelected() {
    const item = this.hud.selectedItem();
    return !!item && item.id === 'fishing_rod';
  }

  catchFish(id) {
    const left = addItem(this.save.inventory, id, 1);
    if (left > 0) {
      playSfx(this, 'sfx_deny');
      this.hud.toast(t('msg.bagFull'), '#C4553F');
      return false; // no fish-jump effect when the bag is full
    }
    playSfx(this, 'sfx_harvest');
    this.hud.toast(t('fish.caught', { name: fishName(id) }), '#639922');
    this.hud.refreshHotbar();
    const r = addXp(this.save, XP_GAIN.fish);
    this.hud.refresh();
    if (r.leveled) {
      this.time.delayedCall(700, () => {
        playSfx(this, 'jingle_quest');
        this.hud.toast(t('level.up', { level: r.level }), '#EF9F27');
      });
    }
    this.persist();
    return true;
  }

  // ---------------- interactions ----------------
  pressA() {
    if (this.fishing.pressA()) return;
    if (this.hud.messageOpen()) { this.hud.hideMessage(); return; }
    if (this.zone) {
      if (this.zone.action === 'to_farm') this.travel('farm');
      return;
    }
    if (this.rodSelected()) {
      const target = this.waterAhead();
      if (target) {
        this.fishing.start(target, this.facing);
        return;
      }
    }
    this.pulse();
  }

  pulse() {
    this.tweens.add({ targets: this.player, scale: { from: 1, to: 1.1 }, duration: 100, yoyo: true });
  }

  tickClock() {
    if (this.hud.messageOpen()) return;
    this.save.time.minutes += 10;
    this.hud.refreshTime();
    updateDayNight(this, this.save.time.minutes);
    if (this.save.time.minutes >= DAY_END) {
      // too late to stay out: walk home to the farm and collapse there
      this.save.time.minutes = DAY_END - 10;
      this.fishing.cancel();
      this.travel('farm');
    }
  }

  travel(to) {
    if (this.leaving) return;
    this.leaving = true;
    this.fishing.cancel();
    playSfx(this, 'sfx_door');
    this.save.pos = { map: to, from: 'beach' };
    writeSave(this.save);
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('Farm');
    });
  }

  persist() {
    if (!this.player || !this.save || this.leaving) return;
    this.save.pos = { map: 'beach', x: Math.round(this.player.x), y: Math.round(this.player.y) };
    writeSave(this.save);
  }

  update(time, delta) {
    if (!this.player) return;
    const raw = this.controls.getMove();
    const fishing = this.fishing.active;
    const busy = fishing && this.fishing.state !== 'wait' ? true : false;
    // while waiting for a bite the player may still walk away (that cancels the cast)
    const move = busy || this.hud.messageOpen() ? new Phaser.Math.Vector2(0, 0) : raw;
    this.fishing.update(delta, fishing && this.fishing.state === 'wait' ? raw.length() : 0);
    const speed = this.controls.isRunning() ? 105 : 62;
    const frozen = this.fishing.active;
    this.player.setVelocity(frozen ? 0 : move.x * speed, frozen ? 0 : move.y * speed);

    const moving = !frozen && move.lengthSq() > 0.01;
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

    // contextual prompt
    const feet = this.player.body.center;
    this.zone = this.zones.find((z) => z.rect.contains(feet.x, feet.y)) || null;
    let label = null;
    if (!this.hud.messageOpen() && !this.fishing.active) {
      if (this.zone) label = this.zone.action === 'to_farm' ? t('prompt.toFarmBeach') : null;
      else if (this.rodSelected() && this.waterAhead()) label = t('prompt.cast');
    }
    this.hud.setPrompt(label ? t('prompt.tapA', { action: label }) : null);
    this.hud.placePrompt(this.player.x, this.player.y - 18);
  }
}
