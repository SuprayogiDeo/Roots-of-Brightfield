import { getLang, setLang } from '../i18n/index.js';

export const FONT = '"Press Start 2P", monospace';

// Press Start 2P looks crisp at multiples of 8px (8, 16, 24, 32).
export function makeText(scene, x, y, str, size = 8, color = '#F6E7C1', extra = {}) {
  const { origin = [0.5, 0.5], ...style } = extra;
  const txt = scene.add.text(x, y, str, { fontFamily: FONT, fontSize: `${size}px`, color, ...style });
  txt.setOrigin(origin[0], origin[1]);
  return txt;
}

// Use EVEN heights so the pixel bevel stays on whole pixels.
export function makeButton(scene, x, y, w, h, label, onClick, opts = {}) {
  const { size = 8, depth = 0 } = opts;
  const bg = scene.add.rectangle(x, y, w, h, 0x854f0b).setStrokeStyle(1, 0x2b1d12).setDepth(depth);
  const hi = scene.add.rectangle(x, y - h / 2 + 2, w - 4, 1, 0xba7517).setDepth(depth);
  const txt = makeText(scene, x, y + 1, label, size, '#F6E7C1').setDepth(depth + 1);
  let pressed = false;
  let disabled = false;

  const paint = (p) => {
    bg.setFillStyle(p ? 0x6a3d08 : 0x854f0b);
    txt.y = y + (p ? 2 : 1);
  };

  bg.setInteractive({ useHandCursor: true });
  bg.on('pointerdown', () => {
    if (disabled) return;
    pressed = true;
    paint(true);
  });
  bg.on('pointerout', () => {
    pressed = false;
    paint(false);
  });
  bg.on('pointerup', () => {
    if (!pressed || disabled) return;
    pressed = false;
    paint(false);
    onClick();
  });

  return {
    bg, hi, txt,
    setLabel(s) { txt.setText(s); },
    setDisabled(d) {
      disabled = d;
      const a = d ? 0.4 : 1;
      bg.setAlpha(a); hi.setAlpha(a); txt.setAlpha(a);
    },
    destroy() { bg.destroy(); hi.destroy(); txt.destroy(); }
  };
}

// Fade out, then switch scene. Every scene must set `this.leaving = false` in create().
export function goTo(scene, key, data) {
  if (scene.leaving) return;
  scene.leaving = true;
  scene.cameras.main.fadeOut(180, 0, 0, 0);
  scene.cameras.main.once('camerafadeoutcomplete', () => scene.scene.start(key, data));
}

// Menu-style scenes are laid out for 480x270. On a wider phone canvas, center them.
export function centerCamera(scene) {
  scene.cameras.main.setScroll(-Math.round((scene.scale.width - 480) / 2), 0);
}

// Notch / rounded-corner insets (left/right) converted to game units.
export function getSafe(scene) {
  let l = 0;
  let r = 0;
  try {
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;'
      + 'padding-left:env(safe-area-inset-left);padding-right:env(safe-area-inset-right)';
    document.body.appendChild(d);
    const cs = getComputedStyle(d);
    const f = scene.scale.displayScale ? scene.scale.displayScale.x : 1;
    l = Math.round((parseFloat(cs.paddingLeft) || 0) * f);
    r = Math.round((parseFloat(cs.paddingRight) || 0) * f);
    d.remove();
  } catch (e) { /* no insets */ }
  return { l, r };
}

// "EN | ID" toggle. Restarts the current scene so all labels refresh.
export function addLangToggle(scene, x, y, depth = 0) {
  const cur = getLang();
  [['en', -16], ['id', 16]].forEach(([code, dx]) => {
    const active = cur === code;
    const bg = scene.add
      .rectangle(x + dx, y, 24, 14, active ? 0x854f0b : 0x2b1d12)
      .setStrokeStyle(1, active ? 0xef9f27 : 0x854f0b)
      .setDepth(depth)
      .setInteractive({ useHandCursor: true });
    makeText(scene, x + dx, y + 1, code.toUpperCase(), 8, active ? '#F6E7C1' : '#9c8a6e').setDepth(depth + 1);
    bg.on('pointerup', () => {
      if (code === getLang()) return;
      setLang(code);
      scene.scene.restart(scene.sys.settings.data);
    });
  });
  makeText(scene, x, y + 1, '|', 8, '#9c8a6e').setDepth(depth);
}
