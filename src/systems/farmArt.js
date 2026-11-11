// Code-drawn placeholder art for the farm tileset and the walking player.
// Replaced by real files via ASSET_MANIFEST in src/systems/assets.js.

// --- farm tileset: 8 x 2 tiles (128x32), ids MUST match farm.json -------------
// 0 grass  1 flowers  2 weeds  3 dirt  4 path  5 water  6 fence_h  7 fence_v
// 8 bush   9 rock    10 roof  11 wall 12 door_closed 13 door_open 14 sign 15 stump

export function createFarmTileset(scene) {
  if (scene.textures.exists('tiles_farm')) return; // real art (manifest) or already made
  const g = scene.make.graphics({ add: false });
  const at = (id) => [(id % 8) * 16, Math.floor(id / 8) * 16];
  const R = (id, x, y, w, h, c) => { const [ox, oy] = at(id); g.fillStyle(c, 1); g.fillRect(ox + x, oy + y, w, h); };
  const C = (id, x, y, r, c) => { const [ox, oy] = at(id); g.fillStyle(c, 1); g.fillCircle(ox + x, oy + y, r); };
  const grass = (id) => {
    R(id, 0, 0, 16, 16, 0x7cae4e);
    [[3, 4], [11, 2], [7, 10], [13, 12], [2, 13]].forEach(([x, y]) => R(id, x, y, 2, 2, 0x6a9c3f));
  };
  const wall = (id) => {
    R(id, 0, 0, 16, 16, 0x8a5a33);
    [0, 5, 10, 15].forEach((x) => R(id, x, 0, 1, 16, 0x6a4428));
  };

  grass(0);
  grass(1);
  [[3, 3, 0xef9f27], [10, 6, 0xc4553f], [6, 11, 0xf6e7c1], [12, 12, 0xef9f27]].forEach(([x, y, c]) => R(1, x, y, 2, 2, c));
  grass(2);
  [[2, 6], [5, 4], [9, 7], [12, 5], [7, 11], [3, 12], [13, 11]].forEach(([x, y]) => R(2, x, y, 1, 4, 0x4e7a2c));

  R(3, 0, 0, 16, 16, 0x9c6b3c);
  [[2, 3], [9, 6], [5, 12], [12, 10], [0, 8]].forEach(([x, y]) => R(3, x, y, 2, 2, 0x84552c));
  R(3, 7, 2, 2, 1, 0xb07f4a); R(3, 3, 7, 2, 1, 0xb07f4a);

  R(4, 0, 0, 16, 16, 0xc49a62);
  [[3, 2], [10, 5], [6, 10], [13, 13], [1, 12]].forEach(([x, y]) => R(4, x, y, 2, 1, 0xb08650));

  R(5, 0, 0, 16, 16, 0x4f7cac);
  [[2, 3, 4], [9, 7, 3], [4, 12, 5], [12, 13, 2]].forEach(([x, y, w]) => R(5, x, y, w, 1, 0x6d9cc4));

  // fence (transparent background, drawn over the ground layer)
  R(6, 0, 5, 16, 2, 0x8a5a33); R(6, 0, 10, 16, 2, 0x8a5a33); R(6, 7, 2, 3, 12, 0x6a3d22);
  R(7, 6, 1, 4, 14, 0x6a3d22); R(7, 0, 5, 16, 2, 0x8a5a33);

  C(8, 8, 9, 7, 0x3b6d11); C(8, 6, 7, 4, 0x639922);
  C(9, 8, 10, 5, 0x6f675c); C(9, 7, 9, 4, 0x8c8478); R(9, 5, 7, 2, 1, 0xb3ab9f);

  R(10, 0, 0, 16, 16, 0x6a3d22);
  [3, 7, 11, 15].forEach((y) => R(10, 0, y, 16, 1, 0x54331c));
  wall(11);
  wall(12); R(12, 3, 2, 10, 14, 0x4a2f1a); R(12, 10, 9, 2, 2, 0xba7517);
  wall(13); R(13, 3, 2, 10, 14, 0x1a120b); R(13, 3, 2, 2, 14, 0x4a2f1a);

  R(14, 7, 8, 2, 8, 0x6a3d22); R(14, 2, 3, 12, 6, 0xba7517); R(14, 2, 3, 12, 1, 0xd9a35a);
  R(14, 4, 5, 8, 1, 0x854f0b);
  C(15, 8, 10, 6, 0x8a5a33); C(15, 8, 9, 4, 0xba7517); C(15, 8, 9, 2, 0x8a5a33);

  g.generateTexture('tiles_farm', 128, 32);
  g.destroy();
}

// --- player walk textures: 4 directions x 2 frames, 16x16 each -------------
// Real art (Cute Fantasy "Player.png", 6 columns of 32x32 frames):
//   row 0 idle down · 1 idle side · 2 idle up · 3 walk down · 4 walk side · 5 walk up
const REAL_ROW = { idle: { down: 0, side: 1, up: 2 }, walk: { down: 3, side: 4, up: 5 } };

// First frame of the idle row for a facing (used by the crouch effect, see toolAnim.js).
export function idleFrameFor(dir) {
  const d = dir === 'up' || dir === 'down' ? dir : 'side';
  return REAL_ROW.idle[d] * 6;
}

export function usingRealPlayer(scene) {
  return scene.textures.exists('player');
}

function createRealPlayerAnims(scene) {
  ['idle', 'walk'].forEach((kind) => {
    ['down', 'side', 'up'].forEach((d) => {
      const key = `pl_${kind}_${d}`;
      if (scene.anims.exists(key)) return;
      const row = REAL_ROW[kind][d];
      scene.anims.create({
        key,
        frames: scene.anims.generateFrameNumbers('player', { start: row * 6, end: row * 6 + 5 }),
        frameRate: kind === 'walk' ? 10 : 6,
        repeat: -1
      });
    });
  });
}

// One API for both placeholder and real art.
export function setPlayerDir(scene, sprite, gender, dir, moving) {
  if (usingRealPlayer(scene)) {
    const d = dir === 'up' || dir === 'down' ? dir : 'side';
    sprite.setFlipX(dir === 'left');
    sprite.play(`pl_${moving ? 'walk' : 'idle'}_${d}`, true);
    return;
  }
  if (moving) sprite.play(`walk_${gender}_${dir}`, true);
  else { sprite.anims.stop(); sprite.setTexture(`p_${gender}_${dir}_0`); }
}

export function createPlayerTextures(scene, gender) {
  if (usingRealPlayer(scene)) { createRealPlayerAnims(scene); return; }
  ['down', 'up', 'left', 'right'].forEach((dir) => {
    [0, 1].forEach((frame) => {
      const key = `p_${gender}_${dir}_${frame}`;
      if (scene.textures.exists(key)) return;
      const g = scene.make.graphics({ add: false });
      drawChar(g, dir, frame === 1, gender === 'female');
      g.generateTexture(key, 16, 16);
      g.destroy();
    });
    const animKey = `walk_${gender}_${dir}`;
    if (!scene.anims.exists(animKey)) {
      scene.anims.create({
        key: animKey,
        frames: [0, 1].map((f) => ({ key: `p_${gender}_${dir}_${f}` })),
        frameRate: 7,
        repeat: -1
      });
    }
  });
}

// Draws the 8x12 pixel figure into a 16x16 frame (offset 4,2).
// dir: down | up | left | right.  step: true = one leg lifted (walk frame).
function drawChar(g, dir, step, female) {
  const SKIN = 0xe8b98a, DARK = 0x2b1d12;
  const hair = female ? 0x8a4a22 : 0x3b2412;
  const shirt = female ? 0xc4553f : 0x4f7cac;
  const pants = 0x5a3e2b, skirt = 0x8b3a4a;
  const flip = dir === 'right';
  const X = (x, w) => (flip ? 8 - x - w : x);
  const R = (x, y, w, h, c) => { g.fillStyle(c, 1); g.fillRect(4 + X(x, w), 2 + y, w, h); };

  // head
  if (dir === 'up') {
    R(1, 0, 6, 5, hair); // back of the head is all hair
    if (female) { R(0, 1, 1, 6, hair); R(7, 1, 1, 6, hair); }
  } else {
    R(1, 2, 6, 3, SKIN);
    R(1, 0, 6, 2, hair);
    R(1, 2, 1, 1, hair); R(6, 2, 1, 1, hair);
    if (female) { R(0, 1, 1, 5, hair); R(7, 1, 1, 5, hair); }
    if (dir === 'down') { R(2, 3, 1, 1, DARK); R(5, 3, 1, 1, DARK); }
    else { R(2, 3, 1, 1, DARK); R(5, 2, 2, 3, hair); } // side: one eye, hair at the back
  }

  // body + arms
  R(1, 5, 6, 4, shirt);
  R(0, 6, 1, 2, shirt); R(7, 6, 1, 2, shirt);
  R(0, 8, 1, 1, SKIN); R(7, 8, 1, 1, SKIN);

  // legs (step frame lifts one leg)
  if (female) {
    R(0, 9, 8, 2, skirt);
    if (step) { R(2, 10, 1, 1, SKIN); R(5, 11, 1, 1, SKIN); }
    else { R(2, 11, 1, 1, SKIN); R(5, 11, 1, 1, SKIN); }
  } else {
    R(1, 9, 3, 2, pants); R(4, 9, 3, 2, pants);
    if (step) { R(1, 10, 3, 1, DARK); R(4, 11, 3, 1, DARK); }
    else { R(1, 11, 3, 1, DARK); R(4, 11, 3, 1, DARK); }
  }
}
