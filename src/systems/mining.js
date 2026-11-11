import Phaser from 'phaser';
import { STACK_MAX } from './items.js';

// ---------------------------------------------------------------------------
// MINING LOGIC (Step 4.5, part 1) — no drawing here, only rules + save data.
//
// Node ids are the Tiled object ids from maps/mine.json (stable as long as the map is not
// re-exported with new ids). Save: save.mine.nodes = { "<id>": <in-game day it was mined out> }.
// A mined-out node is rubble for the rest of that day and is back the next day
// (respawnNodes() runs when the Mine opens).
// ---------------------------------------------------------------------------

export const HITS_TO_BREAK = 3;

// drop = item id (1 per node), xp = XP when the node breaks, chips = shard colors for the effects.
export const NODE_DEFS = {
  node_stone: { drop: 'stone', xp: 2, chips: [0xc9ccd0, 0x9aa0a6] },
  node_copper: { drop: 'copper_ore', xp: 3, chips: [0xe39a52, 0xc9773a] },
  node_gold: { drop: 'gold_ore', xp: 5, chips: [0xfff2b0, 0xf2c438] },
  node_aquamarine: { drop: 'aquamarine', xp: 7, chips: [0xb8f2ee, 0x6fd6d0] },
  node_amethyst: { drop: 'amethyst', xp: 7, chips: [0xd9b8f2, 0xa070d0] },
  node_emerald: { drop: 'emerald', xp: 8, chips: [0x9af0b8, 0x3fae6a] },
  node_ruby: { drop: 'ruby', xp: 9, chips: [0xf29a90, 0xd14b3d] }
};

export const isNodeName = (name) => !!NODE_DEFS[name];

// True when `qty` of the item still fits in the bag (stacks first, then empty slots).
export function canFit(inv, id, qty = 1) {
  let room = 0;
  for (const s of inv.slots) {
    if (!s) room += STACK_MAX;
    else if (s.id === id) room += STACK_MAX - s.qty;
    if (room >= qty) return true;
  }
  return false;
}

export function isMinedOut(save, id) {
  return Object.prototype.hasOwnProperty.call(save.mine.nodes, id);
}

export function markMinedOut(save, id) {
  save.mine.nodes[id] = save.time.total;
}

// Nodes mined on an earlier day come back. Returns how many respawned.
export function respawnNodes(save) {
  let n = 0;
  Object.keys(save.mine.nodes).forEach((id) => {
    if (save.time.total > save.mine.nodes[id]) { delete save.mine.nodes[id]; n++; }
  });
  return n;
}

// Footprint of a node on the ground (same numbers as MineScene SOLID: 12x6 at the bottom-centre).
export function footprint(x, y) {
  return new Phaser.Geom.Rectangle(x - 6, y - 6, 12, 6);
}

// The node the player is facing, or null. `feet` = player body centre, `nodes` = ore nodes with a
// `foot` rectangle. A thin probe box is laid out straight in front of the feet (narrow sideways, so a
// node beside the player is not hit when facing along it); the closest node it touches wins.
export function findTarget(nodes, feet, facing) {
  const fx = feet.x;
  const fy = feet.y;
  const probe = facing === 'left' ? new Phaser.Geom.Rectangle(fx - 14, fy - 6, 14, 12)
    : facing === 'right' ? new Phaser.Geom.Rectangle(fx, fy - 6, 14, 12)
      : facing === 'up' ? new Phaser.Geom.Rectangle(fx - 5, fy - 14, 10, 14)
        : new Phaser.Geom.Rectangle(fx - 5, fy, 10, 14);
  let best = null;
  let bestD = Infinity;
  nodes.forEach((n) => {
    if (n.minedOut) return;
    if (!Phaser.Geom.Intersects.RectangleToRectangle(probe, n.foot)) return;
    const d = Phaser.Math.Distance.Between(fx, fy, n.foot.centerX, n.foot.centerY);
    if (d < bestD) { best = n; bestD = d; }
  });
  return best;
}
