import { t } from '../i18n/index.js';
import { makeText, makeButton } from '../systems/ui.js';
import { playSfx } from '../systems/audio.js';
import { ITEMS } from '../systems/items.js';
import {
  QUESTS, QUEST_IDS, NOTEBOOK, isActive, isDone, setTracked, trackedQuest, notebookOpen, pageState
} from '../systems/quests.js';
import { objectiveLabel } from '../systems/questUi.js';
import { todayWeather, tomorrowWeather } from '../systems/calendar.js';

// Quests tab of the pause menu (Step 5.1b): Active / Done lists, a detail panel, and Grandpa's Notebook.
// Layout (480x270): list column x 92-242, detail panel x 250-472. Press Start 2P = 8 px per character.
const LX = 92;
const LY = 58;
const ROW = 20;
const DX = 252;
const DW = 212;
const VIEWS = ['active', 'done', 'notebook'];

const clip = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}.` : s);

export function buildQuestLog(scene) {
  const save = scene.save;
  scene.qlView = scene.qlView || 'active';
  scene.qlSel = scene.qlSel || null;

  // weather line (top right)
  scene.keep(makeText(scene, 472, 20, t('quests.weather', {
    today: t(`weather.${todayWeather(save)}`), tomorrow: t(`weather.${tomorrowWeather(save)}`)
  }), 8, '#9AD5FF', { origin: [1, 0.5] }));

  // view buttons
  const btns = VIEWS.map((v, i) => makeButton(scene, LX + 36 + i * 76, 40, 72, 16, t(`quests.${v}`), () => {
    playSfx(scene, 'sfx_click');
    scene.qlView = v;
    scene.qlSel = null;
    render();
  }));
  btns.forEach((b) => scene.keep(b));

  let dyn = [];
  scene.keep({ destroy() { dyn.forEach((d) => d.destroy()); dyn = []; } });
  const add = (o) => { dyn.push(o); return o; };
  const text = (x, y, s, color = '#F6E7C1', extra = {}) => add(makeText(scene, x, y, s, 8, color, {
    origin: [0, 0], wordWrap: { width: DW, useAdvancedWrap: true }, lineSpacing: 3, ...extra
  }));

  // ---------- list rows ----------
  function listRow(i, label, sub, selected, onClick, dim = false) {
    const y = LY + i * ROW;
    const bg = add(scene.add.rectangle(LX, y, 154, ROW - 2, 0xf6e7c1, selected ? 0.3 : 0.12).setOrigin(0)
      .setStrokeStyle(selected ? 2 : 1, selected ? 0xef9f27 : 0xf6e7c1, selected ? 1 : 0.35).setInteractive({ useHandCursor: true }));
    bg.on('pointerup', onClick);
    add(makeText(scene, LX + 5, y + 4, clip(label, 17), 8, dim ? '#9c8a6e' : '#F6E7C1', { origin: [0, 0] }));
    if (sub) add(makeText(scene, LX + 149, y + 4, sub, 8, '#EF9F27', { origin: [1, 0] }));
  }

  function questList(ids) {
    if (!ids.length) {
      text(LX, LY + 2, t(scene.qlView === 'done' ? 'quests.noneDone' : 'quests.noneActive'), '#9c8a6e', { wordWrap: { width: 154, useAdvancedWrap: true } });
      return;
    }
    if (!ids.includes(scene.qlSel)) scene.qlSel = ids[0];
    ids.slice(0, 8).forEach((id, i) => {
      const track = isActive(save, id) && trackedQuest(save) === id;
      listRow(i, t(`quest.${id}.title`), track ? '*' : '', id === scene.qlSel, () => { scene.qlSel = id; playSfx(scene, 'sfx_click'); render(); });
    });
  }

  function rewardText(id) {
    const r = QUESTS[id].reward || {};
    const parts = [];
    if (r.coins) parts.push(`${r.coins}g`);
    if (r.xp) parts.push(`${r.xp} XP`);
    (r.items || []).forEach(([item, n]) => parts.push(`${n} ${ITEMS[item].name}`));
    if (r.animal) parts.push(r.animal[0].toUpperCase() + r.animal.slice(1));
    return parts.join(', ');
  }

  function questDetail(id) {
    const q = QUESTS[id];
    text(DX, LY, t(`quest.${id}.title`), '#EF9F27');
    const who = q.giver === 'notebook' ? t('quests.fromNotebook') : t('quests.fromNpc', { name: q.giver[0].toUpperCase() + q.giver.slice(1) });
    text(DX, LY + 14, who, '#9c8a6e');
    const d = text(DX, LY + 30, t(`quest.${id}.desc`));
    let y = LY + 36 + d.height;
    q.objectives.forEach((ob, k) => {
      const done = isDone(save, id) || (save.quests.active[id] && save.quests.active[id].p[k] >= ob.count);
      const lbl = isDone(save, id) ? t(`quest.${id}.o${k}`, { need: ob.count }) : objectiveLabel(save, id, k);
      const o = text(DX, y, `${done ? '[x]' : '[ ]'} ${lbl}`, done ? '#639922' : '#F6E7C1');
      y += o.height + 4;
    });
    text(DX, y + 2, t('quests.reward', { reward: rewardText(id) }), '#EF9F27');
    if (isActive(save, id)) {
      const tracked = trackedQuest(save) === id;
      const b = makeButton(scene, DX + 60, 238, 112, 16, t(tracked ? 'quests.tracking' : 'quests.track'), () => {
        setTracked(save, id);
        playSfx(scene, 'sfx_click');
        render();
      });
      b.setDisabled(tracked);
      add(b);
    }
  }

  // ---------- notebook ----------
  function notebook() {
    if (!notebookOpen(save)) {
      text(LX, LY, t('notebook.closed'), '#9c8a6e', { wordWrap: { width: 370, useAdvancedWrap: true } });
      return;
    }
    if (!scene.qlSel || !NOTEBOOK.includes(scene.qlSel)) scene.qlSel = NOTEBOOK[0];
    NOTEBOOK.forEach((id, i) => {
      const st = pageState(save, id);
      const label = st === 'locked' ? t('notebook.pageLocked', { n: QUESTS[id].page }) : t('notebook.page', { n: QUESTS[id].page });
      listRow(i, label, st === 'done' ? 'OK' : '', id === scene.qlSel, () => { scene.qlSel = id; playSfx(scene, 'sfx_click'); render(); }, st === 'locked');
    });
    const id = scene.qlSel;
    const st = pageState(save, id);
    text(DX, LY, t('notebook.title'), '#EF9F27');
    if (st === 'locked') text(DX, LY + 20, t('notebook.blank'), '#9c8a6e');
    else {
      text(DX, LY + 14, t(`quest.${id}.title`), '#9c8a6e');
      text(DX, LY + 32, t(st === 'done' ? `notebook.${id}.story` : `notebook.${id}.hint`), st === 'done' ? '#F6E7C1' : '#9AD5FF');
    }
  }

  function render() {
    dyn.forEach((d) => d.destroy());
    dyn = [];
    btns.forEach((b, i) => b.bg.setStrokeStyle(VIEWS[i] === scene.qlView ? 2 : 1, VIEWS[i] === scene.qlView ? 0xef9f27 : 0x2b1d12));
    if (scene.qlView === 'notebook') { notebook(); return; }
    const ids = QUEST_IDS.filter((id) => (scene.qlView === 'active' ? isActive(save, id) : isDone(save, id)));
    questList(ids);
    if (ids.length && scene.qlSel) questDetail(scene.qlSel);
  }
  render();
}
