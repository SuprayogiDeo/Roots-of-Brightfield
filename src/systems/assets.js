// ---------------------------------------------------------------------------
// ASSET-KEY LAYER
// Every art/sound asset is referenced by a KEY only. When the real files
// arrive, they go into public/assets/ and get ONE line in ASSET_MANIFEST;
// any key not in the manifest is drawn as a colored-rectangle placeholder,
// so swapping in real art later touches ONLY this file.
//
// Planned keys (fill in as files are uploaded):
//   player   : { src: 'assets/characters/player.png', frameWidth: 16, frameHeight: 16 }
//   tiles    : { src: 'assets/tiles/sproutlands_tiles.png', frameWidth: 16, frameHeight: 16 }
//   farm     : { src: 'assets/maps/farm.json' }            (Tiled JSON)
//   sfx      : { src: 'assets/sfx/kenney_*.ogg' }
// ---------------------------------------------------------------------------

export const BEACH_PROPS = [
  'palm_a', 'palm_b', 'palm_big', 'palm_pair', 'rock_big', 'rock_tall', 'rock_s1', 'rock_s2',
  'shell_star', 'shell_blue', 'shell_pink', 'pebble', 'coconut', 'boat', 'barrel1', 'barrel2'
];
export const FOREST_PROPS = [
  'oak_green', 'oak_yellow', 'oak_orange', 'pine_a', 'pine_b', 'pine_c', 'pine_big_a', 'pine_big_b',
  'bush_a', 'bush_b', 'bush_small', 'rock_a', 'rock_b', 'rock_s',
  'flower_o', 'flower_w', 'flower_b', 'mush_a', 'mush_b', 'fern'
];
export const MINE_PROPS = [
  'node_stone', 'node_copper', 'node_gold', 'node_aquamarine', 'node_ruby', 'node_emerald', 'node_amethyst',
  'rubble', 'mine_rock_big', 'crystal', 'mine_entrance'
];
export const ORE_IDS = ['stone', 'copper_ore', 'gold_ore', 'aquamarine', 'ruby', 'emerald', 'amethyst'];
export const FISH_IDS = [
  'fish_sardine', 'fish_mackerel', 'fish_bass', 'fish_catfish', 'fish_snapper', 'fish_golden_carp'
];

export const ASSET_MANIFEST = {
  // Tiled map (real file). Tile ids inside it match the tileset below.
  map_farm: { type: 'tilemap', src: 'assets/maps/farm.json' },
  map_village: { type: 'tilemap', src: 'assets/maps/village.json' },

  // Real art — Cute Fantasy (Kenmi), 16x16 tiles / 32x32 character frames.
  tiles_farm: { type: 'image', src: 'assets/tiles/farm_tiles.png' },
  soil_dry: { type: 'image', src: 'assets/tiles/soil_dry.png' },
  soil_wet: { type: 'image', src: 'assets/tiles/soil_wet.png' },
  player: { type: 'spritesheet', src: 'assets/characters/player.png', frameWidth: 32, frameHeight: 32 },
  // Tool / action poses (Step 4.3): 48x48 frames, 2 columns (wind-up, strike), 12 rows. See systems/toolAnim.js.
  player_actions: { type: 'spritesheet', src: 'assets/characters/player_actions.png', frameWidth: 48, frameHeight: 48 },

  // Crop growth stages — Sunnyside World, one 16x16 frame per stage.
  cropsheet_carrot: { type: 'spritesheet', src: 'assets/crops/carrot.png', frameWidth: 16, frameHeight: 16 },
  cropsheet_corn: { type: 'spritesheet', src: 'assets/crops/corn.png', frameWidth: 16, frameHeight: 16 },
  cropsheet_chili: { type: 'spritesheet', src: 'assets/crops/chili.png', frameWidth: 16, frameHeight: 16 },
  cropsheet_tomato: { type: 'spritesheet', src: 'assets/crops/tomato.png', frameWidth: 16, frameHeight: 16 },

  // Animals — Cute Fantasy (Kenmi), 2x2 frames of 32x32 (0-1 idle, 2-3 walk, facing left).
  animal_chicken: { type: 'spritesheet', src: 'assets/animals/chicken.png', frameWidth: 32, frameHeight: 32 },
  animal_cow: { type: 'spritesheet', src: 'assets/animals/cow.png', frameWidth: 32, frameHeight: 32 },

  // Beach (Step 4.1) — Time Fantasy beach tileset (finalbossblues) + Free Fishing pack (CraftPix).
  map_beach: { type: 'tilemap', src: 'assets/maps/beach.json' },
  tiles_beach: { type: 'image', src: 'assets/tiles/beach_tiles.png' },
  ...Object.fromEntries(BEACH_PROPS.map((n) => [`prop_${n}`, { type: 'image', src: `assets/beach/${n}.png` }])),
  ...Object.fromEntries(FISH_IDS.map((n) => [`item_${n}`, { type: 'image', src: `assets/items/${n}.png` }])),
  item_fishing_rod: { type: 'image', src: 'assets/items/fishing_rod.png' },

  // Forest (Step 4.1b) — Pixel Crawler Free Pack (Anokolisa): trees, bushes, rocks, flowers, mushrooms.
  map_forest: { type: 'tilemap', src: 'assets/maps/forest.json' },
  tiles_forest: { type: 'image', src: 'assets/tiles/forest_tiles.png' },
  ...Object.fromEntries(FOREST_PROPS.map((n) => [`prop_${n}`, { type: 'image', src: `assets/forest/${n}.png` }])),

  // Mine (Step 4.2) — floor/wall tiles + rocks: Pixel Crawler Free Pack (Anokolisa);
  // ore icons, ore nodes and pickaxe: "16x16 Cave Items" spritesheet (see CREDITS.md).
  map_mine: { type: 'tilemap', src: 'assets/maps/mine.json' },
  tiles_mine: { type: 'image', src: 'assets/tiles/mine_tiles.png' },
  ...Object.fromEntries(MINE_PROPS.map((n) => [`prop_${n}`, { type: 'image', src: `assets/mine/${n}.png` }])),
  ...Object.fromEntries(ORE_IDS.map((n) => [`item_${n}`, { type: 'image', src: `assets/items/${n}.png` }])),
  item_pickaxe: { type: 'image', src: 'assets/items/pickaxe.png' },

  // Item icons (16x16) — Sunnyside World. Key = `item_<id>`; others are still code-drawn.
  item_egg: { type: 'image', src: 'assets/items/egg.png' },
  item_milk: { type: 'image', src: 'assets/items/milk.png' },

  // Sound — Kenney (CC0)
  sfx_click: { type: 'audio', src: 'assets/sfx/sfx_click.ogg' },
  sfx_till: { type: 'audio', src: 'assets/sfx/sfx_till.ogg' },
  sfx_plant: { type: 'audio', src: 'assets/sfx/sfx_plant.ogg' },
  // Watering the crop — freesound_community "water-splash-102492" (see CREDITS.md). ogg + mp3 fallback.
  sfx_water: { type: 'audio', src: ['assets/sfx/sfx_water.ogg', 'assets/sfx/sfx_water.mp3'] },
  // Water splash when stepping on wet (watered) soil — freesound_community "splash-6213".
  sfx_splash: { type: 'audio', src: ['assets/sfx/sfx_splash.ogg', 'assets/sfx/sfx_splash.mp3'] },
  // Looping wet footsteps while walking — spinopel "water-splash-290839" (seamless loop).
  sfx_steps_wet: { type: 'audio', src: ['assets/sfx/sfx_steps_wet.ogg', 'assets/sfx/sfx_steps_wet.mp3'] },
  sfx_harvest: { type: 'audio', src: 'assets/sfx/sfx_harvest.ogg' },
  sfx_coins: { type: 'audio', src: 'assets/sfx/sfx_coins.ogg' },
  sfx_door: { type: 'audio', src: 'assets/sfx/sfx_door.ogg' },
  sfx_deny: { type: 'audio', src: 'assets/sfx/sfx_deny.ogg' },
  jingle_quest: { type: 'audio', src: 'assets/sfx/jingle_quest.ogg' },
  jingle_day: { type: 'audio', src: 'assets/sfx/jingle_day.ogg' }
};

export function hasRealAsset(key) {
  return !!ASSET_MANIFEST[key];
}

// Queue the real files for the given keys (call from a scene's preload()).
// Keys without a manifest entry are skipped -> the scene draws a placeholder.
export function preloadAssets(scene, keys) {
  keys.forEach((key) => {
    const a = ASSET_MANIFEST[key];
    if (!a || scene.textures.exists(key) || scene.cache.tilemap.exists(key)
      || scene.cache.audio.exists(key)) return;
    if (a.type === 'tilemap') scene.load.tilemapTiledJSON(key, a.src);
    else if (a.type === 'audio') scene.load.audio(key, a.src);
    else if (a.type === 'spritesheet') {
      scene.load.spritesheet(key, a.src, { frameWidth: a.frameWidth, frameHeight: a.frameHeight });
    } else scene.load.image(key, a.src);
  });
}

// ---------------------------------------------------------------------------
// WARM TINT option — a global warm overlay that fixes over-bright pastel
// palettes (placeholder art and Sprout Lands both read too cold/bright).
// Stored separately from the save so it survives "New game".
// ---------------------------------------------------------------------------

const WARM_KEY = 'rob_warm';

export function warmEnabled() {
  try {
    const v = localStorage.getItem(WARM_KEY);
    if (v === '0') return false;
    if (v === '1') return true;
  } catch (e) { /* storage blocked */ }
  return true; // default ON
}

export function setWarm(on) {
  try { localStorage.setItem(WARM_KEY, on ? '1' : '0'); } catch (e) { /* ignore */ }
}

// Full-screen warm overlay pinned to the screen (scrollFactor 0).
// depth 900 = above the world, below the HUD (depth 1000). Idempotent.
export function applyWarmTint(scene) {
  if (!warmEnabled() || scene.warmTint) return;
  const rect = scene.add.rectangle(0, 0, scene.scale.width, 270, 0xffc98a, 0.32)
    .setOrigin(0)
    .setScrollFactor(0)
    .setDepth(900)
    .setBlendMode(Phaser.BlendModes.MULTIPLY);
  scene.warmTint = rect;
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    rect.destroy();
    scene.warmTint = null;
  });
  return rect;
}
