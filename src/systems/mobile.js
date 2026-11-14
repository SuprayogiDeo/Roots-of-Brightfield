import { pauseMusic, resumeMusic } from './music.js';

// Mobile guards (no zoom, no callout, no scroll) + app lifecycle.

export function setupMobileGuards() {
  const stop = (e) => e.preventDefault();
  document.addEventListener('contextmenu', stop);
  document.addEventListener('gesturestart', stop);
  document.addEventListener('dblclick', stop);
  // Block page scroll / pull-to-refresh, but keep the name input usable.
  document.addEventListener('touchmove', (e) => {
    if (e.target && e.target.tagName === 'INPUT') return;
    e.preventDefault();
  }, { passive: false });
}

// Pause the Farm when the app is hidden (FarmScene autosaves on pause).
export function setupLifecycle(game) {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pauseMusic(); else resumeMusic(); // music follows the app, in every scene
    const farm = game.scene.getScene('Farm');
    if (!farm || !farm.sys.isActive() && !farm.sys.isPaused()) return;
    if (document.hidden) farm.scene.pause();
    else farm.scene.resume();
  });
}
