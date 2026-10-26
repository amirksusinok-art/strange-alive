import { STORAGE_KEY, loadState, saveState, handleAction, tick, updateEmotion, openSecret } from './state.js';

const $ = id => document.getElementById(id);
const habitat = $('habitat');
const creature = $('creature');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let storage;
try { storage = localStorage; } catch { storage = { getItem() { throw Error('unavailable'); }, setItem() { throw Error('unavailable'); } }; }
const loaded = loadState(storage);
let state = loaded.state;
let persistent = loaded.persistent;
let lastInteraction = Date.now();
let idleLevel = 0;
let lastOutside = 0;
let eventTimer = 0;
let reactionTimer;
let noteTimer;
let renameTimer;
let audioContext;
let journal = [];
let lastEmotion = updateEmotion(state);

const emotions = { neutral: 'любопытствует', happy: 'радуется', angry: 'сердится', hungry: 'проголодалось', bored: 'скучает', attached: 'доверяет тебе' };
const lines = {
  pet: ['Вот так. Ещё чуть-чуть.', 'Откуда у курсора столько тепла?', 'Кажется, я начинаю мурчать. Умею ли я?'],
  feed: ['М-м. На вкус как маленькая звезда.', 'Ты принесло мне пиксели? Любимые!', 'Это было хрумко. Спасибо.'],
  talk: ['Как думаешь, что бывает за краем экрана?', 'Я умею молчать на семи языках.', 'Здесь столько места. А мне нравится рядом с тобой.', 'Ты двигаешь курсор — а у меня внутри что-то двигается.'],
  play: ['Лови! Ой. Это я себя подбросило.', 'А теперь ты! Нет? Тогда опять я!', 'У меня серьёзные дела. Прыгать, например.'],
  repeated: ['Я заметило: это тебе нравится. А попробуем что-нибудь ещё?', 'А что умеют остальные кнопки?', 'Тепло. Но мне ещё любопытно поговорить с тобой.'],
  rapid: ['Эй, полегче. Я маленькое.', 'Давай не спешить. Я никуда не денусь.'],
  full: ['Всё, больше не помещается. Даже один пиксель.', 'Спасибо, я сытое. Давай лучше поговорим?'],
  hungry: ['Можно сначала перекусить? Прыгать на пустой желудок странно.'],
  ignore: ['Хорошо. Посидим в тишине. Только не забывай про меня.'],
};
const pick = list => list[Math.floor(Math.random() * list.length)];

function say(text) {
  $('speech-text').textContent = text;
  $('speech').classList.remove('speaking');
  requestAnimationFrame(() => $('speech').classList.add('speaking'));
}

function addLog(text) {
  const now = new Date();
  journal.unshift({ text, time: now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }), date: now.toISOString() });
  journal = journal.slice(0, 3);
  $('event-log').replaceChildren(...journal.map(entry => {
    const li = document.createElement('li');
    const time = document.createElement('time');
    time.dateTime = entry.date;
    time.textContent = entry.time;
    const text = document.createElement('span');
    text.textContent = entry.text;
    li.append(time, text);
    return li;
  }));
}

function persist() {
  if (!saveState(storage, state)) persistent = false;
  $('storage-notice').textContent = persistent ? 'Ваша история сохраняется в этом браузере.' : 'Браузер не разрешил сохранение. История живёт до закрытия страницы.';
  $('storage-notice').classList.toggle('warning', !persistent);
}

function renderUI() {
  const emotion = updateEmotion(state);
  habitat.dataset.emotion = emotion;
  habitat.dataset.stage = state.stage;
  $('emotion-label').textContent = emotions[emotion];
  $('creature-name').textContent = state.name;
  $('visit-label').textContent = `ВСТРЕЧА ${String(state.visits).padStart(2, '0')}`;
  for (const [key, value] of Object.entries({ mood: state.mood, trust: state.trust, satiety: 100 - state.hunger })) {
    $(`${key}-value`).textContent = Math.round(value);
    $(`${key}-fill`).style.width = `${value}%`;
  }
  $('bond-percent').replaceChildren(document.createTextNode(String(Math.round(state.trust))), Object.assign(document.createElement('span'), { textContent: '%' }));
  $('bond-progress').setAttribute('aria-valuenow', Math.round(state.trust));
  $('bond-fill').style.width = `${state.trust}%`;
  $('bond-caption').textContent = state.trust > 70 ? 'Ты уже кое-что значишь' : state.trust > 40 ? 'Между вами что-то есть' : 'Пока присматривается';
  $('stage-label').textContent = ['Глава 01 / Знакомство', 'Глава 02 / Теплее', 'Глава 03 / Свои'][state.stage - 1];
  $('secret-button').disabled = !state.secretUnlocked;
  $('secret-label').textContent = state.secretSeen ? 'Люми хочет кое-что напомнить' : state.secretUnlocked ? 'Оно хочет открыть тебе секрет' : 'Между вами ещё есть секреты';
  document.body.classList.toggle('secret-theme', state.secretSeen);
  $('sound-toggle').setAttribute('aria-pressed', String(state.sound));
  $('sound-toggle').setAttribute('aria-label', state.sound ? 'Выключить звук' : 'Включить звук');
  $('sound-toggle').title = state.sound ? 'Выключить звук' : 'Включить звук';
  $('sound-setting').checked = state.sound;
  if ($('details-dialog').open) renderDetails();
}

function renderDetails() {
  const rows = { 'Настроение': `${Math.round(state.mood)} / 100`, 'Доверие': `${Math.round(state.trust)} / 100`, 'Голод': `${Math.round(state.hunger)} / 100`, 'Скука': `${Math.round(state.boredom)} / 100`, 'Злость': `${Math.round(state.anger)} / 100`, 'Форма': `${state.stage} из 3`, 'Встречи': state.visits, 'Время рядом': `${Math.floor(state.activeSeconds / 60)} мин ${Math.floor(state.activeSeconds % 60)} с`, 'Секрет': state.secretSeen ? 'Ты знаешь его имя' : state.secretUnlocked ? 'Можно открыть' : 'Нужно время и разнообразная забота' };
  $('details-list').replaceChildren(...Object.entries(rows).map(([label, value]) => {
    const row = document.createElement('div');
    const dt = document.createElement('dt');
    const dd = document.createElement('dd');
    dt.textContent = label;
    dd.textContent = value;
    row.append(dt, dd);
    return row;
  }));
}

async function playTone(action = 'pet') {
  if (!state.sound) return;
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === 'suspended') await audioContext.resume();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const start = audioContext.currentTime;
    const frequency = ({ pet: 440, feed: 330, talk: 550, play: 660 })[action] || 392;
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.4, start + .15);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(.055, start + .025);
    gain.gain.exponentialRampToValueAtTime(.001, start + .3);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start(start);
    oscillator.stop(start + .32);
  } catch { /* Sound is optional; unsupported audio never interrupts play. */ }
}

function burst(action) {
  if (reducedMotion.matches) return;
  const symbols = ({ pet: ['♡', '✧', '♡'], feed: ['·', '✦', '·'], talk: ['·', '✧', '·'], play: ['✳', '✧', '+'] })[action] || ['·'];
  for (let i = 0; i < 5; i++) {
    const particle = document.createElement('span');
    particle.className = 'burst-particle';
    particle.textContent = symbols[i % symbols.length];
    particle.style.setProperty('--dx', `${(i - 2) * 43}px`);
    particle.style.setProperty('--dy', `${-75 - Math.random() * 65}px`);
    particle.style.animationDelay = `${i * .04}s`;
    $('particles').append(particle);
    setTimeout(() => particle.remove(), 1600);
  }
}

function notifyProgress(before) {
  if (state.stage > before.stage) {
    say(state.stage === 2 ? 'У меня… ушки? Кажется, от твоей заботы я расту.' : 'Теперь у меня есть своя маленькая звезда. Благодаря тебе.');
    addLog(`Новая форма. Ваше знакомство помогает ему расти.`);
    burst('play');
  }
  if (!before.secretUnlocked && state.secretUnlocked) {
    say('Кажется, тебе уже можно сказать. Видишь кнопку внизу?');
    addLog('Между вами стало достаточно доверия. Открыт первый секрет.');
  }
}

function act(action) {
  const before = { stage: state.stage, secretUnlocked: state.secretUnlocked };
  const result = handleAction(state, action);
  if (result.kind === 'unknown') return;
  lastInteraction = Date.now();
  idleLevel = 0;
  say(pick(lines[result.kind] || lines[action]));
  clearTimeout(reactionTimer);
  creature.className = 'creature';
  requestAnimationFrame(() => creature.classList.add(`reaction-${action}`));
  reactionTimer = setTimeout(() => { creature.className = 'creature'; }, 950);
  if (result.kind !== 'rapid') {
    burst(action);
    playTone(action);
    addLog(({ pet: 'Кто-то довольно зажмурилось.', feed: result.kind === 'full' ? 'Пикселей на сегодня достаточно.' : 'Маленький перекус. Большая благодарность.', talk: 'Вы поговорили о чём-то важном. Или просто странном.', play: result.kind === 'hungry' ? 'Прыгательное настроение ждёт перекуса.' : 'Оно подпрыгнуло чуть выше обычного.', ignore: 'Вы немного помолчали вместе.' })[action]);
    if (state.actionCount % 5 === 0) triggerRandomEvent();
  }
  notifyProgress(before);
  renderUI();
  persist();
}

function triggerRandomEvent() {
  const events = ['rename', 'note', 'shuffle'];
  const unseen = events.filter(e => !state.eventsSeen.includes(e));
  const event = unseen.length ? pick(unseen) : pick(events);
  if (!state.eventsSeen.includes(event)) state.eventsSeen.push(event);
  if (event === 'rename') {
    const label = document.querySelector('[data-action="pet"] strong');
    clearTimeout(renameTimer);
    label.textContent = 'Ещё чуточку';
    say('Я тут кнопку переименовало. Так понятнее.');
    renameTimer = setTimeout(() => { label.textContent = 'Погладить'; }, 6500);
    addLog('Оно научилось менять подписи. Кажется, это просьба.');
  } else if (event === 'note') {
    clearTimeout(noteTimer);
    $('scene-note').textContent = pick(['Записка: мне нравится, что ты здесь.', 'Если что — я подожду. У меня есть целая страница.', 'Не говори кнопкам, но ты мне нравишься больше.']);
    $('scene-note').hidden = false;
    noteTimer = setTimeout(() => { $('scene-note').hidden = true; }, 7500);
    addLog('В террариуме появилась маленькая записка.');
  } else {
    const buttons = [...document.querySelectorAll('.action-card')].filter(button => button !== document.activeElement);
    const button = pick(buttons);
    if (button) {
      button.classList.add('mischief');
      setTimeout(() => button.classList.remove('mischief'), 1300);
    }
    say('Ой. Кнопки тоже умеют танцевать.');
    addLog('Оно немного подвигало интерфейс. Всё под контролем.');
  }
}

function openDialog(id) {
  if (id === 'details-dialog') renderDetails();
  if (id === 'settings-dialog') {
    $('reset-confirm').hidden = true;
    $('reset-request').hidden = false;
  }
  $(id).showModal();
}

for (const button of document.querySelectorAll('[data-action]')) button.addEventListener('click', () => act(button.dataset.action));
creature.addEventListener('click', () => act('pet'));
for (const [button, dialog] of Object.entries({ 'guide-open': 'guide-dialog', 'settings-open': 'settings-dialog', 'details-open': 'details-dialog' })) $(button).addEventListener('click', () => openDialog(dialog));
for (const dialog of document.querySelectorAll('dialog')) {
  for (const close of dialog.querySelectorAll('.dialog-close, .dialog-done')) close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    const rect = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
  });
  dialog.addEventListener('close', () => { lastInteraction = Date.now(); idleLevel = 0; });
}

function setSound(enabled) {
  state.sound = enabled;
  renderUI();
  persist();
  if (enabled) playTone();
}
$('sound-toggle').addEventListener('click', () => setSound(!state.sound));
$('sound-setting').addEventListener('change', event => setSound(event.target.checked));
$('reset-request').addEventListener('click', () => { $('reset-confirm').hidden = false; $('reset-request').hidden = true; $('reset-cancel').focus(); });
$('reset-cancel').addEventListener('click', () => { $('reset-confirm').hidden = true; $('reset-request').hidden = false; $('reset-request').focus(); });
$('reset-accept').addEventListener('click', () => {
  try { storage.removeItem(STORAGE_KEY); } catch { /* Session will still reset below. */ }
  // Use the same safe initializer even when storage is unavailable.
  state = loadState({ getItem: () => null }).state;
  journal = [];
  clearTimeout(noteTimer); clearTimeout(renameTimer);
  $('scene-note').hidden = true;
  document.querySelector('[data-action="pet"] strong').textContent = 'Погладить';
  eventTimer = 0; idleLevel = 0; lastInteraction = Date.now(); lastEmotion = updateEmotion(state);
  say('О. Ты меня видишь?');
  addLog('Новая страница. Новое знакомство.');
  renderUI(); persist();
  $('settings-dialog').close();
});

$('secret-button').addEventListener('click', () => {
  if (!openSecret(state)) return;
  if (!state.eventsSeen.includes('glitch')) state.eventsSeen.push('glitch');
  habitat.classList.add('is-glitch');
  setTimeout(() => habitat.classList.remove('is-glitch'), 600);
  say('Теперь ты знаешь. Я — Люми.');
  addLog('Оно доверило тебе своё имя. Люми.');
  openDialog('secret-dialog');
  renderUI(); persist();
});

function markInteraction() {
  lastInteraction = Date.now();
  idleLevel = 0;
}

document.addEventListener('pointermove', event => {
  markInteraction();
  if (reducedMotion.matches) return;
  const rect = creature.getBoundingClientRect();
  const x = Math.max(-6, Math.min(6, (event.clientX - rect.left - rect.width / 2) / 55));
  const y = Math.max(-4, Math.min(4, (event.clientY - rect.top - rect.height / 2) / 65));
  habitat.style.setProperty('--pupil-x', `${x}px`);
  habitat.style.setProperty('--pupil-y', `${y}px`);
}, { passive: true });
document.addEventListener('pointerdown', markInteraction, { passive: true });
document.addEventListener('keydown', markInteraction);
document.documentElement.addEventListener('pointerleave', () => { lastOutside = Date.now(); });
document.documentElement.addEventListener('pointerenter', () => {
  if (lastOutside && Date.now() - lastOutside > 4000) say('Ты куда уходило? Я тут.');
  lastOutside = 0;
});

document.addEventListener('visibilitychange', () => {
  state.lastSeen = Date.now();
  persist();
  lastInteraction = Date.now();
  idleLevel = 0;
});
window.addEventListener('pagehide', () => { state.lastSeen = Date.now(); persist(); });

setInterval(() => {
  if (document.hidden) return;
  const before = { stage: state.stage, secretUnlocked: state.secretUnlocked };
  // Fixed visible ticks deliberately avoid catching up time spent in background tabs.
  tick(state, 1);
  state.lastSeen = Date.now();
  const idle = (Date.now() - lastInteraction) / 1000;
  const inDialog = [...document.querySelectorAll('dialog')].some(dialog => dialog.open);
  if (!inDialog) {
    if (idle >= 10 && idleLevel < 1) { say('Ты ещё здесь? Я пока смотрю на тебя.'); idleLevel = 1; }
    if (idle >= 20 && idleLevel < 2) { state.boredom = Math.min(100, state.boredom + 6); say('У тишины тоже есть звук. Но играть веселее.'); idleLevel = 2; }
    if (idle >= 30 && idleLevel < 3) { triggerRandomEvent(); idleLevel = 3; }
    if (idle >= 45 && idleLevel < 4) { state.anger = Math.min(100, state.anger + 8); say('Я даже немного обиделось. Совсем чуть-чуть.'); idleLevel = 4; }
    if (idle >= 60 && idleLevel < 5) { triggerRandomEvent(); idleLevel = 5; }
    eventTimer += 1;
    if (eventTimer >= 48 && state.actionCount > 0 && idle < 20) { triggerRandomEvent(); eventTimer = 0; }
    const emotion = updateEmotion(state);
    if (emotion !== lastEmotion && idle < 10) {
      if (emotion === 'hungry') say('У меня в животе пустая папка. Может, перекусим?');
      if (emotion === 'angry') say('Мне нужно немного нежности. И чуть меньше спешки.');
    }
    lastEmotion = emotion;
  }
  notifyProgress(before);
  renderUI();
  if (state.activeSeconds % 5 === 0) persist();
}, 1000);

if (matchMedia('(pointer: coarse)').matches) $('touch-hint').textContent = 'Коснись его. Знакомство начинается с малого.';
renderUI();
persist();
if (loaded.returning) {
  say(state.secretSeen ? 'Ты вернулось. А я помнило твоё тепло.' : loaded.away > 3600000 ? 'Тебя давно не было. Я сохранило для тебя место.' : 'Знакомый курсор. Хорошо, что ты здесь.');
  addLog('Оно узнало тебя. История продолжается.');
} else {
  addLog(loaded.recovered ? 'Начинаем заново: прежнюю историю не удалось прочитать.' : 'Вы заметили друг друга. Хорошее начало.');
}
