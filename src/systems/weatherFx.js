import Phaser from 'phaser';
import { todayWeather } from './calendar.js';
import { sfxEnabled } from './audio.js';

// Season tint + weather overlay + rain / snow particles + lightning + rain ambience (Step 5.1a).
// One call per outdoor scene; it cleans itself up when the scene shuts down.

const TINT = {
  // season tints (used when the weather itself is sunny / cloudy)
  season: [null, { c: 0xffcf70, a: 0.05 }, { c: 0xe58a2e, a: 0.12 }, { c: 0xcfe0ff, a: 0.12 }],
  rain: { c: 0x23314d, a: 0.25 },
  storm: { c: 0x141c33, a: 0.4 },
  cloudy: { c: 0x56606e, a: 0.12 },
  snow: { c: 0xdfeaff, a: 0.14 }
};
const COUNT = { rain: 70, storm: 130, snow: 60 };

// Soft filtered noise through WebAudio (no sound file needed). Returns { stop } or null.
function startRainSound(scene, heavy) {
  try {
    const ctx = scene.sound && scene.sound.context;
    if (!ctx || !sfxEnabled()) return null;
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = heavy ? 2600 : 1900;
    const gain = ctx.createGain();
    gain.gain.value = heavy ? 0.07 : 0.04;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start();
    return { stop() { try { src.stop(); src.disconnect(); gain.disconnect(); } catch (e) { /* ignore */ } } };
  } catch (e) {
    return null;
  }
}

export function createWeatherFx(scene, save) {
  const weather = todayWeather(save);
  const season = save.time.season;
  const W = scene.scale.width;
  const H = 270;

  const tint = TINT[weather] && weather !== 'sunny' ? TINT[weather] : TINT.season[season];
  const parts = [];
  if (tint) {
    parts.push(scene.add.rectangle(0, 0, W, H, tint.c, tint.a).setOrigin(0).setScrollFactor(0).setDepth(898));
  }

  const kind = weather === 'rain' || weather === 'storm' ? 'rain' : weather === 'snow' ? 'snow' : null;
  let g = null;
  let drops = [];
  if (kind) {
    g = scene.add.graphics().setScrollFactor(0).setDepth(899);
    parts.push(g);
    const n = COUNT[weather];
    for (let i = 0; i < n; i++) {
      drops.push({
        x: Math.random() * W, y: Math.random() * H,
        v: kind === 'rain' ? 230 + Math.random() * 90 : 22 + Math.random() * 25,
        s: Math.random() * 6.28
      });
    }
  }

  let flash = null;
  let flashTimer = null;
  if (weather === 'storm') {
    flash = scene.add.rectangle(0, 0, W, H, 0xffffff, 0).setOrigin(0).setScrollFactor(0).setDepth(899);
    parts.push(flash);
    const schedule = () => {
      flashTimer = scene.time.delayedCall(4000 + Math.random() * 5000, () => {
        scene.tweens.add({ targets: flash, alpha: { from: 0.55, to: 0 }, duration: 220, yoyo: false });
        scene.time.delayedCall(260, () => scene.tweens.add({ targets: flash, alpha: { from: 0.35, to: 0 }, duration: 200 }));
        schedule();
      });
    };
    schedule();
  }

  const sound = kind === 'rain' ? startRainSound(scene, weather === 'storm') : null;

  const update = (time, delta) => {
    if (!g) return;
    const dt = (delta || 16) / 1000;
    g.clear();
    if (kind === 'rain') {
      g.lineStyle(1, 0xbcd4f0, 0.55);
      g.beginPath();
      drops.forEach((p) => {
        p.y += p.v * dt;
        p.x -= 38 * dt;
        if (p.y > H) { p.y = -8; p.x = Math.random() * (W + 40); }
        if (p.x < -4) p.x += W + 8;
        g.moveTo(p.x, p.y);
        g.lineTo(p.x - 2, p.y + 6);
      });
      g.strokePath();
    } else {
      g.fillStyle(0xffffff, 0.85);
      drops.forEach((p) => {
        p.y += p.v * dt;
        p.s += dt * 1.5;
        p.x += Math.sin(p.s) * 10 * dt;
        if (p.y > H) { p.y = -4; p.x = Math.random() * W; }
        g.fillRect(Math.round(p.x), Math.round(p.y), 2, 2);
      });
    }
  };
  scene.events.on(Phaser.Scenes.Events.UPDATE, update);

  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    scene.events.off(Phaser.Scenes.Events.UPDATE, update);
    if (flashTimer) flashTimer.remove();
    if (sound) sound.stop();
    parts.forEach((p) => p.destroy());
    drops = [];
  });

  return { weather };
}
