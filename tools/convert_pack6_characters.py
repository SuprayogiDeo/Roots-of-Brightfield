"""Converts Farm & Ranch Life (pack 6) character art into the layouts the game already uses.
Run from the repo root:  python3 tools/convert_pack6_characters.py <path-to-FarmRanchLife-folder>
Needs: pip install pillow

Outputs (public/assets/characters/):
  player.png / player_f.png                 192x128  walk+idle sheet, 32x32 cells, 6 cols x 4 rows
                                            rows: down, up, right (left = flipX)  cols: 0-3 walk, 4-5 idle
  player_actions.png / player_actions_f.png 96x576   48x48 cells, 2 cols (wind-up, strike) x 12 rows (see toolAnim.js)
  npc_<id>.png                              192x128  same layout as player.png
"""
import os
import sys
from PIL import Image

SRC = sys.argv[1] if len(sys.argv) > 1 else 'FarmRanchLife'
OUT = os.path.join('public', 'assets', 'characters')
CH = os.path.join(SRC, '06_Characters_Tools')
os.makedirs(OUT, exist_ok=True)


def walk_sheet(path, out):
    """16x32 frames (6 cols x 4 rows) -> 32x32 cells, body 16 px wide centred, feet on row 25."""
    src = Image.open(path).convert('RGBA')
    dst = Image.new('RGBA', (6 * 32, 4 * 32), (0, 0, 0, 0))
    for r in range(4):
        for c in range(6):
            frame = src.crop((c * 16, r * 32, c * 16 + 16, r * 32 + 32))
            frame = frame.crop((0, 6, 16, 32))            # drop 6 empty rows above the head
            dst.alpha_composite(frame, (c * 32 + 8, r * 32))
    dst.save(out)


# game row order in player_actions.png: (pack action, pack row) ; pack rows: 0 down, 1 up, 2 right, 3 left
ACTION_ROWS = [
    ('mine', 2), ('mine', 0), ('mine', 1),     # pickaxe: side, down, up
    ('chop', 2), ('chop', 0), ('chop', 1),     # axe:     side, down, up
    ('hoe', 2), ('hoe', 0), ('hoe', 1),        # hoe:     side, down, up
    ('water', 0), ('water', 1), ('water', 2),  # water:   down, up, side
]
WINDUP, STRIKE = 1, 3                          # pack frames used for the two poses


def action_sheet(player, out):
    dst = Image.new('RGBA', (2 * 48, 12 * 48), (0, 0, 0, 0))
    for i, (act, prow) in enumerate(ACTION_ROWS):
        sheet = Image.open(os.path.join(CH, 'Actions', player, f'{player}_{act}_4dir_4f.png')).convert('RGBA')
        for col, f in enumerate((WINDUP, STRIKE)):
            frame = sheet.crop((f * 32, prow * 32, f * 32 + 32, prow * 32 + 32))
            dst.alpha_composite(frame, (col * 48 + 8, i * 48 + 2))   # feet land on row 33 of the 48x48 cell
    dst.save(out)


walk_sheet(os.path.join(CH, 'Outfits', 'player', 'player_overalls_walk_idle_sheet.png'), os.path.join(OUT, 'player.png'))
walk_sheet(os.path.join(CH, 'Outfits', 'player_girl', 'player_girl_overalls_walk_idle_sheet.png'), os.path.join(OUT, 'player_f.png'))
action_sheet('player_overalls', os.path.join(OUT, 'player_actions.png'))
action_sheet('player_girl_overalls', os.path.join(OUT, 'player_actions_f.png'))

NPC_FILES = {'mina': 'travelling_merchant', 'rangga': 'rancher', 'ayu': 'vet'}
for npc, name in NPC_FILES.items():
    walk_sheet(os.path.join(SRC, '07_NPCs', f'{name}_walk_idle_sheet.png'), os.path.join(OUT, f'npc_{npc}.png'))
print('done')
