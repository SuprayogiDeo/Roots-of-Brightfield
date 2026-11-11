# PROGRESS — Roots of Brightfield

Repo: `roots-of-brightfield` (public) · Phaser 3 + Vite · PWA on GitHub Pages
Internal resolution 480x270, 16x16 tiles, landscape only.

## DONE
- **Step 1** — project skeleton: Vite + Phaser, `vite.config.js` (base auto from repo, `vite-plugin-pwa`), `index.html` (viewport-fit=cover, safe-area), mobile CSS lock (no select / no zoom / no overscroll), portrait overlay, GitHub Actions workflow (`npm install` + Pages deploy).
- **Step 2** — Title screen (logo + New game / Continue / Settings + EN|ID), Character Select (Male/Female + name), Prologue text cards (skippable), Settings, i18n (en/id, auto from `navigator.language`), versioned localStorage save.
- **Step 3** — asset-key layer (`src/systems/assets.js` = one manifest, placeholders until real art), warm tint option, player walking in 4 directions, camera follow, virtual joystick + A / B / Run buttons, multi-touch (3 pointers), keyboard (WASD/arrows, E/Space = A, Q = B, Shift = Run).
- **Step 4** — Farm map in Tiled JSON (`public/assets/maps/farm.json`) with collision, Old Shed + sign, HUD (date/time + stamina top-left, coins + menu top-right, top-center empty), 6-slot hotbar (tap to select, B cycles rows 1-3), contextual prompt above the player, autosave every 30s + on pause, PWA offline service worker.
- **Step 5** — **farming loop + first quest**
  - Day/time system: clock runs 10 in-game minutes per 7 real seconds; sleeping at the Old Shed starts a new day (crops that were watered grow one stage, stamina refills); staying up to 02:00 AM makes the player pass out (next day starts at 60% stamina).
  - Full loop on the dirt field: **Hoe → till**, **seeds → plant**, **Watering Can → water**, **ripe crop → harvest**, **Shipping Bin → sell for coins**. Each action costs stamina (till 3, plant 1, water 2, harvest 1).
  - 4 crops: **Carrot** (3 days, 35g), **Corn** (4 days, 50g), **Chili** (3 days, 40g), **Tomato** (4 days, 45g). Starter bag: 5 Carrot Seeds, 5 Corn Seeds, 3 Chili Seeds, 3 Tomato Seeds (hotbar row 2).
  - First quest **"Old Shed"** = tutorial: visit the shed → till → plant → water → harvest → sell. Objective shown under the date panel; reward **+100g**.
  - Save schema v3 (adds `plots` and `quest`); older saves are migrated automatically.

- **Step 6 — real art (Cute Fantasy by Kenmi)**
  - Farm tileset replaced with real 16x16 art (grass, flowers, weeds, field soil, path, water,
    fences, bush, rocks, stump, sign, Old Shed roof/wall/door) — built into
    `public/assets/tiles/farm_tiles.png`, same 16 tile ids, so `farm.json` did not change.
  - Real player character (`public/assets/characters/player.png`, 32x32, 6 frames) with idle +
    walk animations in 4 directions (side frames are mirrored for left).
  - Tilled / watered soil now uses the pack's FarmLand tiles.
  - Everything is wired through `ASSET_MANIFEST` — no scene code depends on file names.
  - See CREDITS.md: Cute Fantasy free license = non-commercial, no redistribution.

- **Step 7 — real crops + sound**
  - Crop growth stages now use real Sunnyside sprites (`public/assets/crops/*.png`, one 16x16
    frame per stage) through `ASSET_MANIFEST`; `cropFrame()` falls back to placeholders if a
    sheet is missing. Mapping: Carrot=carrot, Corn=wheat, Chili=radish, Tomato=beetroot.
  - Sound layer `src/systems/audio.js` (Kenney, CC0): UI click, till, plant, water, harvest,
    coins, shed door, "denied" blip, quest-complete jingle, new-day jingle.
  - Settings has a **Sound ON/OFF** row (saved in `rob_sfx`); Boot preloads the click sound so
    menus have audio immediately.
  - CREDITS.md updated with every pack, file and license.

## PHASE 2
- **Step 2.1 — Village + Seed Shop**
  - `public/assets/maps/village.json` (40x24 Tiled JSON, same `farm_tiles` tileset): crossroads,
    5 cottages, the Seed Shop with a signboard, a pond, fences, trees and rocks.
  - Edge transitions both ways: walk to the east edge of the Farm -> **Tap A: Go to Brightfield
    Village**; the west gate of the Village -> **Tap A: Go back to the farm**. The save stores
    which map you are on, and **Continue** resumes that map.
  - `ShopScene`: buy Carrot 20g / Corn 25g / Chili 18g / Tomato 22g seeds (shows how many you own)
    and **Sell all crops** in one tap; coins update live.
- **Step 2.2 — Dialogue, NPCs, day-night**
  - `src/systems/dialogue.js`: bottom box with portrait on the left, name tab (with friendship
    x/10) above it, and choices on the right. A / tap advances; A picks the first choice.
    The hotbar hides while someone is talking.
  - 3 villagers with friendship: **Mina** (Seed Shop), **Rangga** (river & sambal), **Ayu**
    (harvest festival). First chat each day = +1 friendship point (3 points = 1 heart, max 10).
    Each has 3 rotating lines in EN + ID.
  - `src/systems/daynight.js`: the screen tints with the clock — deep night, sunrise at 06:30,
    full daylight 08:00-17:00, sunset 18:30, night again from 21:00. Applies on both maps.
  - Save schema v4 adds `friends`; older saves migrate automatically.

## PHASE 3
- **Step 3.1 — Animals + XP/level**
  - Pasture = south-west meadow of the Farm (tiles x 2-14, y 16-22). Chickens and cows roam it
    (idle/walk animations, mirrored to face right); they avoid trees and rocks.
  - Seed Shop now also sells **Animal Feed** (6g), **Chicken** (100g, max 6) and **Cow** (400g, max 3).
  - Daily loop: hungry animals show a feed icon -> select Animal Feed in the hotbar, stand next to the animal,
    Tap A to feed -> next morning it shows a product bubble -> Tap A to collect **Egg** (18g) or **Milk** (45g).
    Unfed animals produce nothing. Feeding and collecting cost 1 stamina.
  - **XP / level** (`src/systems/xp.js`): till 1, plant 1, water 1, harvest 4, feed 2, collect 3 XP.
    Level 1-10 (needs 20, 35, 50... XP). Each level = +10 max stamina (100 -> 190) and +10 stamina now.
  - HUD: date panel grew a third row with "Lv N" + blue XP bar; the stamina bar turns red below 25%.
  - Save schema v5 adds `animals` and `xp`; older saves migrate automatically.

- **Step 3.2 — Pause menu + Bag + backpack upgrades**
  - New `MenuScene` (menu button / Esc) with tabs **Bag, Skills, Quests, Map, Settings**. Skills shows level, XP,
    stamina, coins; Quests shows the current objective; Map is a placeholder; Settings opens the old Settings
    screen and its Back button returns to the menu.
  - **Bag tab:** full grid (18 slots, up to 36), tap = select, **drag** an item to another slot to swap or merge
    stacks (max 99), or use **Move** then tap a target. Detail panel shows icon, name, qty, description, sell price.
    **Use** puts the item on the hotbar (right row + slot) and closes the menu. The brighter row = current hotbar row.
  - **Backpack upgrades** in the Seed Shop: 24 slots (400g), 30 (1000g), 36 (2500g). The hotbar row button (B)
    now cycles through however many rows the bag has (3 -> 6).
  - Fixed: date panel height reset to 32 on every refresh (the Lv/XP row was clipped).

- **Step 3.3 — Phone fixes (from first live test)**
  - Canvas width now follows the phone aspect (16:9 up to 21:9, height stays 270) -> no side bars; HUD,
    controls, dialogue and night/warm overlays anchor to the real width and to notch safe-area insets.
    Menu-style screens are centered. First tap on a touch device requests fullscreen (+ landscape lock where
    allowed); switching fullscreen off in Settings stops that.
  - Bigger touch controls + Settings > **Control size** (Small / Medium / Large, default Medium); menu button 26px,
    hotbar slots 24px.
  - Fixed: Menu could not be opened a 2nd time (Farm / Village / Shop forgot `this.leaving = false` in create()).
  - **Stamina removed** (HUD bar, action costs, level bonus, Skills line). Save field kept for compatibility.
  - Fence art rebuilt from the original Fences.png so horizontal rails connect; row-1 end posts replaced.
  - Finishing the Old Shed quest now gives 1 Chicken + 3 Animal Feed so animals are visible early.

## PHASE 4
- **Step 4.1 — Beach + fishing**
  - New `BeachScene` (`public/assets/maps/beach.json`, tileset `beach_tiles.png`): grass -> sand -> sea, a pier
    (walkable, 2 tiles wide) with water on both sides, palms/rocks/shells/boat/barrels as map-driven **props**
    (object layer `Props`; solid footprints are listed in `BeachScene.js` `SOLID`).
  - Transition: Farm south edge (`to_beach` zone, x 256-384, y 370) <-> Beach north edge (`to_farm`). Arrival points
    `from_beach` (Farm) / `from_farm` (Beach). Title "Continue" resumes on the Beach if saved there.
  - **Fishing minigame** (`src/systems/fishing.js`): select the Fishing Rod, face water, Tap A to cast ->
    wait for "!" -> Tap A to hook -> tap A while the marker is in the green zone (1-3 hits depending on the fish).
    Too early = fish flees, too slow / miss = it escapes. Walking away while waiting cancels the cast.
  - 6 fish (Sardine, Mackerel, Sea Bass, Catfish, Red Snapper, Golden Carp: 15-120g) — sell at the Shipping Bin like
    crops. +3 XP per catch. Level adds a little to the green zone width.
  - Real icons for the 6 fish + Fishing Rod. New texts in EN/ID.

- **Step 4.1b — Forest map + transition**
  - New `ForestScene` (`maps/forest.json` 40x30, tileset `forest_tiles.png`): winding dirt trail, dense oak/pine border,
    bushes, rocks, flowers/ferns/mushrooms, and a mushroom clearing in the north. Props live in the map's `Props`
    object layer (solid footprints in `ForestScene.js` `SOLID`; flowers/ferns/mushrooms are decoration).
  - Transition: a gate gap in the Farm's north fence (`to_forest`, x 272-368, y 0-14) <-> Forest south edge (`to_farm`).
    Points `from_forest` (Farm) / `from_farm` (Forest). Title "Continue" resumes in the Forest if saved there.
  - The forest is empty of gameplay for now (no chopping/foraging yet) — planned next.

## NEXT (Step 4.2)
- Village house interiors, a second quest chain, real item icons (UI pack), NPC art.
- Phase 4: Forest / Mine, mining, crafting; fish quest / recipes; beach NPC; shells to collect.

## KNOWN ISSUES
- Item icons, UI buttons, joystick, logo and PWA icons are still code-drawn placeholders.
- NPCs reuse the player sprite with a colour tint (the free pack has no villager sheets) — real
  NPC art can be dropped in via `ASSET_MANIFEST` + one line in `src/systems/npcs.js`.
- Village houses cannot be entered yet (doors are decoration); only the Seed Shop opens.
- No background music yet (only short jingles) — planned for Phase 5.
- Mobile browsers only start audio after the first tap (normal browser rule).
- Only ONE character sheet exists in the free pack, so Male and Female look the same for now.
- Sunnyside World + Pixel Crawler packs are not used yet (planned for Village / Forest / Mine).
- Vite build warns that the bundle is >500 kB (Phaser itself) — harmless for a PWA that caches once.
- The Old Shed has no interior yet; interacting with it after unlocking = sleep.

## DECISIONS
- Item, crop, place and NPC names stay English in both languages; only UI text / dialogue is translated.
- Selling happens at the Shipping Bin next to the field until the Village shop exists.
- Crops only grow on the dirt field tiles (the brown patch east of the shed).
