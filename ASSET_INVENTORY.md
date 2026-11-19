# ASSET_INVENTORY.md — Step A0 (inventory + style test)

Status: analysis only. No game code or game assets were changed.

## 1. Packs and licenses

| Pack | Author | Use in this game | License (from its own README / LICENSE) |
|---|---|---|---|
| **Cozy Lands - Basic** v1.25 | Amo-QAQ (amo-qaq.itch.io) | BASE: terrain, houses, trees, objects, tool icons | FREE = non-commercial only. PREMIUM (US$2.99+) = commercial. Edits/recolors OK. No NFT / AI training. No redistribution of the pack. Credit appreciated. |
| **Farm & Ranch Life** v1.0 (pack 6) | author name not in the files: TODO read download page | SUPPLEMENT: crops, animals, buildings, props, machines, NPCs, player, UI, effects | Commercial OK, edits OK. No resale / redistribution of files, no AI training. |
| Clover Valley V2 **Free** | Josee | NOT USED (see section 5) | Terms not in README: TODO read download page |
| Garden Planters | 0-mem0ry | NOT USED | Terms not in README: TODO read download page |

## 2. What is in each pack (only the useful parts)

### Cozy Lands Basic (all 16x16 grid)
- Terrain autotiles + rules: `Terrain/Tilesets/Grass/grass01.png` (240x80), `grass_01_island.png`, `grass_01_shadow.png`; `Soil/soil.png` (208x80, orange dirt = roads and field), `soil_island.png`, `soil_shadow.png`; `Water/water.png` (80x64), `water_decoration.png`, `fish_shadow.png`; `Terrain/Tile Rules.png` (shows which tile goes where).
- Buildings: `house_01.png`, `house_02.png` (112x80 = 7x5 tiles each, red and blue roof).
- Objects: `Nature/tree.png` (240x48: 10 trees/stumps, autumn + green), `grass_a/b/c`, `flower_b`; `Object/fence.png` (80x64), `bridge.png` (32x64), `chicken_nest.png`, `other.png` (96x32: barrel, crates, pots, planter boxes, mailbox, stepping stones), `box_A_01.png`; `Mineral/stone.png`.
- Items 16x16: `Tool/` hoe, axe, pickaxe, fishing_rod, kettle (= Watering Can). `Seeds/` cabbage, onion, potato, radish. `Products/` cabbage, onion, potato, radish, rice, egg, algae, fish_meat, stone, wood. `fish/` 4 fish + 2 shells.
- Crops: cabbage (4 files), onion, potato, radish (4 stages each; stage 3-4 are 16x32).
- Animals: chicken and chick (idle/walk, 128x96 sheets), egg.
- Characters (cell = 48x48, 4 columns): `boy` idle + walk ONLY; `girl` idle, walk, hoe, chop, mine, water (12 rows), hold, hold_idle, hold_walk. Rows come in pairs per direction (up, down, left, right); water has 3 rows per direction. Exact row/direction mapping to be confirmed when implementing.
- UI: small (BG, choose, grid). EFX: `lightingt.png`.
- NOT in the pack: sand/beach, mine floor, cliffs, stone path, shop building, market stalls, pigs/cows/sheep, corn/carrot/chili/tomato.

### Farm & Ranch Life (pack 6) — 16x16 unless noted
- `01_Farm_Terrain`: Fences, Hedges, Irrigation, Path_Autotiles (gravel path), Scarecrows, Soil_Overlays.
- `02_Crops` spring/summer/autumn: 8-frame growth strips (128x16). Spring: cauliflower, garlic, kale, leek, lettuce, parsnip, peas, radish. Summer: bell_pepper, cantaloupe, cucumber, green_bean, hops, lavender, okra. Autumn: amaranth, artichoke, bok_choy, butternut, cranberry, grape, sweet_potato. Also greenhouse + giant_crops, `ready_sparkle_overlay`.
- `03_Fruit_Trees`; `04_Ranch_Animals`: alpaca, chicken, cow, duck, goat, horse, pig, rabbit, sheep (each with color variants, eat/walk/idle sheets).
- `05_Buildings_Machines`: Buildings (barn L1-3 128x64, coop L1-3 96x48, stable, silos, artisan shed, shipping bin 128x24 = 4 frames, winter_snow set); Ranch_Props (market_stall_veg/fruit/dairy 48x48, hay, troughs, sacks 16x16, tool rack…); Artisan_Machines (furnace, keg, preserves jar, churn, loom… 6 frames); Sprinklers.
- `06_Characters_Tools`: player (male) and player_girl, outfits (overalls, beekeeper, rancher, raingear); sheets 96x128; Actions per gender for hoe, water, chop, mine, scythe (4 directions x 4 frames, 32x32 cells) + tool-tier recolors; Tool_Icons (iron hoe/watering can/axe/pickaxe/rod/scythe strip 96x16, pitchfork, shears, trowel…).
- `07_NPCs`: 10 villagers (beekeeper, carpenter, farmhand_kid, fisher, grandpa_farmer, rancher, seed_seller, shepherd, travelling_merchant…), sheets 96x128.
- `08_Items`: seeds (29), crops (29 incl. rice, coffee, pineapple, tea, bell_pepper, cucumber, sweet_potato), animal_products (eggs, milk_bottle, wool…), fish (24), materials (copper_ore, gold_ore, iron_ore, coal, clay, wood_planks, hardwood_log, fiber…), artisan (copper_bar, gold_bar, iron_bar, coffee_beans_bag, jams, honey…).
- `09_UI`: toolbar_10_slots, inventory_window_8x3, energy bar, money counter, day/time HUD, crafting window, tooltips, status bubbles, fishing tension bar.
- `10_Effects`, `11_Fishing`, `Palette` (55 colors).

## 3. Mapping: current game -> pack file

Legend: OK = direct file. RECOLOR = nearest item, recolor allowed by both licenses. NONE = no match, keep current placeholder.

| Game item | Source |
|---|---|
| Hoe, Axe, Pickaxe, Fishing Rod | Cozy `Items/Tool/` (OK) |
| Watering Can | Cozy `Items/Tool/kettle.png` (OK) |
| Carrot / Carrot Seeds | pack 6 `parsnip` + `seeds_parsnip` (RECOLOR to orange) |
| Chili / Chili Seeds | pack 6 `bell_pepper` + `seeds_bell_pepper` (RECOLOR to red/chili) |
| Tomato / Tomato Seeds | Cozy `radish` (red, round) or pack 6 `cranberry` (RECOLOR) — decide in A2 |
| Corn / Corn Seeds | NONE (nearest: `green_bean`/`okra`, RECOLOR yellow — weak) |
| Backpack | NONE |
| Animal Feed | pack 6 `Ranch_Props/sack_chicken_feed.png` (16x16, OK) |
| Egg | pack 6 `egg_small_white` or Cozy `egg` (OK) |
| Milk | pack 6 `milk_bottle` (OK) |
| Sardine | pack 6 `herring` · Mackerel `mackerel` · Sea Bass `bream` · Catfish `bullhead` · Golden Carp `carp` (RECOLOR gold) · Red Snapper NONE (use `tilapia` RECOLOR red) |
| Stone | Cozy `Products/stone.png` (OK) |
| Copper Ore, Gold Ore | pack 6 `materials/copper_ore`, `gold_ore` (OK) |
| Aquamarine, Ruby, Emerald, Amethyst | NONE (only `farm_crystal`; RECOLOR 4 colors or keep placeholders) |
| Salt | NONE (keep placeholder) |
| Coffee Beans | pack 6 `artisan/coffee_beans_bag` (OK) |
| Salted Egg, Sambal, Coffee (dishes) | keep current icons (not covered) |
| Copper/Gold bar (future furnace step) | pack 6 `artisan/copper_bar`, `gold_bar` (OK) |
| Chicken, Cow | pack 6 `04_Ranch_Animals` (OK) |
| Pig, Sheep (new) | pack 6 `04_Ranch_Animals` (OK) |
| Mina, Rangga, Ayu | pack 6 `07_NPCs`: pick 3 (e.g. seed_seller, rancher, farmhand_kid) |
| Player male / female | pack 6 player / player_girl (see section 4) |
| Shipping Bin, coop, barn | pack 6 `Buildings` (OK) |
| Kitchen stove | pack 6 artisan machine (e.g. preserves_jar/keg) or keep current |
| Market stalls / festival stalls | pack 6 `Ranch_Props/market_stall_*` (OK) |
| Hotbar / Bag / HUD | pack 6 `09_UI` (OK) |

## 4. Style test (see `style_test.png`)
- Objects, icons and characters from both packs share the same soft palette, white icon outlines and warm shading: they sit together well.
- Humans differ: Cozy Lands characters are small/chibi (~18x22 px inside a 48x48 cell); pack 6 humans are taller (16x32). Mixing them in one scene looks inconsistent, and Cozy `boy` has no tool actions at all.
- The grass in the test image is a wrongly cut edge tile (my test, not a pack defect); use autotile rules in A5.
- Cozy grass is yellow-green pastel; pack 6 sprites are slightly more saturated. The game's warm-tint option can unify them.

## 5. Recommendation
1. **Terrain, houses, trees, fences, bridge, decoration, tool icons = Cozy Lands.**
2. **Everything alive and UI = pack 6**: player (both genders, all tool actions), NPCs, animals, crops, buildings, props, machines, effects, UI. This keeps all humans the same size and gives male + female full tool animations.
3. **Do not use Clover Valley Free or Garden Planters** (different style, partial content, license terms unknown; pack 6 already has pig and sheep).
4. **Gaps to solve by recolor/edit** (allowed): sand (recolor soil), mine floor (recolor soil to gray), stone path (pack 6 gravel path), cliffs (none: use water edge/hedge/trees to bound maps).
5. **Decisions for the owner**: corn and tomato have no good match. Either accept recolored substitutes (no game data change), or change the crop list to what the pack has (e.g. Rice, Sweet Potato, Cucumber, Green Bean; recipes like Sambal use Chili + Tomato, so that needs a data change).

## 6. Changes this implies for later steps
- A1 (player): use pack 6 player/player_girl + Actions (32x32 cells, 4 directions x 4 frames); NPCs from pack 6 too.
- A2 (icons/crops): crop growth strips are 8 frames (game currently uses fewer stages): map stages in crops.js without changing growth days.
- A5/A6 (maps): Cozy autotiles + `Tile Rules.png`; Cozy houses are 7x5 tiles.
- CREDITS.md: add Cozy Lands (Amo-QAQ, non-commercial free version) and pack 6 (author TODO).
