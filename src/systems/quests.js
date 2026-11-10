// First quest: "Old Shed" — doubles as the farming tutorial.
// Steps advance in order; each step maps to one player action.

export const QUEST_STEPS = ['shed', 'till', 'plant', 'water', 'harvest', 'sell'];
export const QUEST_REWARD = 100;

// i18n key for the current objective line, or null when the quest is done.
export function questObjectiveKey(quest) {
  if (!quest || quest.done) return null;
  const step = QUEST_STEPS[quest.step];
  return step ? `quest.shed.${step}` : null;
}

// Call after an action. Returns true when THIS action completed the quest.
export function advanceQuest(save, action) {
  const quest = save.quest;
  if (!quest || quest.done) return false;
  if (QUEST_STEPS[quest.step] !== action) return false;
  quest.step += 1;
  if (quest.step >= QUEST_STEPS.length) {
    quest.done = true;
    save.coins += QUEST_REWARD;
    return true;
  }
  return false;
}
