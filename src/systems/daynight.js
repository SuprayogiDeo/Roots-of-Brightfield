// Day-night tint. One fullscreen overlay per scene, driven by the in-game clock.
// minutes: 0..1440 (game time of day)

const PHASES = [
  { at: 0, color: 0x1b2a4a, alpha: 0.55 },   // deep night
  { at: 300, color: 0x1b2a4a, alpha: 0.5 },  // 05:00
  { at: 390, color: 0xef9f27, alpha: 0.18 }, // 06:30 sunrise
  { at: 480, color: 0xffffff, alpha: 0 },    // 08:00 full day
  { at: 1020, color: 0xffffff, alpha: 0 },   // 17:00
  { at: 1110, color: 0xef7b27, alpha: 0.22 },// 18:30 sunset
  { at: 1260, color: 0x1b2a4a, alpha: 0.45 },// 21:00
  { at: 1440, color: 0x1b2a4a, alpha: 0.55 }
];

const lerp = (a, b, f) => a + (b - a) * f;

function mixColor(c1, c2, f) {
  const r = lerp((c1 >> 16) & 255, (c2 >> 16) & 255, f);
  const g = lerp((c1 >> 8) & 255, (c2 >> 8) & 255, f);
  const b = lerp(c1 & 255, c2 & 255, f);
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
}

export function createNightOverlay(scene) {
  const o = scene.add.rectangle(0, 0, scene.scale.width, 270, 0x1b2a4a, 0)
    .setOrigin(0).setScrollFactor(0).setDepth(900);
  scene.nightOverlay = o;
  return o;
}

export function updateDayNight(scene, minutes) {
  const o = scene.nightOverlay;
  if (!o) return;
  const m = ((minutes % 1440) + 1440) % 1440;
  let i = 0;
  while (i < PHASES.length - 2 && m > PHASES[i + 1].at) i += 1;
  const a = PHASES[i];
  const b = PHASES[i + 1];
  const f = b.at === a.at ? 0 : (m - a.at) / (b.at - a.at);
  o.setFillStyle(mixColor(a.color, b.color, f), lerp(a.alpha, b.alpha, f));
}
