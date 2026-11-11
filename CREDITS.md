# CREDITS — Roots of Brightfield

## Art

### Cute Fantasy (Free version) — by **Kenmi**
Used for: farm tileset (grass, flowers, weeds, dirt, path, water, fences, bush, rocks, stump,
sign), the Old Shed (roof / wall / door tiles), tilled soil, and the player character
(32x32, 6-frame idle + walk animations).
- Source: Kenmi on itch.io — "Cute Fantasy RPG" free pack (file `Cute_Fantasy_Free.zip`,
  includes `read_me.txt` with the license).
- License (free version, from `read_me.txt`): may be used in **non-commercial** projects, may be
  modified, **may not be redistributed or resold**, even if modified.
- Files in this repo derived from the pack:
  - `public/assets/tiles/farm_tiles.png` — 128x32 tileset composed from `Tiles/*`,
    `Outdoor decoration/Fences.png`, `Outdoor_Decor_Free.png`, `Oak_Tree_Small.png`,
    `House_1_Wood_Base_Blue.png`.
  - `public/assets/tiles/soil_dry.png` / `soil_wet.png` — from `Tiles/FarmLand_Tile.png`.
  - `public/assets/characters/player.png` — unmodified copy of `Player/Player.png`.
  - `public/assets/characters/player_actions.png` — unmodified copy of `Player/Player_Actions.png`
    (tool poses: pickaxe, axe, hoe, watering can).

### Sunnyside World Asset Pack V2.1 — by **Daniel Diggle (RareCandy)**
Used for: crop growth stages.
- Files: `public/assets/crops/carrot.png`, `corn.png`, `chili.png`, `tomato.png` — 16x16 frame
  strips assembled from `Sunnyside_World_Assets/Elements/Crops/*`.
- Mapping (the pack has no corn/chili/tomato sprites): Carrot = `carrot`, Corn = `wheat`,
  Chili = `radish`, Tomato = `beetroot`.
- License: see the pack's own license page / readme (keep the original download for reference).

### Animals and item icons (Step 3.1)
- `public/assets/animals/chicken.png`, `cow.png` — unmodified copies of Cute Fantasy (Kenmi) free pack
  `Animals/Chicken/Chicken.png` and `Animals/Cow/Cow.png` (same license as above: non-commercial,
  no redistribution).
- `public/assets/items/egg.png`, `milk.png` — Sunnyside World (Daniel Diggle) `Elements/Crops/egg.png`
  and `milk.png`, centered on a 16x16 transparent canvas (same license as the Sunnyside entry).

### Audio — by **Kenney** (kenney.nl), license **CC0 1.0 (public domain)**
- `sfx_click.ogg` — UI Audio `click1.ogg`
- `sfx_till.ogg` — RPG Audio `footstep00.ogg`
- `sfx_plant.ogg` — RPG Audio `cloth1.ogg`
- `sfx_water.ogg` / `.mp3` — (replaced, no longer Kenney) see "Water sounds" below
- `sfx_harvest.ogg` — RPG Audio `knifeSlice.ogg`
- `sfx_coins.ogg` — RPG Audio `handleCoins.ogg`
- `sfx_door.ogg` — RPG Audio `doorOpen_1.ogg`
- `sfx_deny.ogg` — Digital Audio `lowDown.ogg`
- `jingle_quest.ogg` — Music Jingles `jingles_STEEL09.ogg`
- `jingle_day.ogg` — Music Jingles `jingles_PIZZI00.ogg`

### Water sounds (Freesound / Pixabay, converted to ogg + mp3)
- `sfx_water` (watering a crop) — freesound_community, "water-splash-102492".
- `sfx_splash` (stepping on wet soil) — freesound_community, "splash-6213".
- `sfx_steps_wet` (wet footsteps loop while walking, Farm + Village) — spinopel, "water-splash-290839";
  the clip is trimmed into a seamless loop (tail crossfaded into the head).
- Check each file's license on its original page before publishing the game commercially.

### Beach + Fishing (Step 4.1)
- **Time Fantasy — Beach Tileset** by **finalbossblues** (timefantasy.net; free release, credit the artist).
  Used for: sand/water/palm/rock/shell/pier pixels. `public/assets/tiles/beach_tiles.png` is a 16x16 sheet
  composed from `beach_tileset.png` (sand, water, pier planks) plus shoreline and grass-to-sand edge tiles
  generated from its colours. `public/assets/beach/*.png` (palms, rocks, shells, coconut) are crops of it.
- **Free Fishing Game Assets — Pixel Art Pack** (CraftPix.net, free pack; do not redistribute the files as a pack).
  Used for: fish icons and rod icon (`public/assets/items/fish_*.png`, `fishing_rod.png`, downscaled 32->16 from
  `4 Icons`), the boat and barrels (`public/assets/beach/boat.png`, `barrel1/2.png`).
- Not used (yet): `Beach.zip` (sand-castle sprite sheets), the Fisherman character animations.

### Forest (Step 4.1b)
- **Pixel Crawler — Free Pack (Exterior 0.1)** by **Anokolisa** (credit appreciated, not required; commercial use of the
  game is allowed, but the assets themselves may not be resold or redistributed as an asset pack).
  Used for: tree, bush, rock, flower, mushroom and fern sprites (`public/assets/forest/*.png`, cropped from
  `Environment/Props/Static/*`). `public/assets/tiles/forest_tiles.png` (grass + dirt-trail autotile) is generated
  from the pack's grass and dirt colour palettes.

### Mine (Step 4.2)
- **Pixel Crawler — Free Pack (Exterior 0.1)** by **Anokolisa** (same terms as the Forest entry above; `Terms.txt`:
  commercial use allowed, may be altered, the assets may not be resold as an asset pack).
  Used for: `public/assets/tiles/mine_tiles.png` (128x48, 16x16 tiles: stone floor from `Tilesets/Floors_Tiles.png`,
  rock wall top and cliff face from `Tilesets/Wall_Tiles.png`, plus darkened floor-edge tiles, a ladder tile and an exit
  mat generated from those colours), and `public/assets/mine/node_stone.png`, `rubble.png`, `mine_rock_big.png`,
  `crystal.png` (cropped from `Environment/Props/Static/Rocks.png`).
  `public/assets/mine/mine_entrance.png` (32x32) was composed for this project from the same wall tiles plus pixels
  drawn in the same palette.
- **16x16 Cave Items** (spritesheet `Cave_Items_Spritesheet.png`, 112x80, 16x16 cells). **Author and license: NOT
  VERIFIED** — the downloaded zip contains no license file or author name. TODO: open the original download page and
  fill in author, URL and license here before publishing the game. Used for: item icons
  (`public/assets/items/stone.png`, `copper_ore.png`, `gold_ore.png`, `aquamarine.png`, `ruby.png`, `emerald.png`,
  `amethyst.png`, `pickaxe.png`) and the six ore node sprites (`public/assets/mine/node_copper|gold|aquamarine|ruby|emerald|amethyst.png`).
  Unmodified 16x16 cells (nodes trimmed to their pixels). Not used yet: metal bars and swords on the same sheet.
- Torches and their glow are drawn in code (no art file).

### Not used yet (kept out of the repo until needed)
- The rest of **Sunnyside World** (village, NPCs, UI) — planned for Phase 2.
- The rest of **Pixel Crawler** (dungeon props, mobs, NPCs, stations such as Furnace/Anvil) — candidates for crafting and NPCs.
- The Sunnyside `.aseprite` character file (source file, not needed at runtime).

## Code
- Phaser 3 (MIT), Vite (MIT), vite-plugin-pwa (MIT).
- All game code written for this project.

## Fonts
- Press Start 2P / pixel styling — SIL Open Font License (OFL).

## Placeholders still in use
- Item icons, UI buttons, joystick, the title logo and PWA icons are still code-drawn placeholders.
- The three villagers (Mina, Rangga, Ayu) reuse `Player/Player.png` with a colour tint until real
  NPC sheets are added.
- The Village map reuses the same `farm_tiles.png` tileset (Cute Fantasy).

> NOTE: because Cute Fantasy's free license is non-commercial and forbids redistribution,
> this repo should stay a non-commercial hobby project (or the art must be replaced /
> a paid license bought) — and the art files must not be re-published as an asset pack.
