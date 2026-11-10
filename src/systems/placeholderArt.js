// Code-drawn placeholder art (replaced by real assets via the manifest in a later step).

// Temporary logo: sprout in front of a rising sun, roots under the soil line.
export function drawLogo(scene) {
  const g = scene.add.graphics();
  const HZ = 98; // horizon / soil line
  const rect = (x, y, w, h, c) => { g.fillStyle(c, 1); g.fillRect(x, y, w, h); };

  // sky bands + sun
  rect(0, 0, 480, HZ, 0xf7e3b5);
  rect(0, 56, 480, 22, 0xf5dca4);
  rect(0, 78, 480, 20, 0xf3d594);
  g.fillStyle(0xf4cd83, 1); g.fillCircle(240, HZ, 44);
  g.fillStyle(0xef9f27, 1); g.fillCircle(240, HZ, 34);

  // ground covers the lower half of the sun
  rect(0, HZ, 480, 172, 0x2b1d12);
  rect(0, HZ, 480, 3, 0x854f0b);

  // sprout
  rect(239, 76, 2, 22, 0x3b6d11);
  rect(231, 74, 8, 3, 0x639922); rect(233, 72, 5, 2, 0x639922);
  rect(241, 69, 8, 3, 0x639922); rect(243, 67, 5, 2, 0x639922);

  // roots
  const root = 0xba7517;
  rect(239, 101, 2, 9, root);
  rect(237, 104, 2, 2, root); rect(235, 106, 2, 2, root); rect(233, 108, 2, 2, root);
  rect(241, 104, 2, 2, root); rect(243, 106, 2, 2, root); rect(245, 108, 2, 2, root);
  rect(238, 110, 2, 3, root); rect(241, 110, 2, 3, root);

  // title text is NOT translated (proper name)
  const FONT = '"Press Start 2P", monospace';
  scene.add.text(240, 132, 'ROOTS', { fontFamily: FONT, fontSize: '32px', color: '#EF9F27' })
    .setOrigin(0.5).setShadow(2, 2, '#1b110a', 0, false, true);
  scene.add.text(240, 158, 'of Brightfield', { fontFamily: FONT, fontSize: '8px', color: '#F6E7C1' })
    .setOrigin(0.5);
  return g;
}

// Simple pixel character, 8x12 units. Centered on (cx, cy). s = pixels per unit.
export function drawPlayer(scene, cx, cy, gender, s = 4) {
  const g = scene.add.graphics();
  const u = (x, y, w, h, c) => { g.fillStyle(c, 1); g.fillRect(x * s, y * s, w * s, h * s); };
  const SKIN = 0xe8b98a;
  const DARK = 0x2b1d12;
  const female = gender === 'female';
  const hair = female ? 0x8a4a22 : 0x3b2412;
  const shirt = female ? 0xc4553f : 0x4f7cac;

  u(1, 2, 6, 3, SKIN);          // face
  u(1, 0, 6, 2, hair);          // hair top
  u(1, 2, 1, 1, hair); u(6, 2, 1, 1, hair);
  if (female) { u(0, 1, 1, 5, hair); u(7, 1, 1, 5, hair); } // longer hair
  u(2, 3, 1, 1, DARK); u(5, 3, 1, 1, DARK); // eyes
  u(1, 5, 6, 4, shirt);         // body
  u(0, 6, 1, 2, shirt); u(7, 6, 1, 2, shirt); // arms
  u(0, 8, 1, 1, SKIN); u(7, 8, 1, 1, SKIN);   // hands
  if (female) {
    u(0, 9, 8, 2, 0x8b3a4a);    // skirt
    u(2, 11, 1, 1, SKIN); u(5, 11, 1, 1, SKIN);
  } else {
    u(1, 9, 3, 2, 0x5a3e2b); u(4, 9, 3, 2, 0x5a3e2b); // pants
    u(1, 11, 3, 1, DARK); u(4, 11, 3, 1, DARK);       // boots
  }
  g.setPosition(cx - 4 * s, cy - 6 * s);
  return g;
}
