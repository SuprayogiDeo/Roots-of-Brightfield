import { t } from '../i18n/index.js';
import { playSfx } from './audio.js';
import { ITEMS } from './items.js';
import { newAnimal } from './animals.js';
import {
  QUESTS, questEvent, trackedQuest, currentObjective, countMatching, isActive
} from './quests.js';
import { drainQuestQueue } from './questQueue.js';
import { addXp } from './xp.js';

// Text of one objective, with its counter: "Catch fish (1/3)".
export function objectiveLabel(save, id, index) {
  const ob = QUESTS[id].objectives[index];
  const st = save.quests.active[id];
  const done = st ? st.p[index] : ob.count;
  let label = t(`quest.${id}.o${index}`, { need: ob.count });
  if (ob.type === 'deliver') {
    const have = Math.min(ob.count, countMatching(save.inventory, ob.match.item));
    label += ` (${have}/${ob.count})`;
  } else if (ob.count > 1) {
    label += ` (${done}/${ob.count})`;
  }
  return label;
}

export function trackerText(save) {
  const id = trackedQuest(save);
  const cur = id ? currentObjective(save, id) : null;
  if (!cur) return null;
  return t('quest.label', { goal: objectiveLabel(save, id, cur.index) });
}

export function refreshTracker(scene) {
  if (scene.hud) scene.hud.setQuest(trackerText(scene.save));
}

function rewardLine(r) {
  const parts = [];
  if (r.coins) parts.push(`${r.coins}g`);
  if (r.xp) parts.push(`${r.xp} XP`);
  r.items.forEach(([item, n]) => parts.push(`${n} ${ITEMS[item] ? ITEMS[item].name : item}`));
  return parts.join(', ');
}

// Show toasts / messages / sounds for the result of questEvent() or deliver(), and apply side effects.
export function announceQuest(scene, res) {
  if (!res) return;
  const hud = scene.hud;
  const save = scene.save;
  const completedIds = res.completed.map((c) => c.id);
  let delay = 0;

  // progress (skip quests that just completed: they get their own message)
  res.progressed.forEach((p) => {
    if (completedIds.includes(p.id) || !hud) return;
    if (p.need > 1) hud.toast(t('quest.progress', { goal: objectiveLabel(save, p.id, p.index) }), '#F6E7C1');
    else if (!QUESTS[p.id].ordered) hud.toast(t('quest.step', { goal: t(`quest.${p.id}.o${p.index}`, { need: p.need }) }), '#639922');
  });

  res.completed.forEach((c) => {
    playSfx(scene, 'jingle_quest');
    if (c.animal) {
      const pet = newAnimal(c.animal);
      save.animals.push(pet);
      if (scene.animals) scene.animals.spawn(pet);
    }
    if (hud) {
      const title = t(`quest.${c.id}.title`);
      const text = c.id === 'old_shed'
        ? t('quest.shed.complete', { coins: c.coins })
        : t('quest.complete', { title, reward: rewardLine(c) });
      hud.showMessage(text);
      hud.toast(`+${c.coins}g`, '#EF9F27');
      hud.refresh();
      if (c.leveled) {
        scene.time.delayedCall(900, () => { playSfx(scene, 'jingle_quest'); hud.toast(t('level.up', { level: c.level }), '#EF9F27'); });
      }
    }
    delay = 1800;
  });

  if (hud) {
    res.started.forEach((id, i) => {
      scene.time.delayedCall(delay + 600 + i * 1300, () => {
        hud.toast(t(QUESTS[id].giver === 'notebook' ? 'quest.newPage' : 'quest.new', { title: t(`quest.${id}.title`) }), '#EF9F27');
      });
    });
  }
  refreshTracker(scene);
}

// Report a player action to the quest system and show the result.
export function reportQuest(scene, type, payload) {
  const res = questEvent(scene.save, type, payload);
  announceQuest(scene, res);
  return res;
}

// Apply events queued by scenes without quest hooks (Kitchen). Call once in create() after the HUD exists.
export function flushQueuedQuests(scene) {
  drainQuestQueue().forEach((e) => reportQuest(scene, e.type, e.payload));
}

// Visiting a map counts for "explorer"-style quests (once per scene load is enough).
export function reportVisit(scene, map) {
  flushQueuedQuests(scene);
  reportQuest(scene, 'visit', { map });
}

export { isActive, addXp };
