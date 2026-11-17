// 화면 연결: 교실 그림 → 확대 그림 → 행동 → 수첩(스냅숏 앨범)
import { PERIODS, PRECHECK } from './data.js';
import { newGame, precheck, canPrecheck, finishPrecheck, idCheck, canIdCheck, suspects, patrol, canPatrol, endExam, afterCheck, canAfterCheck, nextPeriod, resolvePending, toggleFlag, submitReport, truth, outcome, student, label, clockText, snapshots, normalizeRoom, randomRoom } from './game.js';
import { drawScene, seatAt, SCENE_W, SCENE_H } from './pixel.js';
import { drawCloseup, CLOSE_W, CLOSE_H } from './closeup.js';
import { renderCard } from './card.js';

const $ = (id) => document.getElementById(id);
const reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
const sceneCtx = $('scene').getContext('2d');
const closeCtx = $('closeup').getContext('2d');

let state = null;
let selected = null;
let viewing = null; // 지금 확대 창에 띄운 log 번호
let caption = null; // 확대 창 아래 한 줄 { text, kind }
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
  viewing = null;
  caption = null;
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
    case 'exam': return `${p.label} ${p.subject}`;
    case 'ending': case 'bell': case 'break': return `${p.label} 종료`;
    case 'report': return '감독 보고서';
    default: return '';
  }
}

function budgetText() {
  switch (state.phase) {
    case 'precheck': return `남은 ${PRECHECK.minutes - state.minutes}분`;
    case 'exam': return state.period > 0 ? `확인 ${state.idLeft} · 보기 ${state.patrolLeft}` : `보기 ${state.patrolLeft}`;
    case 'break': return '쉬는 시간';
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
  renderViewer();
  renderActions();
  renderAlbum();
  renderTicker();
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

function renderViewer() {
  const s = selected ? student(state, selected) : null;
  const entry = viewing != null ? state.log[viewing] : null;
  $('v-title').textContent = s ? label(s) : '수험생을 고르세요';
  $('v-time').textContent = entry ? `${entry.time} · ${entry.text}` : s ? '아직 가까이 보지 않았다' : '';
  // 도트가 고르게 보이도록 정수 배율로 키운다.
  const cv = $('closeup');
  const avail = cv.parentElement.clientWidth - 24;
  if (avail > 0) cv.style.width = `${CLOSE_W * Math.max(1, Math.floor(avail / CLOSE_W))}px`;
  closeCtx.fillStyle = '#000';
  closeCtx.fillRect(0, 0, CLOSE_W, CLOSE_H);
  if (entry && entry.view) drawCloseup(closeCtx, entry.view);
  else drawPlaceholder();
  const cap = $('v-caption');
  cap.textContent = caption ? caption.text : '';
  cap.className = `v-caption${caption ? ` k-${caption.kind}` : ''}`;
}

function drawPlaceholder() {
  closeCtx.fillStyle = '#0d1015';
  closeCtx.fillRect(0, 0, CLOSE_W, CLOSE_H);
  closeCtx.fillStyle = '#2c333e';
  closeCtx.fillRect(60, 18, 40, 44);
  closeCtx.fillRect(42, 64, 76, 34);
  closeCtx.fillRect(0, 96, CLOSE_W, 24);
}

function btn(box, text, sub, onClick, opts = {}) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'act' + (opts.cls ? ` ${opts.cls}` : '');
  b.innerHTML = `<span>${esc(text)}</span>${sub ? `<small>${esc(sub)}</small>` : ''}`;
  b.disabled = !!opts.disabled;
  if (opts.pressed != null) b.setAttribute('aria-pressed', String(opts.pressed));
  b.addEventListener('click', onClick);
  box.appendChild(b);
}

function renderActions() {
  const box = $('actions');
  box.innerHTML = '';
  if (state.pending) {
    btn(box, '부정행위로 처리', '답안지 회수', () => act(() => resolvePending(state, 'report')), { cls: 'danger' });
    btn(box, '봐주기', '주의만 준다', () => act(() => resolvePending(state, 'excuse')));
    return;
  }
  const s = selected ? student(state, selected) : null;
  const flag = () => {
    if (s) btn(box, s.flagged ? '의심 지우기' : '의심 표시', '무료', () => { toggleFlag(state, s.seat); render(); }, { cls: 'flag', pressed: s.flagged });
  };
  const cost = (k) => (s && s.checked[k] ? '완료' : `${PRECHECK.cost[k]}분`);

  if (state.phase === 'precheck') {
    if (s) {
      btn(box, '사진 대조', cost('id'), () => act(() => precheck(state, 'id', s.seat)), { disabled: !canPrecheck(state, 'id', s.seat) });
      btn(box, '소매·단추', cost('clothes'), () => act(() => precheck(state, 'clothes', s.seat)), { disabled: !canPrecheck(state, 'clothes', s.seat) });
      if (s.look.glasses) btn(box, '안경 벗겨 보기', cost('glasses'), () => act(() => precheck(state, 'glasses', s.seat)), { disabled: !canPrecheck(state, 'glasses', s.seat) });
      btn(box, '소지품 보기', cost('pockets'), () => act(() => precheck(state, 'pockets', s.seat)), { disabled: !canPrecheck(state, 'pockets', s.seat) });
      flag();
    }
    btn(box, '전자기기 안내', state.announced ? '완료' : '1분 · 교실 전체', () => act(() => precheck(state, 'announce')), { disabled: !canPrecheck(state, 'announce') });
    btn(box, '1교시 시작', '', () => act(() => finishPrecheck(state)), { cls: 'main' });
  } else if (state.phase === 'exam') {
    if (s) {
      btn(box, '가까이 보기', `${state.patrolLeft}회 남음`, () => act(() => patrol(state, s.seat)), { disabled: !canPatrol(state, s.seat) });
      if (state.period > 0) btn(box, '본인 확인', `${state.idLeft}회 · 사진${state.period <= 2 ? '·소매' : ''}${state.period === 2 ? '·소지품' : ''}`, () => act(() => idCheck(state, s.seat)), { disabled: !canIdCheck(state, s.seat) });
      flag();
    }
    btn(box, `${PERIODS[state.period].label} 끝내기`, '', () => act(() => endExam(state)), { cls: 'main' });
  } else if (state.phase === 'break') {
    suspects(state).forEach((x) => {
      btn(box, `${x.seat}번 정밀 점검`, '금속탐지기 · 쉬는 시간 1명', () => { selected = x.seat; act(() => afterCheck(state, x.seat)); }, { disabled: !canAfterCheck(state, x.seat) });
    });
    const last = state.period === PERIODS.length - 1;
    btn(box, last ? '보고서로' : `${PERIODS[state.period + 1].label}로`, '', () => act(() => nextPeriod(state)), { cls: 'main' });
  } else if (state.phase === 'report') {
    flag();
    btn(box, '보고서 제출', `사후 조사: ${suspects(state).map((x) => `${x.seat}번`).join(', ') || '없음'}`, () => act(() => submitReport(state)), { cls: 'main' });
  }
}

function renderAlbum() {
  const box = $('album-box');
  const shots = selected ? snapshots(state, selected) : [];
  box.hidden = !shots.length;
  const album = $('album');
  album.innerHTML = '';
  shots.forEach((e) => {
    const idx = state.log.indexOf(e);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'shot';
    b.setAttribute('aria-current', String(idx === viewing));
    b.setAttribute('aria-label', `${e.time} ${e.text}`);
    const c = document.createElement('canvas');
    c.width = CLOSE_W;
    c.height = CLOSE_H;
    drawCloseup(c.getContext('2d'), e.view);
    const t = document.createElement('span');
    t.textContent = e.time;
    b.append(c, t);
    b.addEventListener('click', () => { viewing = idx; caption = null; render(); });
    album.appendChild(b);
  });
}

// 이번 교시에 앞에서 보인 것 (짧은 글)
function renderTicker() {
  let from = 0;
  state.log.forEach((e, i) => { if (e.kind === 'period') from = i; });
  const items = state.log.slice(from).filter((e) => !e.view && e.kind !== 'decision');
  $('ticker').innerHTML = items.map((e) => `<li><span class="t">${e.time}</span><span class="k-${e.kind}">${esc(e.text)}</span></li>`).join('');
}

function renderResult() {
  showScreen('result');
  const r = state.result;
  $('r-room').textContent = state.room;
  $('r-grade').textContent = r.grade;
  $('r-title').textContent = r.title;
  $('r-stats').textContent = `점수 ${r.score} · 민원 ${r.complaints}`;
  const list = $('r-truth');
  list.innerHTML = '';
  state.students.forEach((s) => {
    const t = truth(s);
    if (!s.scheme && !s.slip && !s.flagged) return;
    const cls = s.scheme ? 'scheme' : s.slip ? 'slip' : 'clean';
    const out = outcome(s);
    const li = document.createElement('li');
    li.innerHTML = `<span class="no">${s.seat}번</span><div><span class="tag ${cls}">${t.tag}${t.name ? ` · ${esc(t.name)}` : ''}</span>${esc(s.name)}${out ? `<span class="out">${esc(out)}</span>` : ''}<p>${esc(t.text)}</p></div>`;
    const shots = snapshots(state, s.seat);
    if (shots.length) {
      const c = document.createElement('canvas');
      c.width = CLOSE_W;
      c.height = CLOSE_H;
      drawCloseup(c.getContext('2d'), shots[shots.length - 1].view);
      li.lastChild.appendChild(c);
    }
    list.appendChild(li);
  });
  drawScene($('result-scene').getContext('2d'), state, { t: 0, reduceMotion: true });
  window.scrollTo(0, 0);
}

function esc(str) {
  return String(str).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

// ---------- 입력 ----------
function select(seat) {
  selected = seat;
  const shots = snapshots(state, seat);
  viewing = shots.length ? state.log.indexOf(shots[shots.length - 1]) : null;
  caption = null;
  render();
}

// 행동 실행 후, 새로 생긴 기록 중 그림이 있으면 확대 창에 띄우고 결과 글은 한 줄로 보여 준다.
function act(fn) {
  const from = state.log.length;
  fn();
  const fresh = state.log.slice(from);
  const shot = fresh.map((e, i) => ({ e, i: from + i })).filter((x) => x.e.view).pop();
  if (shot) { viewing = shot.i; selected = shot.e.seat; }
  else if (selected) {
    const shots = snapshots(state, selected);
    viewing = shots.length ? state.log.indexOf(shots[shots.length - 1]) : null;
  }
  const important = fresh.filter((e) => ['found', 'caught', 'clean', 'prevent', 'decision'].includes(e.kind)).pop();
  caption = important ? { text: important.text, kind: important.kind } : null;
  if (state.pending) caption = { text: state.pending.text, kind: 'found' };
  render();
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
  const b = ev.currentTarget;
  try { await navigator.clipboard.writeText(String(state.room)); b.textContent = `복사됨 · ${state.room}`; }
  catch (e) { b.textContent = `시험실 번호 ${state.room}`; }
});
$('btn-card').addEventListener('click', async () => {
  try { await document.fonts.load('20px "Galmuri11"'); await document.fonts.load('700 20px "Galmuri11"'); } catch (e) { /* 기본 글꼴 */ }
  const canvas = renderCard(state);
  $('card-img').src = canvas.toDataURL('image/png');
  cardBlob = null;
  canvas.toBlob((b) => { cardBlob = b; });
  $('card-overlay').hidden = false;
});
$('btn-close-card').addEventListener('click', () => { $('card-overlay').hidden = true; });
$('btn-share').addEventListener('click', async (ev) => {
  const b = ev.currentTarget;
  const text = `수능 감독관 ${state.result.grade}등급 · ${state.result.title}. 시험실 ${state.room}에서 붙어 보자.`;
  try {
    const file = cardBlob ? new File([cardBlob], `suneung-${state.room}.png`, { type: 'image/png' }) : null;
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text }); return; }
    if (navigator.share) { await navigator.share({ text }); return; }
    throw new Error('no share');
  } catch (e) {
    b.textContent = '이미지를 길게 눌러 저장하세요';
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
  if (data && data.state && data.state.v === 3) {
    state = data.state;
    selected = data.selected || null;
    viewing = data.viewing != null ? data.viewing : null;
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
if (hot && hot.snapshot) hot.snapshot(() => ({ state, selected, viewing }));
if (hot && hot.ready) hot.ready(boot);
else boot(hot && hot.data ? hot.data : {});
