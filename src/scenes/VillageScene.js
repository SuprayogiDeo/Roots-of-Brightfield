import Phaser from 'phaser';
import { t } from '../i18n/index.js';
import { makeText, goTo } from '../systems/ui.js';
import { applyWarmTint, preloadAssets } from '../systems/assets.js';
import { createFarmTileset, createPlayerTextures, setPlayerDir, usingRealPlayer } from '../systems/farmArt.js';
import TouchControls from '../systems/touchControls.js';
import Hud, { HOTBAR_SIZE } from '../systems/hud.js';
import { loadSave, writeSave } from '../systems/save.js';
import { playSfx, SFX_KEYS } from '../systems/audio.js';
import { createNightOverlay, updateDayNight } from '../systems/daynight.js';
import Dialogue from '../systems/dialogue.js';
import { NPCS, greet, lineFor } from '../systems/npcs.js';

const CLOCK_STEP_MS = 7000;
const AUTOSAVE_MS = 30000;

const propOf = (obj, name) => ((obj.properties || []).find((p) => p.name === name) || {}).value;

// Brightfield Village: houses, the Seed Shop and three villagers.
export default class VillageScene extends Phaser.Scene {
  constructor() {
    super('Village');
  }

  preload() {
    preloadAssets(this, ['map_village', 'tiles_farm', 'player', ...SFX_KEYS]);
  }

  create() {
    const save = loadSave();
    if (!save) { this.scene.start('Title'); return; }
    this.save = save;
    this.gender = save.player.gender;

    this.cameras.main.fadeIn(250, 0, 0, 0);
    createFarmTileset(this);
    createPlayerTextures(this, this.gender);

    const map = this.make.tilemap({ key: 'map_village' });
    const tiles = map.addTilesetImage('farm_tiles', 'tiles_farm');
    this.ground = map.createLayer('Ground', tiles, 0, 0).setDepth(0);
    this.objLayer = map.createLayer('Objects', tiles, 0, 0).setDepth(1);
    this.ground.setCollisionByProperty({ collides: true });
    this.objLayer.setCollisionByProperty({ collides: true });
    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

    this.zones = map.getObjectLayer('Interact').objects.map((o) => ({
      action: propOf(o, 'action'),
      rect: new Phaser.Geom.Rectangle(o.x, o.y, o.width, o.height)
    }));

    // spawn: exact saved position, or the door we arrived from
    const point = (n) => map.findObject('Points', (o) => o.name === n);
    const p = save.pos;
    let start = point('spawn');
    if (p && p.map === 'village' && typeof p.x === 'number') start = p;
    else if (p && p.from) start = point(`from_${p.from}`) || start;

    // villagers (placeholder art: the player sheet with a colour tint)
    this.npcs = {};
    Object.keys(NPCS).forEach((id) => {
      const pos = point(`npc_${id}_pos`);
      if (!pos) return;
      const spr = this.add.sprite(pos.x, pos.y, 'player', 0).setTint(NPCS[id].tint);
      spr.setDepth(pos.y + 8);
      if (this.anims.exists('pl_idle_down')) spr.play('pl_idle_down');
      this.npcs[id] = spr;
    });

    this.facing = 'down';
    this.moving = false;
    this.zone = null;
    this.realPlayer = usingRealPlayer(this);
    this.player = this.realPlayer
      ? this.physics.add.sprite(start.x, start.y, 'player', 0)
      : this.physics.add.sprite(start.x, start.y, `p_${this.gender}_down_0`);
    if (this.realPlayer) this.player.body.setSize(10, 5).setOffset(11, 21);
    else this.player.body.setSize(8, 6).setOffset(4, 9);
    setPlayerDir(this, this.player, this.gender, 'down', false);
    this.player.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, [this.ground, this.objLayer]);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    cam.startFollow(this.player, true, 0.12, 0.12);

    applyWarmTint(this);
    createNightOverlay(this);
    updateDayNight(this, save.time.minutes);

    this.hud = new Hud(this, save, { onMenu: () => { this.persist(); goTo(this, 'Menu', { from: 'Village' }); } });
    this.dialogue = new Dialogue(this);
    this.controls = new TouchControls(this, {
      onA: () => this.pressA(),
      onB: () => this.hud.nextRow()
    });
    this.onKey = (e) => {
      const n = Number(e.key);
      if (n >= 1 && n <= HOTBAR_SIZE) this.hud.select(n - 1);
      else if (e.key === 'Escape') { this.persist(); goTo(this, 'Menu', { from: 'Village' }); }
    };
    this.input.keyboard.on('keydown', this.onKey);

    this.time.addEvent({ delay: CLOCK_STEP_MS, loop: true, callback: () => this.tickClock() });
    this.time.addEvent({ delay: AUTOSAVE_MS, loop: true, callback: () => this.persist() });
    this.events.on(Phaser.Scenes.Events.PAUSE, this.persist, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.persist();
      this.controls.destroy();
      this.input.keyboard.off('keydown', this.onKey);
      this.events.off(Phaser.Scenes.Events.PAUSE, this.persist, this);
    });
  }

  tickClock() {
    if (this.dialogue.isOpen() || this.hud.messageOpen()) return;
    this.save.time.minutes += 10;
    this.hud.refreshTime();
    updateDayNight(this, this.save.time.minutes);
    if (this.save.time.minutes >= 26 * 60) {
      // too late to stay out: walk home to the farm and collapse there
      this.save.time.minutes = 26 * 60 - 10;
      this.travel('farm');
    }
  }

  pressA() {
    if (this.dialogue.advance()) return;
    if (this.hud.messageOpen()) { this.hud.hideMessage(); return; }
    if (!this.zone) return;
    const action = this.zone.action;
    if (action === 'to_farm') this.travel('farm');
    else if (action === 'shop') this.openShop();
    else if (action && action.startsWith('npc:')) this.talk(action.slice(4));
  }

  talk(id) {
    const def = NPCS[id];
    if (!def) return;
    const res = greet(this.save, id);
    playSfx(this, 'sfx_click');
    const choices = def.role === 'shop'
      ? [{ label: t('shop.open'), value: 'shop' }, { label: t('common.bye'), value: 'bye' }]
      : null;
    this.hud.setHotbarVisible(false);
    this.dialogue.show({
      name: def.name,
      hearts: res.hearts,
      tint: def.tint,
      lines: [t(lineFor(this.save, id)), ...(res.gained ? [t('friend.gained', { name: def.name })] : [])],
      choices,
      onChoice: (v) => { if (v === 'shop') this.openShop(); }
    });
    this.persist();
  }

  openShop() {
    this.persist();
    goTo(this, 'Shop', { from: 'Village' });
  }

  travel(to) {
    if (this.leaving) return;
    this.leaving = true;
    playSfx(this, 'sfx_door');
    this.save.pos = { map: to, from: 'village' };
    writeSave(this.save);
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(to === 'farm' ? 'Farm' : 'Village');
    });
  }

  promptFor(action) {
    if (action === 'to_farm') return t('prompt.toFarm');
    if (action === 'shop') return t('prompt.shop');
    if (action && action.startsWith('npc:')) {
      const def = NPCS[action.slice(4)];
      return def ? t('prompt.talk', { name: def.name }) : null;
    }
    return null;
  }

  persist() {
    if (!this.player || !this.save || this.leaving) return;
    this.save.pos = { map: 'village', x: Math.round(this.player.x), y: Math.round(this.player.y) };
    writeSave(this.save);
  }

  update() {
    if (!this.player) return;
    const busy = this.dialogue.isOpen() || this.hud.messageOpen();
    if (!this.dialogue.isOpen() && this.hotbarHidden) { this.hotbarHidden = false; this.hud.setHotbarVisible(true); }
    if (this.dialogue.isOpen()) this.hotbarHidden = true;
    const move = busy ? new Phaser.Math.Vector2(0, 0) : this.controls.getMove();
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

    const feet = this.player.body.center;
    this.zone = this.zones.find((z) => z.rect.contains(feet.x, feet.y)) || null;
    const label = busy || !this.zone ? null : this.promptFor(this.zone.action);
    this.hud.setPrompt(label ? t('prompt.tapA', { action: label }) : null);
    this.hud.placePrompt(this.player.x, this.player.y - 18);
  }
}
