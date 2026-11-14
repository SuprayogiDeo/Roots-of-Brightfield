// Background music (Step 5.2).
//
// HOW TO ADD A NEW SONG LATER (no other code needs to change):
//   1. Put the .mp3 in public/assets/audio/music/  (tip: ~96 kbps stereo keeps it small).
//   2. Add ONE line to MUSIC_TRACKS below.
//   3. Put its key in the `tracks` list of the rule(s) that should play it (MUSIC_RULES).
//
// Songs are STREAMED (HTML audio element -> WebAudio gain), not decoded into memory,
// so a 4-minute song does not cost ~80 MB of RAM on a phone.

const LS_LEVEL = 'rob_music';      // 0 = off, 1 = low, 2 = medium, 3 = high
const LEVELS = [0, 0.25, 0.45, 0.7];
const FADE_MS = 1500;
const GAP_MS = 1800;               // quiet pause between two songs

// ---------------------------------------------------------------------------
// 1) THE SONG LIST — key -> file. `volume` (0..1) trims a song that is too loud/quiet.
// ---------------------------------------------------------------------------
export const MUSIC_TRACKS = {
  track_5: { src: 'assets/audio/music/track_5.mp3', volume: 1 },
  track_7: { src: 'assets/audio/music/track_7.mp3', volume: 1 },
  snow_song: { src: 'assets/audio/music/snow_song.mp3', volume: 1 },
  into_the_snow: { src: 'assets/audio/music/into_the_snow.mp3', volume: 1 }
  // new_song: { src: 'assets/audio/music/new_song.mp3', volume: 1 },
};

// ---------------------------------------------------------------------------
// 2) THE RULES — the FIRST rule whose `when` is true decides what plays.
//    ctx = { area, season (0 Spring .. 3 Winter), weather, festival (id or null), outdoor }
//    area  = 'farm' | 'village' | 'beach' | 'forest' | 'mine'
//    tracks: [] means silence for that rule. Songs of one rule play in order, then repeat.
// ---------------------------------------------------------------------------
export const MUSIC_RULES = [
  // Festival day: music in the village.
  { id: 'festival', when: (c) => c.festival && c.area === 'village', tracks: ['track_5'] },
  // The mine stays quiet (only sound effects). Add a track key here for mine music later.
  { id: 'mine', when: (c) => c.area === 'mine', tracks: [] },
  // Winter songs (all outdoor maps).
  { id: 'winter', when: (c) => c.season === 3, tracks: ['snow_song', 'into_the_snow'] },
  // Spring / Summer / Fall.
  { id: 'village', when: (c) => c.area === 'village', tracks: ['track_5', 'track_7'] },
  { id: 'day', when: () => true, tracks: ['track_7', 'track_5'] }
];

// Music gets a little quieter in bad weather so the rain ambience can be heard.
const WEATHER_MUL = { rain: 0.8, storm: 0.6 };

const base = () => (import.meta.env && import.meta.env.BASE_URL) || './';

// ---------------------------------------------------------------------------
// Settings (stored outside the save, like Sound / Warm tint)
// ---------------------------------------------------------------------------
export function getMusicLevel() {
  try {
    const v = Number(localStorage.getItem(LS_LEVEL));
    if (v >= 0 && v < LEVELS.length && localStorage.getItem(LS_LEVEL) !== null) return v;
  } catch (e) { /* storage blocked */ }
  return 2; // default: medium
}

export function setMusicLevel(i) {
  try { localStorage.setItem(LS_LEVEL, String(i)); } catch (e) { /* ignore */ }
  player.refresh();
}

// ---------------------------------------------------------------------------
// Player (one instance for the whole game, survives scene changes)
// ---------------------------------------------------------------------------
class MusicPlayer {
  constructor() {
    this.ctx = null;        // AudioContext (shared with Phaser) or null -> plain element volume
    this.cur = null;        // { listId, tracks, index, key, el, gain, url }
    this.last = null;       // last requested { rule, mul, ctx } so Settings can re-apply
    this.token = 0;         // bumps on every change: stale async work stops itself
    this.urls = new Map();  // track key -> Promise<blob url>
    this.paused = false;
    this.retryBound = false;
    this.keep = null;
  }

  // Called by scenes: decide what should play for this situation.
  request(scene, ctx, mul) {
    if (scene && scene.sound && scene.sound.context) this.ctx = scene.sound.context;
    const rule = MUSIC_RULES.find((r) => r.when(ctx)) || { id: 'none', tracks: [] };
    this.last = { rule, mul };
    this.apply();
  }

  refresh() { if (this.last) this.apply(); }

  level() { return LEVELS[getMusicLevel()]; }

  apply() {
    const { rule, mul } = this.last;
    const tracks = rule.tracks.filter((k) => MUSIC_TRACKS[k]);
    if (!tracks.length || this.level() === 0) { this.fadeOut(); return; }
    if (this.cur && this.cur.listId === rule.id) { this.setVolume(mul); return; } // already playing
    this.fadeOut();
    this.begin(rule.id, tracks, 0, mul);
  }

  async begin(listId, tracks, index, mul) {
    const token = ++this.token;
    const key = tracks[index % tracks.length];
    this.keep = key; // dispose() must not revoke the song we are about to play
    let url;
    try { url = await this.urlFor(key); } catch (e) { return; } // offline + not cached: stay silent
    if (token !== this.token) return;

    const el = new Audio();
    el.src = url;
    el.preload = 'auto';
    el.loop = tracks.length === 1;
    let gain = null;
    if (this.ctx) {
      try {
        const src = this.ctx.createMediaElementSource(el);
        gain = this.ctx.createGain();
        gain.gain.value = 0;
        src.connect(gain);
        gain.connect(this.ctx.destination);
      } catch (e) { gain = null; }
    }
    if (!gain) el.volume = 0;

    const cur = { listId, tracks, index, key, el, gain, mul };
    this.cur = cur;
    el.addEventListener('ended', () => {
      if (this.cur !== cur) return;
      const t = ++this.token;
      setTimeout(() => {
        if (t === this.token && this.cur === cur) { this.dispose(cur); this.begin(listId, tracks, index + 1, cur.mul); }
      }, GAP_MS);
    });
    this.start(cur);
  }

  start(cur) {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    if (this.paused) return;
    const p = cur.el.play();
    if (p && p.catch) p.catch(() => this.waitForTap());
    this.ramp(cur, this.target(cur), FADE_MS);
  }

  // Browsers only allow audio after a tap: try again on the next one.
  waitForTap() {
    if (this.retryBound) return;
    this.retryBound = true;
    const go = () => {
      this.retryBound = false;
      document.removeEventListener('pointerdown', go, true);
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      const c = this.cur;
      if (c && !this.paused) { const p = c.el.play(); if (p && p.catch) p.catch(() => this.waitForTap()); }
    };
    document.addEventListener('pointerdown', go, true);
  }

  target(cur) {
    return (MUSIC_TRACKS[cur.key].volume ?? 1) * this.level() * (cur.mul ?? 1);
  }

  setVolume(mul) {
    const c = this.cur;
    if (!c) return;
    c.mul = mul;
    this.ramp(c, this.target(c), 400);
  }

  ramp(cur, to, ms) {
    if (cur.gain) {
      const t = this.ctx.currentTime;
      cur.gain.gain.cancelScheduledValues(t);
      cur.gain.gain.setValueAtTime(cur.gain.gain.value, t);
      cur.gain.gain.linearRampToValueAtTime(to, t + ms / 1000);
    } else {
      cur.el.volume = Math.min(1, to); // (no fade without WebAudio)
    }
  }

  fadeOut(ms = 900) {
    const c = this.cur;
    this.token += 1;
    this.cur = null;
    if (!c) return;
    this.ramp(c, 0, ms);
    setTimeout(() => this.dispose(c), ms + 80);
  }

  dispose(c) {
    try { c.el.pause(); c.el.removeAttribute('src'); c.el.load(); } catch (e) { /* ignore */ }
    try { if (c.gain) c.gain.disconnect(); } catch (e) { /* ignore */ }
    // keep memory low: drop blob URLs of songs that are not playing
    this.urls.forEach((p, k) => {
      if (k === this.keep || (this.cur && this.cur.key === k)) return;
      p.then((u) => URL.revokeObjectURL(u)).catch(() => {});
      this.urls.delete(k);
    });
  }

  // Download the whole song once (the service worker caches it for offline play).
  urlFor(key) {
    if (!this.urls.has(key)) {
      const p = fetch(`${base()}${MUSIC_TRACKS[key].src}`)
        .then((r) => { if (!r.ok) throw new Error('music'); return r.blob(); })
        .then((b) => URL.createObjectURL(b));
      p.catch(() => this.urls.delete(key));
      this.urls.set(key, p);
    }
    return this.urls.get(key);
  }

  pause() {
    this.paused = true;
    if (this.cur) { try { this.cur.el.pause(); } catch (e) { /* ignore */ } }
  }

  resume() {
    this.paused = false;
    if (this.cur) { const p = this.cur.el.play(); if (p && p.catch) p.catch(() => this.waitForTap()); }
  }
}

const player = new MusicPlayer();

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

// Call from create() of every map scene. Safe to call again and again:
// if the same playlist is already playing, nothing restarts.
export function playMusicFor(scene, area, save) {
  const t = save && save.time ? save.time : { season: 0, total: 1 };
  const weather = save ? weatherOf(save) : 'sunny';
  const ctx = {
    area,
    season: t.season,
    weather,
    festival: save ? festivalIdOf(save) : null,
    outdoor: area !== 'mine'
  };
  player.request(scene, ctx, WEATHER_MUL[weather] ?? 1);
}

export function stopMusic(ms) { player.last = null; player.fadeOut(ms); }
export function pauseMusic() { player.pause(); }
export function resumeMusic() { player.resume(); }

// --- tiny helpers kept here so music.js stays independent of Phaser scenes ---
import { todayWeather } from './calendar.js';
import { festivalOn } from './festivals.js';
function weatherOf(save) { try { return todayWeather(save); } catch (e) { return 'sunny'; } }
function festivalIdOf(save) { const f = festivalOn(save.time.total); return f ? f.id : null; }
