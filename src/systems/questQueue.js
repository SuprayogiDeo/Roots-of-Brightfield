// Events reported by code that runs in a scene which has no quest hook (e.g. the Kitchen screen).
// The next outdoor scene drains the queue with its own freshly loaded save.
const queue = [];
export const queueQuestEvent = (type, payload = {}) => { queue.push({ type, payload }); };
export const drainQuestQueue = () => queue.splice(0, queue.length);
