// Sound layer. Every clip is referenced by KEY through ASSET_MANIFEST, exactly like art,
// so swapping clips later touches only src/systems/assets.js.
// Clips: Kenney (CC0) — see CREDITS.md.

const LS_KEY = 'rob_sfx';

export const SFX_KEYS = [
  'sfx_click', 'sfx_till', 'sfx_plant', 'sfx_water', 'sfx_harvest',
  'sfx_coins', 'sfx_door', 'sfx_deny', 'jingle_quest', 'jingle_day'
];

const VOLUME = {
  sfx_click: 0.35,
  sfx_till: 0.55,
  sfx_plant: 0.45,
  sfx_water: 0.5,
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
