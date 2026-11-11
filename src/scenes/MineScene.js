import Phaser from 'phaser';
import { t } from '../i18n/index.js';
import { goTo } from '../systems/ui.js';
import { applyWarmTint, preloadAssets, MINE_PROPS } from '../systems/assets.js';
import { createFarmTileset, createPlayerTextures, setPlayerDir, usingRealPlayer } from '../systems/farmArt.js';
import TouchControls from '../systems/touchControls.js';
import Hud from '../systems/hud.js';
import { loadSave, writeSave } from '../systems/save.js';
import { playSfx, SFX_KEYS, createFootsteps } from '../systems/audio.js';

const CLOCK_STEP_MS = 7000;
const AUTOSAVE_MS = 30000;
const DAY_END = 26 * 60;

// Tile ids (1-based, see mine_tiles.png) the player cannot walk on: void, wall tops, cliff faces.
const BLOCKED_TILES = [1, 6, 7, 8, 9, 16];

const propOf = (obj, name) => ((obj.properties || []).find((p) => p.name === name) || {}).value;

// Solid footprint [w, h] at the bottom-centre of each prop. Rubble is decoration only.
const SOLID = {
  node_stone: [12, 6], node_copper: [12, 6], node_gold: [12, 6], node_aquamarine: [12, 6],
  node_ruby: [12, 6], node_emerald: [12, 6], node_amethyst: [12, 6],
  mine_rock_big: [22, 8], crystal: [8, 6]
};

// The Mine: one cave level under the forest. Ore nodes are placed in the map's Props layer
// (node_<ore>); mining them comes in the next step.
export default class MineScene extends Phaser.Scene {
  constructor() {
    super('Mine');
  }

  preload() {
    preloadAssets(this, [
      'map_mine', 'tiles_mine', 'player', ...SFX_KEYS,
      ...MINE_PROPS.map((n) => `prop_${n}`)
    ]);
  }

  create() {
    this.leaving = false;
    const save = loadSave();
    if (!save) { this.scene.start('Title'); return; }
    this.save = save;
    this.gender = save.player.gender;

    this.cameras.main.fadeIn(250, 0, 0, 0);
    this.cameras.main.setBackgroundColor('#160e0a');
    createFarmTileset(this);
    createPlayerTextures(this, this.gender);

    const map = this.make.tilemap({ key: 'map_mine' });
    const tiles = map.addTilesetImage('mine_tiles', 'tiles_mine');
    this.ground = map.createLayer('Ground', tiles, 0, 0).setDepth(0);
    this.ground.setCollision(BLOCKED_TILES);
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
    if (p && p.map === 'mine' && typeof p.x === 'number') start = p;
    else if (p && p.from) start = point(`from_${p.from}`) || start;

    // --- props: ore nodes, big rock, crystals (solid) + rubble (decor) ---
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

    this.makeTorches(map);

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
    this.physics.add.collider(this.player, this.ground);
    this.physics.add.collider(this.player, this.solids);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, W, H);
    cam.startFollow(this.player, true, 0.12, 0.12);

    applyWarmTint(this);
    // Underground: a constant soft darkness instead of the day/night cycle.
    this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x120a06, 0.3)
      .setOrigin(0).setScrollFactor(0).setDepth(900);

    this.hud = new Hud(this, save, { onMenu: () => { this.persist(); goTo(this, 'Menu', { from: 'Mine' }); } });
    this.controls = new TouchControls(this, {
      onA: () => this.pressA(),
      onB: () => this.hud.nextRow()
    });
    this.onKey = (e) => {
      const n = Number(e.key);
      if (n >= 1 && n <= 6) this.hud.select(n - 1);
      else if (e.key === 'Escape') { this.persist(); goTo(this, 'Menu', { from: 'Mine' }); }
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

    if (!save.flags.mineSeen) {
      save.flags.mineSeen = true;
      this.time.delayedCall(600, () => this.hud.showMessage(t('mine.arrive')));
    }
  }

  // Wall torches (code-drawn, 2 flame frames) with a soft additive glow above the darkness.
  makeTorches(map) {
    ['mine_torch_a', 'mine_torch_b'].forEach((key, i) => {
      if (this.textures.exists(key)) return;
      const g = this.make.graphics({ add: false });
      g.fillStyle(0x5a3a1c, 1); g.fillRect(3, 6, 2, 6);          // handle
      g.fillStyle(0x3b2a1a, 1); g.fillRect(2, 5, 4, 2);          // cup
      g.fillStyle(0xef9f27, 1); g.fillRect(2, 1 + i, 4, 4 - i);  // flame
      g.fillStyle(0xffd678, 1); g.fillRect(3, 2 + i, 2, 2);      // flame core
      g.generateTexture(key, 8, 12);
      g.destroy();
    });
    this.torchSprites = [];
    map.getObjectLayer('Torches').objects.forEach((o) => {
      const s = this.add.image(o.x, o.y - 2, 'mine_torch_a').setOrigin(0.5, 1).setDepth(0.5);
      const glow = this.add.circle(o.x, o.y - 10, 28, 0xffb347, 0.13)
        .setBlendMode(Phaser.BlendModes.ADD).setDepth(901);
      this.tweens.add({
        targets: glow, alpha: { from: 0.7, to: 1 }, scale: { from: 0.92, to: 1.05 },
        duration: 500 + Math.random() * 400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
      });
      this.torchSprites.push(s);
    });
    this.flame = 0;
    this.time.addEvent({
      delay: 180, loop: true,
      callback: () => {
        this.flame = 1 - this.flame;
        this.torchSprites.forEach((s) => s.setTexture(this.flame ? 'mine_torch_b' : 'mine_torch_a'));
      }
    });
  }

  pressA() {
    if (this.hud.messageOpen()) { this.hud.hideMessage(); return; }
    if (this.zone && this.zone.action === 'to_forest') this.travel('forest');
  }

  tickClock() {
    if (this.hud.messageOpen()) return;
    this.save.time.minutes += 10;
    this.hud.refreshTime();
    if (this.save.time.minutes >= DAY_END) {
      // too late to stay underground: walk home to the farm and collapse there
      this.save.time.minutes = DAY_END - 10;
      this.travel('farm');
    }
  }

  travel(to) {
    if (this.leaving) return;
    this.leaving = true;
    playSfx(this, 'sfx_door');
    this.save.pos = to === 'farm' ? { map: 'farm', from: 'forest' } : { map: 'forest', from: 'mine' };
    writeSave(this.save);
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(to === 'farm' ? 'Farm' : 'Forest');
    });
  }

  persist() {
    if (!this.player || !this.save || this.leaving) return;
    this.save.pos = { map: 'mine', x: Math.round(this.player.x), y: Math.round(this.player.y) };
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
    const label = !this.hud.messageOpen() && this.zone && this.zone.action === 'to_forest'
      ? t('prompt.leaveMine') : null;
    this.hud.setPrompt(label ? t('prompt.tapA', { action: label }) : null);
    this.hud.placePrompt(this.player.x, this.player.y - 18);
  }
}
