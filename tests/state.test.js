import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, loadState, saveState, handleAction, tick, updateEmotion, openSecret } from '../public/state.js';

const now = 1800000000000;
const memory = value => ({ getItem: () => value, setItem() {} });

test('care improves mood/trust and food reduces hunger without exceeding limits', () => {
  const s = createState(now);
  handleAction(s, 'pet', now + 2000);
  assert.ok(s.mood > 50 && s.trust > 20);
  const hunger = s.hunger;
  handleAction(s, 'feed', now + 5000);
  assert.ok(s.hunger < hunger);
  for (let i = 0; i < 60; i++) handleAction(s, 'pet', now + 9000 + i * 4000);
  assert.ok(s.mood <= 100 && s.trust <= 100);
});

test('rapid clicks and repeating one action do not farm trust', () => {
  const s = createState(now);
  handleAction(s, 'pet', now + 2000);
  const trust = s.trust;
  for (let i = 0; i < 20; i++) handleAction(s, 'pet', now + 2001 + i);
  assert.equal(s.trust, trust);
  handleAction(s, 'pet', now + 10000);
  assert.equal(s.trust, trust);
  assert.ok(s.anger > 0);
});

test('first secret requires three minutes, varied actions and trust', () => {
  const s = createState(now);
  s.trust = 80;
  s.actionsSeen = ['pet', 'feed', 'talk', 'play'];
  tick(s, 179);
  assert.equal(s.secretUnlocked, false);
  tick(s, 1);
  assert.equal(s.secretUnlocked, true);
  assert.equal(openSecret(s), true);
  assert.equal(s.name, 'Люми');
  assert.equal(s.secretSeen, true);
});

test('time alone and one repeated action never unlock the secret', () => {
  const s = createState(now);
  s.trust = 100;
  s.actionsSeen = ['pet'];
  tick(s, 300);
  assert.equal(s.secretUnlocked, false);
  assert.equal(openSecret(s), false);
});

test('reload does not count as an evolution visit and absence freezes stats', () => {
  const original = createState(now);
  original.trust = 85;
  const reloaded = loadState(memory(JSON.stringify(original)), now + 1000).state;
  assert.equal(reloaded.visits, 1);
  assert.equal(reloaded.hunger, original.hunger);
  assert.equal(reloaded.activeSeconds, 0);
  const returned = loadState(memory(JSON.stringify(original)), now + 31 * 60000).state;
  assert.equal(returned.visits, 2);
  assert.equal(returned.stage, 2);
  assert.equal(returned.hunger, original.hunger);
  const later = loadState(memory(JSON.stringify(returned)), now + 62 * 60000).state;
  assert.equal(later.stage, 3);
});

test('malformed, null and wrong-shaped saves recover safely', () => {
  for (const value of ['{', 'null', '[]', '{"version":1,"mood":"bad"}']) {
    const loaded = loadState(memory(value), now);
    assert.equal(loaded.state.mood, 50);
    assert.equal(loaded.state.visits, 1);
  }
  const raw = createState(now);
  raw.mood = 999;
  assert.equal(loadState(memory(JSON.stringify(raw)), now).state.mood, 100);
});

test('denied storage never prevents a usable session', () => {
  const denied = { getItem() { throw Error('denied'); }, setItem() { throw Error('denied'); } };
  const loaded = loadState(denied, now);
  assert.equal(loaded.persistent, false);
  assert.equal(saveState(denied, loaded.state), false);
  handleAction(loaded.state, 'talk', now + 2000);
  assert.ok(loaded.state.trust > 20);
});

test('emotion prioritizes anger over hunger and attachment', () => {
  const s = createState(now);
  Object.assign(s, { anger: 90, hunger: 90, trust: 90 });
  assert.equal(updateEmotion(s), 'angry');
  s.anger = 0;
  assert.equal(updateEmotion(s), 'hungry');
  s.hunger = 0;
  s.boredom = 0;
  assert.equal(updateEmotion(s), 'attached');
});
