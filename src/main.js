// 화면 연결
import { PERIODS, PRECHECK } from './data.js';
import { newGame, precheck, canPrecheck, finishPrecheck, idCheck, canIdCheck, finishIdCheck, patrol, canPatrol, endExam, afterCheck, canAfterCheck, nextPeriod, resolvePending, toggleFlag, submitReport, truth, outcome, student, label, clockText, normalizeRoom, randomRoom } from './game.js';
import { drawScene, seatAt, SCENE_W, SCENE_H } from './pixel.js';
import { renderCard } from './card.js';

const $ = (id) => document.getElementById(id);
const reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
const sceneCtx = $('scene').getContext('2d');

let state = null;
let selected = null;
let dialogFrom = 0;
let cardBlob = null;

// ---------- 시작/화면 전환 ----------
function roomFromHash() {
  const m = /room-(\d{4})/.exec(location.hash || '');
  return m ? normalizeRoom(m[1]) : null;
}

function setHash(room) {
  try { history.replaceState(null, '', `#room-${room}`); } catch (e) { /* 무시 */ }
}

function start(room) {
  state = newGame(room);
  selected = null;
  dialogFrom = 0;
  setHash(room);
  showScreen('game');
  render();
  window.scrollTo(0, 0);
}

function showScreen(name) {
  ['title', 'game', 'result'].forEach((id) => { $(id).hidden = id !== name; });
}

// ---------- 렌더링 ----------
function phaseName() {
  const p = PERIODS[state.period];
  switch (state.phase) {
    case 'precheck': return '입실 점검';
    case 'idcheck': return `${p.label} 본인 확인`;
    case 'exam': return `${p.label} ${p.subject}`;
    case 'ending': case 'bell': case 'break': return `${p.label} 종료`;
    case 'report': return '감독 보고서';
    default: return '';
  }
}

function budgetText() {
  switch (state.phase) {
    case 'precheck': return `남은 시간 ${PRECHECK.minutes - state.minutes}분`;
    case 'idcheck': return `본인 확인 ${state.idLeft}회`;
    case 'exam': return `순회 ${state.patrolLeft}회`;
    case 'break': return `교시 후 점검 ${state.afterLeft}회`;
    default: return '';
  }
}

function render() {
  if (!state) return;
  if (state.phase === 'result') { renderResult(); return; }
  $('hud-time').textContent = clockText(state);
  $('hud-phase').textContent = phaseName();
  $('hud-budget').textContent = budgetText();
  const comp = $('hud-complaints');
  comp.textContent = `민원 ${state.complaints}`;
  comp.className = state.complaints >= 3 ? 'warn' : '';
  renderSeats();
  renderDialog();
  renderMenu();
  renderNotes();
  renderLog();
  drawNow();
}

function renderSeats() {
  const grid = $('seat-grid');
  grid.innerHTML = '';
  state.students.forEach((s) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = s.seat;
    b.setAttribute('aria-pressed', String(selected === s.seat));
    b.setAttribute('aria-label', `${label(s)}${s.flagged ? ', 의심 표시됨' : ''}`);
    if (s.flagged) b.classList.add('flagged');
    if (s.slipState === 'reported' || s.schemeState === 'caught') b.classList.add('out');
    b.addEventListener('click', () => select(s.seat));
    grid.appendChild(b);
  });
}

function entryHtml(e, withWho = true) {
  const who = withWho && e.seat ? `<span class="who">${e.seat}번</span>` : '';
  return `<span class="t">${e.time}</span>${who}<span class="k-${e.kind}">${esc(e.text)}</span>`;
}

function renderDialog() {
  const box = $('dialog');
  const fresh = state.log.slice(dialogFrom);
  let html = fresh.map((e) => `<p>${entryHtml(e)}</p>`).join('');
  if (state.pending) html += '<p><b>어떻게 처리할까?</b></p>';
  else if (state.phase === 'report') {
    const flagged = state.students.filter((s) => s.flagged && s.schemeState !== 'caught' && s.slipState !== 'reported');
    html += `<p>${flagged.length ? `사후 조사 요청 대상: <b>${flagged.map((s) => `${s.seat}번`).join(', ')}</b>` : '사후 조사를 요청할 수험생이 없다.'}</p><p class="dim">의심 표시를 바꾸려면 수험생을 고르고 의심 표시를 누른다.</p>`;
  } else if (!fresh.length) html = `<p class="dim">${hint()}</p>`;
  box.innerHTML = html;
}

function hint() {
  switch (state.phase) {
    case 'precheck': return '수험생을 눌러 점검을 시작하세요.';
    case 'idcheck': return '본인 확인할 수험생을 고르세요.';
    case 'exam': return '가까이 지나가며 살펴볼 수험생을 고르세요.';
    case 'break': return '교시 후 점검을 요청할 수험생을 고르거나 다음으로 넘어가세요.';
    default: return '';
  }
}

function item(menu, text, onClick, opts = {}) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'item' + (opts.cls ? ` ${opts.cls}` : '');
  b.innerHTML = `<span>${esc(text)}</span>${opts.cost ? `<span class="cost">${esc(opts.cost)}</span>` : ''}`;
  b.disabled = !!opts.disabled;
  b.addEventListener('click', onClick);
  menu.appendChild(b);
  return b;
}

function sep(menu) {
  const d = document.createElement('div');
  d.className = 'sep';
  menu.appendChild(d);
}

function menuLabel(menu, text) {
  const d = document.createElement('div');
  d.className = 'menu-label';
  d.textContent = text;
  menu.appendChild(d);
}

function renderMenu() {
  const menu = $('menu');
  menu.innerHTML = '';
  if (state.pending) {
    item(menu, '부정행위로 처리한다', () => act(() => resolvePending(state, 'report')), { cls: 'danger' });
    item(menu, '주의만 주고 넘어간다', () => act(() => resolvePending(state, 'excuse')));
    return;
  }
  const s = selected ? student(state, selected) : null;
  if (s) menuLabel(menu, `${label(s)}${s.look.glasses ? ' · 안경' : ''}`);
  else menuLabel(menu, '수험생을 고르지 않았다');

  const flagItem = () => {
    if (s) item(menu, s.flagged ? '의심 표시 지우기' : '의심 표시하기', () => { toggleFlag(state, s.seat); render(); }, { cost: '무료' });
  };

  if (state.phase === 'precheck') {
    if (s) {
      const done = (k) => (s.checked[k] ? '완료' : `${PRECHECK.cost[k]}분`);
      item(menu, '본인 확인 (사진 대조)', () => act(() => precheck(state, 'id', s.seat)), { cost: done('id'), disabled: !canPrecheck(state, 'id', s.seat) });
      item(menu, '소매·옷깃 확인, 단추 스티커', () => act(() => precheck(state, 'clothes', s.seat)), { cost: done('clothes'), disabled: !canPrecheck(state, 'clothes', s.seat) });
      if (s.look.glasses) item(menu, '안경 벗겨서 검사', () => act(() => precheck(state, 'glasses', s.seat)), { cost: done('glasses'), disabled: !canPrecheck(state, 'glasses', s.seat) });
      item(menu, '휴대 물품 확인', () => act(() => precheck(state, 'pockets', s.seat)), { cost: done('pockets'), disabled: !canPrecheck(state, 'pockets', s.seat) });
      flagItem();
    }
    sep(menu);
    item(menu, '전자기기 제출 최종 안내', () => act(() => precheck(state, 'announce')), { cost: state.announced ? '완료' : '1분', disabled: !canPrecheck(state, 'announce') });
    item(menu, '점검 마치고 1교시 시작', () => act(() => finishPrecheck(state)), { cls: 'main' });
  } else if (state.phase === 'idcheck') {
    if (s) {
      item(menu, '본인 확인', () => act(() => idCheck(state, s.seat)), { cost: `${state.idLeft}회 남음`, disabled: !canIdCheck(state, s.seat) });
      flagItem();
    }
    sep(menu);
    item(menu, '본인 확인 마치고 시험 시작', () => act(() => finishIdCheck(state)), { cls: 'main' });
  } else if (state.phase === 'exam') {
    if (s) {
      item(menu, '가까이 지나가며 보기', () => act(() => patrol(state, s.seat)), { cost: `${state.patrolLeft}회 남음`, disabled: !canPatrol(state, s.seat) });
      flagItem();
    }
    sep(menu);
    item(menu, `${PERIODS[state.period].label} 종료까지 감독`, () => act(() => endExam(state)), { cls: 'main' });
  } else if (state.phase === 'break') {
    if (s) {
      item(menu, '시험본부에 교시 후 점검 요청', () => act(() => afterCheck(state, s.seat)), { cost: `${state.afterLeft}회 남음`, disabled: !canAfterCheck(state, s.seat) });
      flagItem();
    }
    sep(menu);
    const last = state.period === PERIODS.length - 1;
    item(menu, last ? '감독 보고서 쓰기' : `${PERIODS[state.period + 1].label} 본인 확인으로`, () => act(() => nextPeriod(state)), { cls: 'main' });
  } else if (state.phase === 'report') {
    if (s) flagItem();
    sep(menu);
    item(menu, '보고서 제출', () => act(() => submitReport(state)), { cls: 'main' });
  }
}

function renderNotes() {
  const box = $('notes');
  if (!selected) { box.hidden = true; return; }
  const s = student(state, selected);
  const notes = state.log.filter((e) => e.seat === selected);
  box.hidden = false;
  $('notes-title').textContent = `수첩 · ${label(s)}`;
  $('notes-list').innerHTML = notes.length
    ? notes.map((e) => `<li>${entryHtml(e, false)}</li>`).join('')
    : '<li class="dim">아직 적은 게 없다.</li>';
}

function renderLog() {
  $('log').innerHTML = state.log.map((e) => `<li>${entryHtml(e)}</li>`).join('');
}

function renderResult() {
  showScreen('result');
  const r = state.result;
  $('r-room').textContent = state.room;
  $('r-grade').textContent = r.grade;
  $('r-title').textContent = r.title;
  $('r-stats').textContent = `점수 ${r.score} · 예방 ${r.prevented} · 처리 ${r.reported} · 봐줌 ${r.excused} · 놓침 ${r.missedSlip} · 민원 ${r.complaints}`;
  $('r-truth').innerHTML = state.students.map((s) => {
    const t = truth(s);
    const cls = s.scheme ? 'scheme' : s.slip ? 'slip' : 'clean';
    const out = outcome(s);
    return `<li><span class="no">${s.seat}번</span><div><span class="tag ${cls}">${t.tag}${t.name ? ` · ${esc(t.name)}` : ''}</span>${esc(s.name)}${out ? `<span class="out">${esc(out)}</span>` : ''}<p>${esc(t.text)}</p></div></li>`;
  }).join('');
  const rc = $('result-scene').getContext('2d');
  drawScene(rc, state, { t: 0, reduceMotion: true });
  window.scrollTo(0, 0);
}

function esc(str) {
  return String(str).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

// ---------- 입력 ----------
function select(seat) {
  selected = selected === seat ? null : seat;
  render();
}

function act(fn) {
  dialogFrom = state.log.length;
  fn();
  render();
  if (state.phase !== 'result') $('dialog').scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
}

$('scene').addEventListener('click', (ev) => {
  if (!state) return;
  const rect = ev.currentTarget.getBoundingClientRect();
  const seat = seatAt(((ev.clientX - rect.left) / rect.width) * SCENE_W, ((ev.clientY - rect.top) / rect.height) * SCENE_H);
  if (seat) select(seat);
});

$('start-btn').addEventListener('click', () => start(normalizeRoom($('room-input').value) || randomRoom()));
$('room-input').addEventListener('keydown', (ev) => { if (ev.key === 'Enter') $('start-btn').click(); });
$('how-btn').addEventListener('click', (ev) => {
  const how = $('how');
  how.hidden = !how.hidden;
  ev.currentTarget.setAttribute('aria-expanded', String(!how.hidden));
});
$('btn-retry').addEventListener('click', () => start(state.room));
$('btn-new').addEventListener('click', () => start(randomRoom()));
$('btn-copy').addEventListener('click', async (ev) => {
  const btn = ev.currentTarget;
  try { await navigator.clipboard.writeText(String(state.room)); btn.textContent = `복사됨 · ${state.room}`; }
  catch (e) { btn.textContent = `시험실 번호 ${state.room}`; }
});
$('btn-card').addEventListener('click', async () => {
  try { await document.fonts.load('20px "Galmuri11"'); await document.fonts.load('700 20px "Galmuri11"'); } catch (e) { /* 기본 글꼴로 그린다 */ }
  const canvas = renderCard(state);
  $('card-img').src = canvas.toDataURL('image/png');
  cardBlob = null;
  canvas.toBlob((b) => { cardBlob = b; });
  $('card-overlay').hidden = false;
});
$('btn-close-card').addEventListener('click', () => { $('card-overlay').hidden = true; });
$('btn-share').addEventListener('click', async (ev) => {
  const btn = ev.currentTarget;
  const text = `수능 감독관 ${state.result.grade}등급 · ${state.result.title}. 시험실 ${state.room}에서 붙어 보자.`;
  try {
    const file = cardBlob ? new File([cardBlob], `suneung-${state.room}.png`, { type: 'image/png' }) : null;
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text }); return; }
    if (navigator.share) { await navigator.share({ text }); return; }
    throw new Error('no share');
  } catch (e) {
    btn.textContent = '이미지를 길게 눌러 저장하세요';
  }
});

// ---------- 그리기 ----------
let lastDraw = 0;
function drawNow(t = performance.now()) {
  if (state && state.phase !== 'result') drawScene(sceneCtx, state, { t, selected, reduceMotion });
}
function frame(t) {
  if (state && !$('game').hidden && t - lastDraw > 90) { lastDraw = t; drawNow(t); }
  requestAnimationFrame(frame);
}

// ---------- 부팅 ----------
function boot(data) {
  if (data && data.state && data.state.v === 2) {
    state = data.state;
    selected = data.selected || null;
    dialogFrom = data.dialogFrom || 0;
    showScreen(state.phase === 'result' ? 'result' : 'game');
    render();
  } else {
    showScreen('title');
    const r = roomFromHash();
    if (r) $('room-input').value = String(r);
  }
  requestAnimationFrame(frame);
}

const hot = window.claude && window.claude.hot;
if (hot && hot.snapshot) hot.snapshot(() => ({ state, selected, dialogFrom }));
if (hot && hot.ready) hot.ready(boot);
else boot(hot && hot.data ? hot.data : {});
