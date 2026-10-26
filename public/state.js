export const STORAGE_KEY = 'strange-alive:v1';
export const ACTIONS = ['pet', 'feed', 'talk', 'play', 'ignore'];
const STATS = ['mood', 'trust', 'hunger', 'boredom', 'anger'];
const clamp = n => Math.min(100, Math.max(0, n));

export function createState(now = Date.now()) {
  return {
    version: 1, mood: 50, trust: 20, hunger: 30, boredom: 40, anger: 0,
    name: '???', stage: 1, visits: 1, activeSeconds: 0,
    lastSeen: now, lastVisitAt: now, lastActionAt: 0, lastAction: '',
    actionsSeen: [], actionCount: 0, secretUnlocked: false, secretSeen: false,
    eventsSeen: [], sound: false,
  };
}

function progress(s) {
  s.secretUnlocked ||= s.activeSeconds >= 180 && s.trust >= 60 &&
    ['pet', 'feed', 'talk', 'play'].every(a => s.actionsSeen.includes(a));
  if (s.trust >= 40 && s.visits >= 2) s.stage = Math.max(2, s.stage);
  if (s.trust >= 75 && s.visits >= 3) s.stage = 3;
}

export function loadState(storage, now = Date.now()) {
  const fresh = () => ({ state: createState(now), persistent: true, returning: false, away: 0 });
  try {
    const value = storage.getItem(STORAGE_KEY);
    if (!value) return fresh();
    const raw = JSON.parse(value);
    if (!raw || Array.isArray(raw) || raw.version !== 1 ||
      !STATS.every(k => Number.isFinite(raw[k]))) return { ...fresh(), recovered: true };
    const state = createState(now);
    for (const key of STATS) state[key] = clamp(raw[key]);
    for (const key of ['visits', 'activeSeconds', 'actionCount']) {
      if (Number.isFinite(raw[key])) state[key] = Math.max(key === 'visits' ? 1 : 0, Math.min(1e9, Math.floor(raw[key])));
    }
    for (const key of ['lastSeen', 'lastVisitAt', 'lastActionAt']) {
      if (Number.isFinite(raw[key])) state[key] = Math.min(now, Math.max(0, raw[key]));
    }
    state.stage = [1, 2, 3].includes(raw.stage) ? raw.stage : 1;
    state.lastAction = ACTIONS.includes(raw.lastAction) ? raw.lastAction : '';
    state.actionsSeen = [...new Set(Array.isArray(raw.actionsSeen) ? raw.actionsSeen.filter(a => ACTIONS.includes(a)) : [])];
    state.eventsSeen = [...new Set(Array.isArray(raw.eventsSeen) ? raw.eventsSeen.filter(a => ['note', 'rename', 'shuffle', 'glitch'].includes(a)) : [])];
    state.secretUnlocked = raw.secretUnlocked === true;
    state.secretSeen = raw.secretSeen === true && state.secretUnlocked;
    state.name = state.secretSeen ? 'Люми' : '???';
    state.sound = raw.sound === true;
    const away = Math.max(0, now - state.lastSeen);
    if (now - state.lastVisitAt >= 30 * 60000) {
      state.visits += 1;
      state.lastVisitAt = now;
    }
    state.lastSeen = now;
    progress(state);
    return { state, persistent: true, returning: true, away };
  } catch (error) {
    if (error instanceof SyntaxError) return { ...fresh(), recovered: true };
    return { ...fresh(), persistent: false };
  }
}

export function saveState(storage, state) {
  try { storage.setItem(STORAGE_KEY, JSON.stringify(state)); return true; }
  catch { return false; }
}

export function updateEmotion(s) {
  if (s.anger > 65) return 'angry';
  if (s.hunger > 80) return 'hungry';
  if (s.boredom > 70) return 'bored';
  if (s.trust > 70) return 'attached';
  if (s.mood > 65) return 'happy';
  return 'neutral';
}

export function handleAction(s, action, now = Date.now()) {
  if (!ACTIONS.includes(action)) return { kind: 'unknown' };
  if (now - s.lastActionAt < 1200) {
    s.anger = clamp(s.anger + 3);
    return { kind: 'rapid' };
  }
  const repeated = s.lastAction === action;
  s.lastActionAt = now;
  s.lastAction = action;
  s.lastSeen = now;
  s.actionCount += 1;
  if (!s.actionsSeen.includes(action)) s.actionsSeen.push(action);
  const add = (key, amount) => { s[key] = clamp(s[key] + amount); };
  if (action === 'ignore') {
    add('anger', 10); add('boredom', 15); add('trust', -8); add('mood', -5);
    return { kind: 'ignore' };
  }
  add('anger', -6);
  if (action === 'pet') { add('mood', 10); add('boredom', -5); }
  if (action === 'feed') {
    const full = s.hunger < 10;
    add('hunger', -20); add('mood', full ? -5 : 5);
    if (full) return { kind: 'full' };
  }
  if (action === 'talk') add('boredom', -10);
  if (action === 'play') {
    if (s.hunger > 80) return { kind: 'hungry' };
    add('boredom', -20); add('mood', 12);
  }
  if (!repeated) add('trust', ({ pet: 8, feed: 3, talk: 5, play: 6 })[action]);
  progress(s);
  return { kind: repeated ? 'repeated' : action };
}

// Only visible time reaches this function; absence never changes the creature.
export function tick(s, seconds = 1) {
  if (!Number.isFinite(seconds) || seconds <= 0) return;
  const before = Math.floor(s.activeSeconds / 8);
  s.activeSeconds += seconds;
  const steps = Math.floor(s.activeSeconds / 8) - before;
  s.hunger = clamp(s.hunger + steps * 0.65);
  s.boredom = clamp(s.boredom + steps * 0.8);
  progress(s);
}

export function openSecret(s) {
  if (!s.secretUnlocked) return false;
  s.secretSeen = true;
  s.name = 'Люми';
  return true;
}
