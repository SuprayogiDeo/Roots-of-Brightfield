import Phaser from 'phaser';
import { t } from '../i18n/index.js';
import { makeText, goTo } from '../systems/ui.js';
import { applyWarmTint, preloadAssets } from '../systems/assets.js';
import { createFarmTileset, createPlayerTextures, setPlayerDir, usingRealPlayer } from '../systems/farmArt.js';
import TouchControls from '../systems/touchControls.js';
import Hud, { HOTBAR_SIZE } from '../systems/hud.js';
import { loadSave, writeSave } from '../systems/save.js';
import { CROPS, isReady, cropFrame, createCropTextures, createBinTexture } from '../systems/crops.js';
import { ITEMS, addItem, consumeSlot } from '../systems/items.js';
import { advanceQuest, questObjectiveKey, QUEST_REWARD } from '../systems/quests.js';
import { playSfx, SFX_KEYS, createFootsteps } from '../systems/audio.js';
import { createNightOverlay, updateDayNight } from '../systems/daynight.js';
import { AnimalManager, ANIMALS, newAnimal } from '../systems/animals.js';
import { addXp, XP_GAIN } from '../systems/xp.js';

const DOOR_CLOSED = 13; // gid in farm.json
const DOOR_OPEN = 14;
const DIRT_GID = 4; // tillable ground tile
const CLOCK_STEP_MS = 7000; // 10 in-game minutes every 7 real seconds
const DAY_END = 26 * 60; // 02:00 AM -> the player passes out
const AUTOSAVE_MS = 30000;

const propOf = (obj, name) => ((obj.properties || []).find((p) => p.name === name) || {}).value;

// The Farm: Tiled JSON map + HUD + the full farming loop (hoe/plant/water/harvest/sell).
export default class FarmScene extends Phaser.Scene {
  constructor() {
    super('Farm');
  }

  preload() {
    preloadAssets(this, [
      'map_farm', 'tiles_farm', 'soil_dry', 'soil_wet', 'player', 'animal_chicken', 'animal_cow',
      ...Object.keys(CROPS).map((id) => `cropsheet_${id}`),
      ...SFX_KEYS
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
    createCropTextures(this);
    createBinTexture(this);

    // --- map ---
    const map = this.make.tilemap({ key: 'map_farm' });
    this.map = map;
    const tiles = map.addTilesetImage('farm_tiles', 'tiles_farm');
    this.ground = map.createLayer('Ground', tiles, 0, 0).setDepth(0);
    this.objLayer = map.createLayer('Objects', tiles, 0, 0).setDepth(1);
    this.ground.setCollisionByProperty({ collides: true });
    this.setShedDoor(save.flags.shedOpen);
    const W = map.widthInPixels;
    const H = map.heightInPixels;
    this.physics.world.setBounds(0, 0, W, H);

    this.zones = map.getObjectLayer('Interact').objects.map((o) => ({
      action: propOf(o, 'action'),
      rect: new Phaser.Geom.Rectangle(o.x, o.y, o.width, o.height)
    }));
    const spawn = map.findObject('Points', (o) => o.name === 'spawn');
    const p = save.pos;
    let start = spawn;
    if (p && p.map === 'farm' && typeof p.x === 'number') start = p;
    else if (p && p.from) start = map.findObject('Points', (o) => o.name === `from_${p.from}`) || spawn;

    // Shipping Bin sprite (static decoration above the Objects layer).
    this.add.image(408, 160, 'bin').setOrigin(0.5, 1).setDepth(159);

    // --- plots (tilled soil + crops) ---
    this.plotViews = new Map();
    Object.keys(save.plots).forEach((key) => this.drawPlot(key));

    // --- animals (chickens / cows roaming the south-west pasture) ---
    this.animals = new AnimalManager(this, save);
    this.animals.spawnAll();

    // --- player ---
    this.facing = 'down';
    this.moving = false;
    this.lastTileKey = null;
    this.footsteps = createFootsteps(this);
    this.zone = null;
    this.realPlayer = usingRealPlayer(this);
    this.player = this.realPlayer
      ? this.physics.add.sprite(start.x, start.y, 'player', 0)
      : this.physics.add.sprite(start.x, start.y, `p_${this.gender}_down_0`);
    // feet-sized collider (the real 32x32 frame draws the body around y+8)
    if (this.realPlayer) this.player.body.setSize(10, 5).setOffset(11, 21);
    else this.player.body.setSize(8, 6).setOffset(4, 9);
    setPlayerDir(this, this.player, this.gender, 'down', false);
    this.player.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, [this.ground, this.objLayer]);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, W, H);
    cam.startFollow(this.player, true, 0.12, 0.12);

    applyWarmTint(this);
    createNightOverlay(this);
    updateDayNight(this, save.time.minutes);

    // --- HUD + controls ---
    this.hud = new Hud(this, save, { onMenu: () => this.openMenu() });
    this.refreshQuestLine();
    this.controls = new TouchControls(this, {
      onA: () => this.pressA(),
      onB: () => this.hud.nextRow()
    });
    this.onKey = (e) => {
      const n = Number(e.key);
      if (n >= 1 && n <= HOTBAR_SIZE) this.hud.select(n - 1);
      else if (e.key === 'Escape') this.openMenu();
    };
    this.input.keyboard.on('keydown', this.onKey);

    // --- clock + autosave ---
    this.time.addEvent({ delay: CLOCK_STEP_MS, loop: true, callback: () => this.tickClock() });
    this.time.addEvent({ delay: AUTOSAVE_MS, loop: true, callback: () => this.persist() });
    this.events.on(Phaser.Scenes.Events.PAUSE, this.persist, this); // tab hidden / app minimized
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.persist();
      this.footsteps.stop();
      this.controls.destroy();
      this.input.keyboard.off('keydown', this.onKey);
      this.events.off(Phaser.Scenes.Events.PAUSE, this.persist, this);
    });
  }

  // Swap the shed door tile and (re)apply tile collision.
  setShedDoor(open) {
    this.objLayer.replaceByIndex(open ? DOOR_CLOSED : DOOR_OPEN, open ? DOOR_OPEN : DOOR_CLOSED);
    this.objLayer.setCollisionByProperty({ collides: true });
  }

  // ---------------- plots ----------------
  tileUnderPlayer() {
    const feet = this.player.body.center;
    return { tx: Math.floor(feet.x / 16), ty: Math.floor(feet.y / 16) };
  }

  isTillable(tx, ty) {
    const tile = this.ground.getTileAt(tx, ty);
    return !!tile && tile.index === DIRT_GID;
  }

  drawPlot(key) {
    const plot = this.save.plots[key];
    const [tx, ty] = key.split(',').map(Number);
    let view = this.plotViews.get(key);
    if (!view) {
      view = {
        soil: this.add.image(tx * 16, ty * 16, 'soil_dry').setOrigin(0).setDepth(0.5),
        plant: this.add.image(tx * 16 + 8, ty * 16 + 16, 'soil_dry')
          .setOrigin(0.5, 1).setDepth(ty * 16 + 15).setVisible(false)
      };
      this.plotViews.set(key, view);
    }
    view.soil.setTexture(plot.watered ? 'soil_wet' : 'soil_dry');
    if (plot.crop) {
      const stage = Math.min(plot.grown, CROPS[plot.crop].days);
      const [key, frame] = cropFrame(this, plot.crop, stage);
      view.plant.setTexture(key, frame).setVisible(true);
    } else {
      view.plant.setVisible(false);
    }
  }

  // The action available on the tile the player stands on (null = nothing).
  farmActionAt(tx, ty) {
    if (!this.isTillable(tx, ty)) return null;
    const key = `${tx},${ty}`;
    const plot = this.save.plots[key];
    const item = this.hud.selectedItem();
    const seedCrop = item && ITEMS[item.id] ? ITEMS[item.id].seed : null;

    if (plot && isReady(plot)) return { kind: 'harvest', key };
    if (!plot) return item && item.id === 'hoe' ? { kind: 'till', key } : null;
    if (!plot.crop && seedCrop) return { kind: 'plant', key, crop: seedCrop };
    if (plot.crop && !plot.watered && item && item.id === 'watering_can') return { kind: 'water', key };
    return null;
  }

  doFarmAction(act) {
    const plots = this.save.plots;
    const inv = this.save.inventory;

    if (act.kind === 'till') {
      plots[act.key] = { crop: null, grown: 0, watered: false };
    } else if (act.kind === 'plant') {
      const index = inv.row * HOTBAR_SIZE + inv.sel;
      consumeSlot(inv, index);
      plots[act.key].crop = act.crop;
      plots[act.key].grown = 0;
      this.hud.refreshHotbar();
    } else if (act.kind === 'water') {
      plots[act.key].watered = true;
    } else if (act.kind === 'harvest') {
      const plot = plots[act.key];
      const crop = CROPS[plot.crop];
      const left = addItem(inv, crop.produce, 1);
      if (left > 0) { this.hud.toast(t('msg.bagFull'), '#C4553F'); playSfx(this, 'sfx_deny'); return; }
      delete plots[act.key];
      const view = this.plotViews.get(act.key);
      if (view) { view.soil.destroy(); view.plant.destroy(); this.plotViews.delete(act.key); }
      this.hud.toast(`+1 ${ITEMS[crop.produce].name}`, '#639922');
      this.hud.refreshHotbar();
    }

    playSfx(this, `sfx_${act.kind}`);
    this.hud.refresh();
    if (plots[act.key]) this.drawPlot(act.key);
    this.pulse(0xf6e7c1);
    this.gainXp(act.kind);
    this.checkQuest(act.kind);
    this.persist();
  }

  // ---------------- animals ----------------
  // What pressing A does with the animal next to the player (null = no animal nearby).
  animalAction() {
    const c = this.player.body.center;
    const a = this.animals.nearest(c.x, c.y, 22);
    if (!a) return null;
    const def = ANIMALS[a.data.type];
    if (a.data.ready) return { kind: 'collect', a, prompt: t('prompt.collect', { item: ITEMS[def.product].name }) };
    const item = this.hud.selectedItem();
    if (!a.data.fed && item && item.id === 'animal_feed') return { kind: 'feed', a, prompt: t('prompt.feed', { name: def.name }) };
    return { kind: 'hint', a, prompt: null };
  }

  doAnimalAction(act) {
    const def = ANIMALS[act.a.data.type];
    if (act.kind === 'hint') {
      this.hud.toast(act.a.data.fed ? t('msg.animalHappy', { name: def.name }) : t('msg.needFeed'), '#F6E7C1');
      return;
    }
    const inv = this.save.inventory;
    if (act.kind === 'feed') {
      consumeSlot(inv, inv.row * HOTBAR_SIZE + inv.sel);
      act.a.data.fed = true;
      this.hud.toast(t('msg.fed', { name: def.name }), '#639922');
      playSfx(this, 'sfx_plant');
    } else {
      if (addItem(inv, def.product, 1) > 0) { this.hud.toast(t('msg.bagFull'), '#C4553F'); playSfx(this, 'sfx_deny'); return; }
      act.a.data.ready = false;
      this.hud.toast(`+1 ${ITEMS[def.product].name}`, '#639922');
      playSfx(this, 'sfx_harvest');
    }
    this.animals.refreshBubble(act.a);
    this.hud.refresh();
    this.pulse(0xf6e7c1);
    this.gainXp(act.kind);
    this.persist();
  }

  // XP for an action; level-ups raise max stamina (see systems/xp.js).
  gainXp(kind) {
    const r = addXp(this.save, XP_GAIN[kind] || 0);
    this.hud.refresh();
    if (r.leveled) {
      this.time.delayedCall(700, () => {
        playSfx(this, 'jingle_quest');
        this.hud.toast(t('level.up', { level: r.level }), '#EF9F27');
      });
    }
  }

  // ---------------- interactions ----------------
  pressA() {
    if (this.hud.messageOpen()) { this.hud.hideMessage(); return; }
    if (this.zone) { this.interact(this.zone.action); return; }
    const animalAct = this.animalAction();
    if (animalAct) { this.doAnimalAction(animalAct); return; }
    const { tx, ty } = this.tileUnderPlayer();
    const act = this.farmActionAt(tx, ty);
    if (act) this.doFarmAction(act);
    else this.pulse(0xef9f27, '!');
  }

  interact(action) {
    const flags = this.save.flags;
    if (action === 'shed') {
      if (!flags.shedOpen) {
        flags.shedOpen = true;
        this.setShedDoor(true);
        this.cameras.main.shake(120, 0.003);
        playSfx(this, 'sfx_door');
        this.hud.showMessage(t('shed.unlock'));
        this.checkQuest('shed');
        this.persist();
      } else {
        this.sleep();
      }
    } else if (action === 'sign') {
      this.hud.showMessage(t('sign.farm'));
    } else if (action === 'to_village') {
      this.travel('village');
    } else if (action === 'to_beach') {
      this.travel('beach');
    } else if (action === 'to_forest') {
      this.travel('forest');
    } else if (action === 'bin') {
      this.sellHarvest();
    }
  }

  // Shipping Bin: sell every harvested crop in the bag for coins.
  sellHarvest() {
    const inv = this.save.inventory;
    let coins = 0;
    let count = 0;
    inv.slots.forEach((s, i) => {
      if (!s) return;
      const def = ITEMS[s.id];
      if (!def || !def.price) return;
      coins += def.price * s.qty;
      count += s.qty;
      inv.slots[i] = null;
    });
    if (!coins) { this.hud.showMessage(t('bin.empty')); playSfx(this, 'sfx_deny'); return; }
    this.save.coins += coins;
    playSfx(this, 'sfx_coins');
    this.hud.refresh();
    this.hud.toast(`+${coins}g`, '#EF9F27');
    this.hud.showMessage(t('bin.sold', { count, coins }));
    this.checkQuest('sell');
    this.persist();
  }

  // ---------------- time ----------------
  tickClock() {
    const time = this.save.time;
    if (this.hud.messageOpen()) return;
    time.minutes += 10;
    this.hud.refreshTime();
    updateDayNight(this, time.minutes);
    if (time.minutes >= DAY_END) this.sleep(true);
  }

  sleep(passedOut = false) {
    if (this.sleeping) return;
    this.sleeping = true;
    const cam = this.cameras.main;
    cam.fadeOut(400, 0, 0, 0);
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.newDay(passedOut);
      cam.fadeIn(500, 0, 0, 0);
      this.sleeping = false;
    });
  }

  // Grow every watered crop, reset the clock and refill stamina.
  newDay(passedOut) {
    const save = this.save;
    save.time.day += 1;
    save.time.minutes = 360; // 06:00 AM
    Object.keys(save.plots).forEach((key) => {
      const plot = save.plots[key];
      if (plot.crop && plot.watered) plot.grown = Math.min(plot.grown + 1, CROPS[plot.crop].days);
      plot.watered = false;
      this.drawPlot(key);
    });
    this.animals.newDay();
    this.hud.refresh();
    playSfx(this, 'jingle_day');
    this.hud.showMessage(passedOut ? t('day.passedOut') : t('day.new', { day: save.time.day }));
    this.persist();
  }

  // ---------------- quest ----------------
  checkQuest(action) {
    const finished = advanceQuest(this.save, action);
    this.refreshQuestLine();
    this.hud.refresh();
    if (finished) {
      playSfx(this, 'jingle_quest');
      const hen = newAnimal('chicken');
      this.save.animals.push(hen);
      this.animals.spawn(hen);
      addItem(this.save.inventory, 'animal_feed', 3);
      this.hud.refreshHotbar();
      this.hud.showMessage(t('quest.shed.complete', { coins: QUEST_REWARD }));
      this.hud.toast(`+${QUEST_REWARD}g`, '#EF9F27');
    }
  }

  refreshQuestLine() {
    const key = questObjectiveKey(this.save.quest);
    this.hud.setQuest(key ? t('quest.label', { goal: t(key) }) : null);
  }

  // ---------------- prompts / misc ----------------
  promptFor(action) {
    if (action === 'shed') return this.save.flags.shedOpen ? t('prompt.sleep') : t('prompt.openShed');
    if (action === 'sign') return t('prompt.readSign');
    if (action === 'bin') return t('prompt.sell');
    if (action === 'to_village') return t('prompt.toVillage');
    if (action === 'to_beach') return t('prompt.toBeach');
    if (action === 'to_forest') return t('prompt.toForest');
    return null;
  }

  travel(to) {
    if (this.leaving) return;
    this.leaving = true;
    playSfx(this, 'sfx_door');
    this.save.pos = { map: to, from: 'farm' };
    writeSave(this.save);
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start({ beach: 'Beach', forest: 'Forest' }[to] || 'Village');
    });
  }

  persist() {
    if (!this.player || !this.save || this.leaving) return;
    this.save.pos = { map: 'farm', x: Math.round(this.player.x), y: Math.round(this.player.y) };
    writeSave(this.save);
  }

  openMenu() {
    this.persist();
    goTo(this, 'Menu', { from: 'Farm' });
  }

  pulse(color, label) {
    this.player.setTint(color);
    this.tweens.add({
      targets: this.player,
      scale: { from: 1, to: 1.15 },
      duration: 120,
      yoyo: true,
      onComplete: () => this.player.clearTint()
    });
    if (label) {
      const p = makeText(this, this.player.x, this.player.y - 14, label, 8, '#EF9F27').setDepth(1200);
      this.tweens.add({ targets: p, y: p.y - 10, alpha: 0, duration: 450, onComplete: () => p.destroy() });
    }
  }

  update(time, delta) {
    if (!this.player) return;
    this.animals.update(delta);
    const move = this.controls.getMove();
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

    // splash when the player steps onto a freshly watered (wet) soil tile
    const under = this.tileUnderPlayer();
    const tileKey = `${under.tx},${under.ty}`;
    if (tileKey !== this.lastTileKey) {
      this.lastTileKey = tileKey;
      const wet = this.save.plots[tileKey];
      if (moving && wet && wet.watered) playSfx(this, 'sfx_splash');
    }

    // contextual prompt: interact zone first, then the tile under the player
    const feet = this.player.body.center;
    this.zone = this.zones.find((z) => z.rect.contains(feet.x, feet.y)) || null;
    let label = null;
    if (!this.hud.messageOpen()) {
      if (this.zone) label = this.promptFor(this.zone.action);
      else {
        const animalAct = this.animalAction();
        if (animalAct && animalAct.prompt) label = animalAct.prompt;
        else if (!animalAct) {
          const { tx, ty } = this.tileUnderPlayer();
          const act = this.farmActionAt(tx, ty);
          if (act) label = t(`prompt.${act.kind}`);
        }
      }
    }
    this.hud.setPrompt(label ? t('prompt.tapA', { action: label }) : null);
    this.hud.placePrompt(this.player.x, this.player.y - 18);
  }
}
