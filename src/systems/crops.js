// Crops + soil placeholder art and growth rules.
// Crop/item NAMES stay English in both languages (design rule).

// seasons: 0 Spring, 1 Summer, 2 Fall, 3 Winter (nothing grows in Winter). A crop that is still in the
// ground when a season it does not like begins withers (see calendar.js advanceDay).
export const CROPS = {
  carrot: { seasons: [0, 2], seed: 'carrot_seeds', produce: 'carrot', days: 3, price: 35, leaf: 0x639922, fruit: 0xef7b27 },
  corn: { seasons: [1, 2], seed: 'corn_seeds', produce: 'corn', days: 4, price: 50, leaf: 0x7cae4e, fruit: 0xf2c438 },
  chili: { seasons: [1], seed: 'chili_seeds', produce: 'chili', days: 3, price: 40, leaf: 0x3b6d11, fruit: 0xc4553f },
  tomato: { seasons: [0, 1], seed: 'tomato_seeds', produce: 'tomato', days: 4, price: 45, leaf: 0x4e7a2c, fruit: 0xd14b3d }
};

// seed id -> crop id
export const SEED_TO_CROP = Object.keys(CROPS).reduce((m, id) => {
  m[CROPS[id].seed] = id;
  return m;
}, {});

// Texture + frame for one growth stage: real sheet when loaded, placeholder otherwise.
export function cropFrame(scene, id, stage) {
  const key = `cropsheet_${id}`;
  if (scene.textures.exists(key)) return [key, stage];
  return [`crop_${id}_${stage}`, 0];
}

export function isReady(plot) {
  return !!plot && !!plot.crop && plot.grown >= CROPS[plot.crop].days;
}

// --- placeholder textures: soil_dry / soil_wet / crop_<id>_<stage> ----------
export function createCropTextures(scene) {
  const make = (key, draw) => {
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({ add: false });
    const R = (x, y, w, h, c) => { g.fillStyle(c, 1); g.fillRect(x, y, w, h); };
    draw(R);
    g.generateTexture(key, 16, 16);
    g.destroy();
  };

  const soil = (base, dark) => (R) => {
    R(0, 0, 16, 16, base);
    [1, 6, 11].forEach((y) => R(0, y, 16, 1, dark));
    [[3, 3], [10, 8], [6, 13]].forEach(([x, y]) => R(x, y, 2, 1, dark));
  };
  make('soil_dry', soil(0x9c6b3c, 0x7a4f29));
  make('soil_wet', soil(0x6b4526, 0x4e3119));

  Object.keys(CROPS).forEach((id) => {
    const c = CROPS[id];
    for (let s = 0; s <= c.days; s++) {
      make(`crop_${id}_${s}`, (R) => {
        const ratio = s / c.days;
        const h = Math.round(2 + ratio * 9); // 2..11 px tall
        R(7, 15 - h, 2, h, c.leaf);
        if (s >= 1) { R(4, 13 - Math.round(h * 0.5), 3, 2, c.leaf); R(9, 12 - Math.round(h * 0.6), 3, 2, c.leaf); }
        if (s >= c.days) { // ripe: show the fruit
          R(6, 15 - h - 3, 4, 4, c.fruit);
          R(7, 14 - h - 3, 2, 1, c.fruit);
        } else if (ratio >= 0.6) {
          R(7, 15 - h - 1, 2, 2, 0xf6e7c1);
        }
      });
    }
  });
}

// Shipping Bin placeholder (a wooden crate).
export function createBinTexture(scene) {
  if (scene.textures.exists('bin')) return;
  const g = scene.make.graphics({ add: false });
  const R = (x, y, w, h, c) => { g.fillStyle(c, 1); g.fillRect(x, y, w, h); };
  R(0, 3, 16, 13, 0x8a5a33);
  R(0, 3, 16, 2, 0xba7517);
  R(0, 9, 16, 1, 0x6a3d22);
  [0, 7, 15].forEach((x) => R(x, 3, 1, 13, 0x6a3d22));
  R(2, 0, 12, 3, 0x4a2f1a);
  g.generateTexture('bin', 16, 16);
  g.destroy();
}
