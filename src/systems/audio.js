// Sound layer. Every clip is referenced by KEY through ASSET_MANIFEST, exactly like art,
// so swapping clips later touches only src/systems/assets.js.
// Clips: Kenney (CC0) — see CREDITS.md.

const LS_KEY = 'rob_sfx';

export const SFX_KEYS = [
  'sfx_click', 'sfx_till', 'sfx_plant', 'sfx_water', 'sfx_harvest',
  'sfx_coins', 'sfx_door', 'sfx_deny', 'jingle_quest', 'jingle_day',
  'sfx_splash', 'sfx_steps_wet'
];

const VOLUME = {
  sfx_click: 0.35,
  sfx_till: 0.55,
  sfx_plant: 0.45,
  sfx_water: 0.6,
  sfx_splash: 0.5,
  sfx_steps_wet: 0.3,
  sfx_harvest: 0.45,
  sfx_coins: 0.5,
  sfx_door: 0.5,
  sfx_deny: 0.35,
  jingle_quest: 0.3,
  jingle_day: 0.25
};

export function sfxEnabled() {
  try {
    const v = localStorage.getItem(LS_KEY);
    if (v === '0') return false;
    if (v === '1') return true;
  } catch (e) { /* storage blocked */ }
  return true; // default ON
}

export function setSfx(on) {
  try { localStorage.setItem(LS_KEY, on ? '1' : '0'); } catch (e) { /* ignore */ }
}

// Safe to call anywhere: silently does nothing when the clip is not loaded or sound is off.
export function playSfx(scene, key) {
  if (!sfxEnabled() || !scene || !scene.cache.audio.exists(key)) return;
  try {
    scene.sound.play(key, { volume: VOLUME[key] || 0.4 });
  } catch (e) { /* audio not unlocked yet */ }
}

// Looping wet-footstep bed: call update() every frame from a scene's update().
// Fades in while the player walks, fades out when they stop, and respects the Sound setting.
// (The clip is one long recording of steps in puddles, so a quiet loop sounds more natural
// than triggering it per step.)
export function createFootsteps(scene) {
  const KEY = 'sfx_steps_wet';
  let snd = null;
  let vol = 0;

  const ensure = () => {
    if (snd || !scene.cache.audio.exists(KEY)) return snd;
    try { snd = scene.sound.add(KEY, { loop: true, volume: 0 }); } catch (e) { snd = null; }
    return snd;
  };

  return {
    update(moving, running, delta) {
      const target = moving && sfxEnabled() ? (VOLUME[KEY] || 0.3) : 0;
      if (target === 0 && vol === 0) return;
      const s = ensure();
      if (!s) return;
      const step = (delta || 16) / 1000 / (target > vol ? 0.15 : 0.25) * (VOLUME[KEY] || 0.3);
      vol = target > vol ? Math.min(target, vol + step) : Math.max(target, vol - step);
      try {
        if (vol > 0 && !s.isPlaying) s.play();
        s.setVolume(vol);
        s.setRate(running ? 1.25 : 1);
        if (vol === 0 && s.isPlaying) s.pause();
      } catch (e) { /* audio not unlocked yet */ }
    },
    stop() {
      if (!snd) return;
      try { snd.stop(); snd.destroy(); } catch (e) { /* ignore */ }
      snd = null;
      vol = 0;
    }
  };
}
