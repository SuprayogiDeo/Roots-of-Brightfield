// Calendar + weather (Step 5.1a). Pure logic, no Phaser: easy to test.
//
// time.total  = absolute day counter (1, 2, 3 ... never resets). Everything that needs "which day is it"
//               (friendship, mine respawn, weather) uses this.
// time.season / time.day = derived from total (4 seasons x 28 days), kept in the save for the HUD.

export const DAYS_PER_SEASON = 28;
export const SEASON_COUNT = 4; // 0 Spring, 1 Summer, 2 Fall, 3 Winter

export const seasonOf = (total) => Math.floor((total - 1) / DAYS_PER_SEASON) % SEASON_COUNT;
export const dayOf = (total) => ((total - 1) % DAYS_PER_SEASON) + 1;

// Make time.season / time.day agree with time.total.
export function syncCalendar(time) {
  time.season = seasonOf(time.total);
  time.day = dayOf(time.total);
  return time;
}

export const WEATHER_TYPES = ['sunny', 'cloudy', 'rain', 'storm', 'snow'];
export const isWet = (w) => w === 'rain' || w === 'storm'; // waters the crops

// [type, weight] per season
const TABLE = [
  [['sunny', 50], ['cloudy', 15], ['rain', 30], ['storm', 5]],  // Spring
  [['sunny', 60], ['cloudy', 10], ['rain', 20], ['storm', 10]], // Summer
  [['sunny', 40], ['cloudy', 20], ['rain', 35], ['storm', 5]],  // Fall
  [['sunny', 35], ['cloudy', 25], ['snow', 40]]                 // Winter
];

// Deterministic 0..1 value for a day number (same weather every time you load the same day).
function hash01(n) {
  let x = Math.imul(n, 2654435761) >>> 0;
  x ^= x >>> 15;
  x = Math.imul(x, 2246822519) >>> 0;
  x ^= x >>> 13;
  x = Math.imul(x, 3266489917) >>> 0;
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

// The first 3 days are always sunny (tutorial days).
export function weatherFor(total) {
  if (total <= 3) return 'sunny';
  const rows = TABLE[seasonOf(total)];
  let r = hash01(total) * rows.reduce((n, row) => n + row[1], 0);
  for (const [type, w] of rows) {
    r -= w;
    if (r < 0) return type;
  }
  return 'sunny';
}

export const todayWeather = (save) => weatherFor(save.time.total);
export const tomorrowWeather = (save) => weatherFor(save.time.total + 1);

// Which seasons a crop grows in (data lives in crops.js).
export function canGrowIn(cropDef, season) {
  return !cropDef.seasons || cropDef.seasons.includes(season);
}

// Rain / storm waters every tilled plot once per day (idempotent: safe to call on every scene load).
// Returns how many planted crops were newly watered.
export function applyRain(save) {
  if (!save.weather) save.weather = { rainWatered: 0 };
  const total = save.time.total;
  if (!isWet(weatherFor(total)) || save.weather.rainWatered === total) return 0;
  save.weather.rainWatered = total;
  let n = 0;
  Object.values(save.plots || {}).forEach((plot) => {
    if (plot.crop && !plot.watered) n += 1;
    plot.watered = true;
  });
  return n;
}

// Move the calendar one day forward (growth is handled by the caller BEFORE this).
// Crops that cannot grow in a new season wither. Returns what happened.
export function advanceDay(save, cropDefs) {
  const time = save.time;
  const before = time.season;
  time.total += 1;
  syncCalendar(time);
  time.minutes = 360; // 06:00
  const seasonChanged = time.season !== before;
  const withered = [];
  if (seasonChanged) {
    Object.values(save.plots || {}).forEach((plot) => {
      if (plot.crop && !canGrowIn(cropDefs[plot.crop], time.season)) {
        withered.push(plot.crop);
        plot.crop = null;
        plot.grown = 0;
      }
    });
  }
  return { seasonChanged, withered, weather: weatherFor(time.total), forecast: weatherFor(time.total + 1) };
}
