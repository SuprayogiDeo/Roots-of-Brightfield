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

- **Step 4.2 — Mine map + ore items**
  - New `MineScene` (`maps/mine.json` 40x28, tileset `mine_tiles.png`): entrance room, a hub, and 4 side rooms
    (NW gold/aquamarine, NE ruby/emerald/amethyst, SW copper, SE copper/gold). Solid cliff walls (collision from tile ids
    1, 6, 7, 8, 9, 16), solid ore nodes and crystals (Props layer, names `node_<ore>`), rubble decoration, 11 wall torches
    (code-drawn, flickering, soft glow) and a constant underground darkness instead of the day/night tint.
  - Transition: new **mine entrance** in the Forest's north clearing (`to_mine`, x 266-294, y 105-122) <-> Mine exit mat
    (`to_forest`, bottom of the entrance room). Points `from_mine` (Forest) / `from_forest` (Mine). Title "Continue"
    resumes in the Mine if saved there. At 02:00 inside the Mine you are sent home like in the Forest.
  - 7 new items with real icons, sold at the Shipping Bin / Seed Shop sell-all: Stone 4g, Copper Ore 18g, Gold Ore 55g,
    Aquamarine 90g, Amethyst 100g, Emerald 120g, Ruby 140g. Pickaxe now has a real icon too.
  - Mining itself arrived in Step 4.5.

- **Step 4.2b — mine door cleared**
  - Removed the big rock (`rock_b` at x 280, y 128) that stood in front of the Forest's mine door. Checked that no
    solid prop blocks the path to the `to_mine` zone and that the `from_mine` spawn is not inside anything solid.

- **Step 4.3 — Farm animations**
  - **Sheet checked first:** `Player/Player_Actions.png` is 96x576 = **48x48 frames, 2 columns x 12 rows** (col 0 =
    wind-up, col 1 = strike). Rows: 0-2 pickaxe, 3-5 axe, 6-8 hoe (each = side, down, up) and 9-11 watering can in a
    **different order = down, up, side**. Side frames face right (left = `flipX`). Feet sit on the same line as the
    32x32 walk frames, so both are drawn with origin (0.5, 0.5) and need no offset.
  - New `src/systems/toolAnim.js`: `ActionRig` (one per scene) shows the pose on a separate overlay sprite while the
    physics player is hidden, so the collider / tile lookup / interact zones never move. `rig.busy` **locks movement,
    Tap A and the menu button** for the whole swing; the HUD prompt hides meanwhile. `TOOLS` table = rows + timing
    (hoe 170+230 ms, water 200+330 ms, axe 150+220 ms, pickaxe row data ready for Step 4.5).
  - **Till** = hoe swing, **Water** = watering can pour. The action (soil change, sound, XP, quest) is committed on
    the **strike frame** (`onImpact`), then control returns after the hold. Facing = last walk direction.
  - **Plant / Harvest / Feed / Collect:** code-only effects in the same file. The player bends down (squash anchored
    at the feet, committed at the lowest point), then: plant = soil crumbs + leaf specks + sprout pops up; harvest =
    leaves + gold sparkles; feed = grain rains on the animal + sparkles (player turns to face the animal);
    collect egg/milk = sparkles. Particles are tiny generated textures (`fx_spark`, `fx_leaf`, `fx_dot`).
  - The seed / feed slot is captured when A is pressed (`act.slot`), so changing the hotbar mid-animation cannot
    consume the wrong item. Bag-full on harvest still shows the deny blip and keeps the crop.
  - If `player_actions` is missing or placeholder art is used, everything falls back to the old instant action + pulse.
  - The **axe animation is registered but not used yet** (nothing to chop on the Farm): wire `rig.playTool('axe', ...)`
    in the Forest chopping step. Pickaxe pose for Step 4.5: `rig.playTool('pickaxe', ...)`.
  - Files: `public/assets/characters/player_actions.png`, `src/systems/toolAnim.js` (new), `assets.js` (manifest key
    `player_actions`), `farmArt.js` (`idleFrameFor`), `FarmScene.js`.

- **Step 4.4 — Fishing animation (no new art, all code)**
  - **Part 1 — pose + line + bobber** (`src/systems/fishingPose.js`, new): while fishing the player freezes on the idle
    frame of the facing direction and holds the existing `item_fishing_rod` icon, rotated so the rod points at the water
    (per-facing hand position + aim angle; left = mirrored with `scaleX -1`). The icon has a line + bobber baked in, so a
    masked canvas copy `rod_held` (created at runtime) keeps only the bent rod; the code-drawn line starts at the rod tip.
    Rod is drawn behind the player when facing up. If the real player sprite or the rod icon is missing, it falls back to
    the old line from the player's head.
  - New cast sequence in `fishing.js` (state `cast`, 520 ms, Tap A ignored meanwhile): rod back-swing -> whip forward
    (180 ms), bobber flies in an arc to the water tile (340 ms), **splash on landing**, then the wait starts (the
    "Waiting..." toast now shows on landing). Line is a sagging curve from tip to bobber (loose while waiting, tight when
    reeling). Wait = bobber bobs + slow sway + a faint ripple every ~1.5 s. Bite = **"!" bounces**, bobber dips fast, rod
    trembles. Reel = bobber shakes, and **each successful hit yanks** the rod and bobber.
  - **Part 2 — splash + jumping fish** (`src/systems/fishingFx.js`, new): `splash` (droplets + rings, big on landing /
    small on bite, reel hit, early press, escape), `ripple`, and `fishJump`: on a catch the rod snaps up, the fish icon
    leaps out of the water in an arc, spins, follows the player and shrinks into them, then floating **"+1"** appears
    (Golden Carp also gets sparkles). Bag full = old deny blip and no jump (`catchFish` now returns true/false).
  - Other changes: `toolAnim.js` now exports `arc` and `twinkle` (reused by the splash); `BeachScene` passes
    `player` to `FishingGame` and calls `fishing.start(target, facing)` (signature changed: no more `from` getter).
  - Rules unchanged: walking away while waiting cancels, Tap A too early scares the fish, minigame numbers untouched.
  - Not checked in a real browser from the sandbox (logic was run against a stubbed Phaser; rod angles were previewed
    with the same math). **Tune on the phone** if needed: `HAND` / `AIM` in `fishingPose.js`, `CAST_*` / `WINDUP_DEG` in
    `fishing.js`.

- **Step 4.5 — Mining** (2 parts, both in)
  - **Part 1 — logic + drops + save** (`src/systems/mining.js`, new; wired in `MineScene.js`): select the **Pickaxe**
    on the hotbar, face an ore node, **Tap A** (prompt "Tap A: Mine" shows when a node is in front; without the
    pickaxe selected a hint toast appears). **3 hits** break a node (hit counter lives in memory per visit — leaving the
    Mine resets half-mined nodes). Drop = 1 item by node type: `node_stone` -> Stone, `node_copper` -> Copper Ore,
    `node_gold` -> Gold Ore, `node_aquamarine` / `node_amethyst` / `node_emerald` / `node_ruby` -> the same gem.
    XP on break (`NODE_DEFS` in `mining.js`): Stone 2, Copper 3, Gold 5, Aquamarine 7, Amethyst 7, Emerald 8, Ruby 9.
    Level-up toast + jingle like the Farm.
  - **Bag full:** checked **before the swing** (`canFit`): toast "Bag is full!" + deny blip, no swing, node stays whole.
  - **Respawn + save:** mined-out node = rubble sprite, no collision (walkable). **Save schema v6** adds
    `mine: { nodes: { "<tiled object id>": <day mined out> } }`; v1-v5 saves migrate to `mine: { nodes: {} }`.
    When the Mine opens, every node with `save.time.day > minedDay` is removed from the list = back **the next day**.
    Node ids are the Tiled object ids in `maps/mine.json` — do not re-export the map with new ids (all 22 ids are unique).
  - Target = a thin probe box in front of the feet (`findTarget`): a node beside the player is not hit when facing along it.
  - **Part 2 — animation + effects + sound** (`miningFx.js`, new; `toolAnim.js` unchanged): `rig.playTool('pickaxe', ...)`
    swing (movement / Tap A / menu locked meanwhile); the hit is committed on the **strike frame**. Hits 1-2: node
    rattles + white flash, rock chips in the node's colour, a sparkle. Hit 3: bigger burst + dust puffs + sparkles +
    tiny camera shake, node pops into rubble (scale 1.5 -> 1). The drop **hops out, lands beside the node, then flies into
    the player** (follows them if they move) and floating **"+1"** appears; hotbar refreshes + click blip on arrival.
    Without real player art the swing falls back to instant (logic still works).
  - **Sound:** the uploaded `herrparadox-mining_pickaxe_hit_crystal_rock_sharp-514333.mp3` held 4 separate hits, cut into
    `public/assets/sfx/sfx_pick_1..4.(ogg|mp3)`; hits 1-2 play a random one of 1-3 (never the same twice in a row), the
    breaking hit plays 4. Keys `sfx_pick_1..4` in `audio.js` / `assets.js`. Credits added (source/license TODO).
  - Texts: `prompt.mine`, `mine.needPickaxe`; `mine.arrive` no longer says "mining arrives later" (EN + ID).
  - Checked: `vite build` OK; logic test (save migration v3/v5 -> v6, bag full, respawn same day / next day, target
    probe in all 4 directions, all 22 nodes have a def) passes. **Not run in a real browser** — tune on the phone:
    `windup` / `hold` of `pickaxe` in `toolAnim.js` `TOOLS`, `findTarget` probe size in `mining.js`, effect sizes in `miningFx.js`.

- **Step 4.6 — Crafting / cooking + pickaxe icon fix**
  - `public/assets/items/pickaxe.png`: the thick white outline was removed (flood-fill from outside, 80 px); the dark
    inner outline stays, so the icon reads on the hotbar/Bag.
  - **Kitchen** (`src/systems/crafting.js`, `src/scenes/CraftScene.js`, new): a stone stove + pot north of the Farm field
    (code-drawn placeholder texture `kitchen`, steam puffs; Tiled zone `kitchen` added to `farm.json`, object id 26).
    Stand in front -> **Tap A: Cook at the Kitchen** -> `Craft` scene (menu style, Back returns to the Farm).
  - Recipes (`RECIPES`): **Sambal** = 2 Chili + 1 Tomato + 1 Salt (sells 170g); **Salted Egg** = 1 Egg + 1 Salt (60g);
    **Coffee** = 2 Coffee Beans (75g). Cooking gives +4 XP (`XP_GAIN.cook`), instant. Bag is checked first on a copy
    (`craft()` returns ok / missing / full), so ingredients are never lost when the bag is full.
  - **Pantry** inside the Kitchen: Salt 10g, Coffee Beans 15g. These two have **no sell price on purpose** so the Shipping
    Bin / Shop "sell all" never sells your ingredients. Dishes sell at the Bin like crops.
  - New items (placeholder code-drawn icons): `salt`, `coffee_beans`, `sambal`, `salted_egg`, `coffee`. Bag detail shows
    dish / ingredient hints. New i18n keys (EN + ID): `prompt.cook`, `kitchen.*`, `item.dish`, `item.ingredient`.
  - No save-schema change (still v6). Checked: `vite build` OK + headless-browser test (prompt, open Craft, buy, cook all 3,
    missing-ingredients message, coins/XP correct, Mine scene still loads). Not run on a real phone.
  - **Real art (Step 4.6b):** Kitchen sprite = `public/assets/kitchen/stove.png` (Cooking & Kitchen Icons Pack, CC0); icons
    `items/sambal.png` (Pixel Art Food Icons FREE, soup_1) and `items/coffee.png` (Pixel Art Food Pack, Cup of coffee),
    downscaled to 16x16. Still placeholders: Salted Egg, Salt, Coffee Beans icons. Unused packs kept out of the repo:
    Bitglow pixelinterior (house interiors, license forbids standalone redistribution), Food Pack 2, BigWander Banquet.
  - Step 4.2 (Mine map + mining) was already in this build (Step 4.5 above) — nothing to redo.

## NEXT
- Phase 5 wrap-up: a Winter festival, Mine music, real music credits (author/license), village house interiors.
- Furnace (ore -> bars) as a 2nd station, forest foraging/chopping (use `rig.playTool('axe', ...)`), village house interiors,
  second quest chain.
- Mining ideas not done: tool upgrades (more damage = fewer hits), rare double drops, mine level 2 (ladder), energy-free by design.

## KNOWN ISSUES
- Salted Egg, Salt and Coffee Beans icons are still code-drawn placeholders (no matching art found yet).
- Licenses to verify: Food Icons FREE and Food Pack (no license text in the zips), Cooking & Kitchen Icons = CC0 (ok).
- Cave Items pack (ore icons, nodes, pickaxe icon): the zip has NO license file — author/license still unverified
  (marked TODO in CREDITS.md). Replace or confirm before publishing.
- The mine entrance sprite is composed by hand (the free Pixel Crawler pack has no mine door); can be swapped via
  `ASSET_MANIFEST` key `prop_mine_entrance` (32x32, origin bottom-centre).
- Mine has one level only (no ladder down yet) and no enemies by design.
- Pickaxe sound `sfx_pick_*`: source page / license of the herrparadox clip is unverified (TODO in CREDITS.md).
- Half-mined nodes (1-2 hits) are not saved: leaving the Mine resets their hit count (only mined-out nodes persist).
- Item icons, UI buttons, joystick, logo and PWA icons are still code-drawn placeholders.
- NPCs reuse the player sprite with a colour tint (the free pack has no villager sheets) — real
  NPC art can be dropped in via `ASSET_MANIFEST` + one line in `src/systems/npcs.js`.
- Village houses cannot be entered yet (doors are decoration); only the Seed Shop opens.
- Music author / source / license is unverified (TODO table in CREDITS.md).
- Mobile browsers only start audio after the first tap (normal browser rule).
- Only ONE character sheet exists in the free pack, so Male and Female look the same for now.
- Sunnyside World + Pixel Crawler packs are not used yet (planned for Village / Forest / Mine).
- Vite build warns that the bundle is >500 kB (Phaser itself) — harmless for a PWA that caches once.
- The Old Shed has no interior yet; interacting with it after unlocking = sleep.

## Step 5.1 — Seasons, weather, full quest system, Grandpa's notebook
- Save schema v7: `time.total` (absolute day), `time.season/day` derived (4 seasons x 28 days), `weather.rainWatered`, `quests {active, done, tracked}`. Old saves migrate (v6 quest progress kept).
- `systems/calendar.js` (pure): deterministic weather per day (first 3 days sunny; Winter = snow, no rain). Rain/storm waters all plots once per day. Off-season crops wither at season change.
- Crop seasons: carrot Spring/Fall, corn Summer/Fall, chili Summer, tomato Spring/Summer. Planting out of season is blocked with a hint; seed detail shows "Grows in".
- `systems/weatherFx.js`: tint, rain/snow particles, lightning, WebAudio rain ambience (Farm, Village, Beach, Forest; not Mine).
- `systems/quests.js` (pure, data-driven): old_shed (tutorial) -> flock -> first_catch / explorer / kitchen_table / green_thumb -> rock_collector, new_season -> secret (Ayu, 500g). NPC quests: mina_eggs, rangga_fish, ayu_sambal. Quest tab: Active / Done / Notebook (9 pages) + Track button; tracker line in HUD.
- Tests: logic tested in node (27 checks: calendar, quests, migration). NOT run in a browser.
- Tuning: DAYS_PER_SEASON, weather weights (`calendar.js`), rewards (`quests.js`), rain volume (`weatherFx.js`).
- KNOWN ISSUE: `CraftScene.js` is missing from the uploaded zip (Kitchen -> Craft would fail). The cook quest is queued via `questQueue.js` and applied by the next outdoor scene.

## Step 5.2 — Festivals + background music + polish
- **Festivals** (`systems/festivals.js` pure logic, `systems/festivalVillage.js` village decor/spots, `scenes/FestivalGameScene.js`). All in the Village, one per season (Winter has none yet):
  - **Morning Market** — Spring 14, 06:00-12:00: sell everything at +25% (unlimited), "morning bargain" = 5 Animal Feed for 15g (once).
  - **Independence Day Games** — Summer 17, 09:00-17:00: **Sack Race** (tap fast vs Rangga, Ayu, Mina) and **Cracker Eating** (tap in the green zone, 6 bites). Prizes 200/120/60/20g + XP; each game once per festival day; each takes 30 in-game minutes. Quitting early = no prize, no try used.
  - **Harvest Festival** — Fall 21, 10:00-18:00: **Harvest Contest** (your most valuable sellable item is entered and kept: 100g+ item = 500g, 40g+ = 250g, else 100g) and **Feast** (+2 friendship with every villager, once).
  - Red/white (or festival-coloured) bunting + two solid stalls drawn in code; a welcome message once per festival day; the "new day" message announces "Today / Tomorrow: ...".
  - No save-schema change: `save.festival {day, done, seen}` is created on demand and resets each day. The `FestGame` scene registers itself from `festivalVillage.js` (main.js unchanged).
- **Music** (`systems/music.js`): streamed MP3 (low RAM), crossfade, shared across scenes, pauses when the app is hidden, volume Off/Low/Medium/High in Settings (`rob_music`). Rules (first match wins): festival (Village) -> track_5; Mine -> silent; Winter -> snow_song + into_the_snow; Village -> track_5, track_7; everything else -> track_7, track_5. Rain/storm lowers the volume. **To add songs: put the .mp3 in `public/assets/audio/music/`, add one line to `MUSIC_TRACKS`, add its key to a rule in `MUSIC_RULES`.**
- PWA: music is not precached (first install stays small); it is cached the first time it plays (works offline afterwards). Settings gets a Music row.
- Tests: festival logic + music rules + syntax of every changed file checked in node. NOT run in a browser (no Phaser/Vite available in this session) — please test on the phone.
- Tuning: stall spots (`SPOT_X`, `STALL_Y`), prizes (`GAME_PRIZES`, `contestResult`), rival speeds (`rate` in `buildSack`), cracker zone/speed (`buildKrupuk`), volumes (`LEVELS`), per-song `volume` and `MUSIC_RULES` (`music.js`).

## DECISIONS
- Item, crop, place and NPC names stay English in both languages; only UI text / dialogue is translated.
- Selling happens at the Shipping Bin next to the field until the Village shop exists.
- Crops only grow on the dirt field tiles (the brown patch east of the shed).
- Mine ores (Step 4.2): Stone, Copper Ore, Gold Ore, Aquamarine, Ruby, Emerald, Amethyst (no iron/coal: the pack has none).
- Prop asset keys must be unique across Beach/Forest/Mine (`prop_<name>`): Mine rock is `mine_rock_big`.
- Festival names stay English in both languages; game names and all texts are translated (EN + ID).
- Festival days never block normal play: Farm, Beach, Forest and Mine work as usual.
