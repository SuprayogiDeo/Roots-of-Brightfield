import Phaser from 'phaser';
import { t } from '../i18n/index.js';
import { makeText, goTo } from '../systems/ui.js';
import { applyWarmTint, preloadAssets } from '../systems/assets.js';
import { createFarmTileset, createPlayerTextures, setPlayerDir, usingRealPlayer } from '../systems/farmArt.js';
import TouchControls from '../systems/touchControls.js';
import Hud, { HOTBAR_SIZE } from '../systems/hud.js';
import { loadSave, writeSave } from '../systems/save.js';
import { CROPS, isReady, cropFrame, createCropTextures, createBinTexture } from '../systems/crops.js';
import { createKitchenTexture, addKitchen } from '../systems/crafting.js';
import { ITEMS, addItem, consumeSlot } from '../systems/items.js';
import { createWeatherFx } from '../systems/weatherFx.js';
import { playMusicFor } from '../systems/music.js';
import { festivalNote } from '../systems/festivals.js';
import { reportQuest, reportVisit, refreshTracker, flushQueuedQuests } from '../systems/questUi.js';
import { advanceDay, applyRain, canGrowIn, isWet } from '../systems/calendar.js';
import { playSfx, SFX_KEYS, createFootsteps } from '../systems/audio.js';
import { createNightOverlay, updateDayNight } from '../systems/daynight.js';
import { AnimalManager, ANIMALS, newAnimal } from '../systems/animals.js';
import { addXp, XP_GAIN } from '../systems/xp.js';
import ActionRig, { fxPlant, fxHarvest, fxFeed, fxCollect } from '../systems/toolAnim.js';

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
      'map_farm', 'tiles_farm', 'soil_dry', 'soil_wet', 'player', 'player_actions', 'animal_chicken', 'animal_cow', 'kitchen',
      ...Object.keys(CROPS).map((id) => `cropsheet_${id}`),
      ...SFX_KEYS
    ]);
  }

  create() {
    this.leaving = false;
    const save = loadSave();
    if (!save) { this.scene.start('Title'); return; }
    this.save = save;
    playMusicFor(this, 'farm', save);
    this.gender = save.player.gender;

    this.cameras.main.fadeIn(250, 0, 0, 0);
    createFarmTileset(this);
    createPlayerTextures(this, this.gender);
    createCropTextures(this);
    createBinTexture(this);
    createKitchenTexture(this);

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
    addKitchen(this, 400, 112); // cooking station north of the field

    // --- plots (tilled soil + crops) ---
    applyRain(save); // a rainy day waters every plot (once per day)
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
    // tool swing / crouch overlay + movement lock (Step 4.3)
    this.rig = new ActionRig(this, this.player);
    this.physics.add.collider(this.player, [this.ground, this.objLayer]);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, W, H);
    cam.startFollow(this.player, true, 0.12, 0.12);

    applyWarmTint(this);
    createNightOverlay(this);
    updateDayNight(this, save.time.minutes);
    createWeatherFx(this, save);

    // --- HUD + controls ---
    this.hud = new Hud(this, save, { onMenu: () => this.openMenu() });
    refreshTracker(this);
    flushQueuedQuests(this); // e.g. a dish cooked in the Kitchen screen
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
    if (!plot.crop && seedCrop) {
      return canGrowIn(CROPS[seedCrop], this.save.time.season)
        ? { kind: 'plant', key, crop: seedCrop }
        : { kind: 'offseason', key, crop: seedCrop };
    }
    if (plot.crop && !plot.watered && item && item.id === 'watering_can') return { kind: 'water', key };
    return null;
  }

  doFarmAction(act) {
    const plots = this.save.plots;
    const inv = this.save.inventory;

    if (act.kind === 'till') {
      plots[act.key] = { crop: null, grown: 0, watered: false };
    } else if (act.kind === 'plant') {
      const index = act.slot ?? (inv.row * HOTBAR_SIZE + inv.sel); // slot captured when A was pressed
      consumeSlot(inv, index);
      plots[act.key].crop = act.crop;
      plots[act.key].grown = 0;
      this.hud.refreshHotbar();
    } else if (act.kind === 'water') {
      plots[act.key].watered = true;
    } else if (act.kind === 'harvest') {
      const plot = plots[act.key];
      act.cropId = plot.crop;
      const crop = CROPS[plot.crop];
      const left = addItem(inv, crop.produce, 1);
      if (left > 0) { this.hud.toast(t('msg.bagFull'), '#C4553F'); playSfx(this, 'sfx_deny'); return false; }
      delete plots[act.key];
      const view = this.plotViews.get(act.key);
      if (view) { view.soil.destroy(); view.plant.destroy(); this.plotViews.delete(act.key); }
      this.hud.toast(`+1 ${ITEMS[crop.produce].name}`, '#639922');
      this.hud.refreshHotbar();
    }

    playSfx(this, `sfx_${act.kind}`);
    this.hud.refresh();
    if (plots[act.key]) this.drawPlot(act.key);
    if (!this.rig.ready) this.pulse(0xf6e7c1); // placeholder art only; real art has the pose + effects
    this.gainXp(act.kind);
    this.checkQuest(act.kind, { crop: act.cropId || act.crop });
    this.persist();
    return true;
  }

  // Play the pose for a farm action; the action itself is committed on the impact frame.
  startFarmAction(act) {
    const inv = this.save.inventory;
    act.slot = inv.row * HOTBAR_SIZE + inv.sel;
    const [tx, ty] = act.key.split(',').map(Number);
    const cx = tx * 16 + 8;
    const cy = ty * 16 + 8;
    const done = () => this.restoreIdle();
    if (act.kind === 'till' || act.kind === 'water') {
      this.rig.playTool(act.kind === 'till' ? 'hoe' : 'water', this.facing, {
        onImpact: () => { if (!this.sleeping) this.doFarmAction(act); },
        onDone: done
      });
      return;
    }
    this.rig.playCrouch(this.facing, {
      onImpact: () => {
        if (this.sleeping || !this.doFarmAction(act)) return;
        if (act.kind === 'plant') fxPlant(this, cx, cy + 2, (this.plotViews.get(act.key) || {}).plant);
        else fxHarvest(this, cx, cy);
      },
      onDone: done
    });
  }

  // Back to the normal idle pose after an action (a held joystick takes over on the next frame).
  restoreIdle() {
    setPlayerDir(this, this.player, this.gender, this.facing, false);
  }

  faceToward(x, y) {
    const c = this.player.body.center;
    const dx = x - c.x;
    const dy = y - c.y;
    this.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
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

  // Face the animal, bend down, and commit feed / collect at the lowest point.
  startAnimalAction(act) {
    if (act.kind === 'hint') { this.doAnimalAction(act); return; }
    const inv = this.save.inventory;
    act.slot = inv.row * HOTBAR_SIZE + inv.sel;
    const s = act.a.sprite;
    this.faceToward(s.x, s.y);
    this.rig.playCrouch(this.facing, {
      onImpact: () => {
        if (this.sleeping || !this.doAnimalAction(act)) return;
        (act.kind === 'feed' ? fxFeed : fxCollect)(this, s.x, s.y);
      },
      onDone: () => this.restoreIdle()
    });
  }

  doAnimalAction(act) {
    const def = ANIMALS[act.a.data.type];
    if (act.kind === 'hint') {
      this.hud.toast(act.a.data.fed ? t('msg.animalHappy', { name: def.name }) : t('msg.needFeed'), '#F6E7C1');
      return true;
    }
    const inv = this.save.inventory;
    if (act.kind === 'feed') {
      consumeSlot(inv, act.slot ?? (inv.row * HOTBAR_SIZE + inv.sel));
      act.a.data.fed = true;
      this.hud.toast(t('msg.fed', { name: def.name }), '#639922');
      playSfx(this, 'sfx_plant');
    } else {
      if (addItem(inv, def.product, 1) > 0) { this.hud.toast(t('msg.bagFull'), '#C4553F'); playSfx(this, 'sfx_deny'); return false; }
      act.a.data.ready = false;
      this.hud.toast(`+1 ${ITEMS[def.product].name}`, '#639922');
      playSfx(this, 'sfx_harvest');
    }
    this.animals.refreshBubble(act.a);
    this.hud.refresh();
    if (!this.rig.ready) this.pulse(0xf6e7c1);
    this.gainXp(act.kind);
    this.checkQuest(act.kind, { item: def.product });
    this.persist();
    return true;
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
    if (this.rig.busy) return; // locked while a tool swing / crouch plays
    if (this.hud.messageOpen()) { this.hud.hideMessage(); return; }
    if (this.zone) { this.interact(this.zone.action); return; }
    const animalAct = this.animalAction();
    if (animalAct) { this.startAnimalAction(animalAct); return; }
    const { tx, ty } = this.tileUnderPlayer();
    const act = this.farmActionAt(tx, ty);
    if (act && act.kind === 'offseason') this.offSeasonHint(act);
    else if (act) this.startFarmAction(act);
    else this.pulse(0xef9f27, '!');
  }

  // Seed does not grow in this season: explain which seasons it likes.
  offSeasonHint(act) {
    const crop = CROPS[act.crop];
    const seasons = crop.seasons.map((s) => t(`season.${s}`)).join(', ');
    playSfx(this, 'sfx_deny');
    this.hud.toast(t('msg.offseason', { season: t(`season.${this.save.time.season}`) }), '#C4553F');
    this.hud.showMessage(t('msg.offseasonInfo', { crop: ITEMS[crop.produce].name, seasons }));
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
    } else if (action === 'kitchen') {
      this.persist();
      goTo(this, 'Craft', { from: 'Farm' });
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
    this.checkQuest('sell', { count });
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

  // Grow every watered crop, move the calendar, let rain water the plots, report the new day.
  newDay(passedOut) {
    const save = this.save;
    Object.keys(save.plots).forEach((key) => {
      const plot = save.plots[key];
      if (plot.crop && plot.watered) plot.grown = Math.min(plot.grown + 1, CROPS[plot.crop].days);
      plot.watered = false;
    });
    const day = advanceDay(save, CROPS); // total+1, season / day, 06:00, withers off-season crops
    applyRain(save);                      // rain or storm: every plot is watered again
    Object.keys(save.plots).forEach((key) => this.drawPlot(key));
    this.animals.newDay();
    this.hud.refresh();
    playSfx(this, 'jingle_day');
    playMusicFor(this, 'farm', save); // the season may have changed (winter songs)

    const lines = [passedOut ? t('day.passedOut') : t('day.new', { day: save.time.day })];
    if (day.seasonChanged) lines.push(t('season.new', { season: t(`season.${save.time.season}`) }));
    if (day.withered.length) lines.push(t('season.wither', { n: day.withered.length }));
    if (isWet(day.weather)) lines.push(t('weather.rainWater'));
    lines.push(t('weather.forecast', { weather: t(`weather.${day.forecast}`) }));
    const festNote = festivalNote(save); // "Today is the Morning Market..." / "Tomorrow: ..."
    if (festNote) lines.push(festNote);
    if (save.time.day === 28) lines.push(t('season.last'));
    this.hud.showMessage(lines.join('\n'));
    if (day.seasonChanged) this.time.delayedCall(5400, () => this.checkQuest('season', { season: save.time.season }));
    this.persist();
  }

  // ---------------- quest ----------------
  checkQuest(type, payload) {
    reportQuest(this, type, payload);
    this.hud.refresh();
  }

  // ---------------- prompts / misc ----------------
  promptFor(action) {
    if (action === 'shed') return this.save.flags.shedOpen ? t('prompt.sleep') : t('prompt.openShed');
    if (action === 'sign') return t('prompt.readSign');
    if (action === 'bin') return t('prompt.sell');
    if (action === 'kitchen') return t('prompt.cook');
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
    if (this.rig && this.rig.busy) return;
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
    if (this.rig.busy) { // movement is locked during a tool swing / crouch
      this.player.setVelocity(0, 0);
      this.moving = false;
      this.footsteps.update(false, false, delta);
      this.hud.setPrompt(null);
      return;
    }
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
