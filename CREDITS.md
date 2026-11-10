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
- `sfx_water.ogg` — RPG Audio `metalPot1.ogg`
- `sfx_harvest.ogg` — RPG Audio `knifeSlice.ogg`
- `sfx_coins.ogg` — RPG Audio `handleCoins.ogg`
- `sfx_door.ogg` — RPG Audio `doorOpen_1.ogg`
- `sfx_deny.ogg` — Digital Audio `lowDown.ogg`
- `jingle_quest.ogg` — Music Jingles `jingles_STEEL09.ogg`
- `jingle_day.ogg` — Music Jingles `jingles_PIZZI00.ogg`

### Not used yet (kept out of the repo until needed)
- The rest of **Sunnyside World** (village, NPCs, UI) — planned for Phase 2.
- **Pixel Crawler — Free Pack (Exterior 0.1)** — candidate for the Mine / Forest.
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
