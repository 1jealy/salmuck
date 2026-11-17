// 화면 연결: 버튼, 캔버스, 일지, 결과
import { PERIODS } from './data.js';
import { newGame, observe, talk, inspect, endPeriod, toggleAccuse, submitReport, truth, student, label, normalizeRoom, randomRoom, ACTIONS_PER_PERIOD } from './game.js';
import { drawScene, seatAt, SCENE_W, SCENE_H } from './pixel.js';
import { renderCard } from './card.js';

const $ = (id) => document.getElementById(id);
const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let state = null;
let selected = null;
let seenLog = 0;
let cardBlob = null;

const ctx = $('scene').getContext('2d');

function roomFromHash() {
  const m = /room-(\d{4})/.exec(location.hash || '');
  return m ? normalizeRoom(m[1]) : null;
}

function setHash(room) {
  try { history.replaceState(null, '', `#room-${room}`); } catch (e) { location.hash = `room-${room}`; }
}

function start(room) {
  state = newGame(room);
  selected = null;
  seenLog = 0;
  setHash(room);
  $('title').hidden = true;
  $('game').hidden = false;
  render();
  window.scrollTo(0, 0);
}

function showTitle() {
  $('title').hidden = false;
  $('game').hidden = true;
  const r = roomFromHash();
  if (r) $('room-input').value = String(r);
}

// ---------- 렌더링 ----------

function render() {
  if (!state) return;
  const p = PERIODS[state.period];
  $('st-room').textContent = state.room;
  $('st-period').textContent = state.phase === 'play' ? `${p.label} ${p.subject}` : state.phase === 'accuse' ? '감독 보고서' : '결과';
  const pips = $('st-actions');
  pips.innerHTML = '';
  for (let i = 0; i < ACTIONS_PER_PERIOD; i++) {
    const d = document.createElement('span');
    d.className = 'pip' + (i < state.actionsLeft ? ' on' : '');
    pips.appendChild(d);
  }
  pips.setAttribute('aria-label', `남은 행동 ${state.actionsLeft}번`);
  $('st-inspect').textContent = `${state.inspectLeft}회`;
  const comp = $('st-complaints');
  comp.textContent = `${state.complaints}건`;
  comp.classList.toggle('warn', state.complaints >= 4);

  renderSeats();
  $('play-panel').hidden = state.phase !== 'play';
  $('accuse-panel').hidden = state.phase !== 'accuse';
  $('result-panel').hidden = state.phase !== 'result';
  if (state.phase === 'play') renderPlay();
  if (state.phase === 'accuse') renderAccuse();
  if (state.phase === 'result') renderResult();
  renderLog();
}

function renderSeats() {
  const row = $('seat-row');
  row.innerHTML = '';
  state.students.forEach((s) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'seat';
    const pressed = state.phase === 'play' ? selected === s.seat : state.accused.includes(s.seat);
    b.setAttribute('aria-pressed', String(pressed));
    if (state.phase === 'result' && s.guilty) b.classList.add('guilty');
    b.innerHTML = `<span class="bubble">${s.seat}</span><span class="nm">${s.name}</span>`;
    b.setAttribute('aria-label', `${label(s)}${state.phase === 'accuse' ? ' 지목' : ' 선택'}`);
    b.disabled = state.phase === 'result';
    b.addEventListener('click', () => onSeat(s.seat));
    row.appendChild(b);
  });
}

function renderPlay() {
  const info = $('sel-info');
  if (selected) {
    const s = student(state, selected);
    const last = [...state.log].reverse().find((e) => e.seats && e.seats.length === 1 && e.seats[0] === selected && e.kind !== 'event');
    info.innerHTML = `<span class="who">${label(s)}</span>` + (last ? `<br>${escapeHtml(last.kind === 'talk' ? `“${last.text}”` : last.text)}` : '<br>무엇을 할까?');
  } else {
    info.textContent = '위 그림이나 번호를 눌러 수험생을 고르세요.';
  }
  const can = selected && state.actionsLeft > 0;
  $('btn-observe').disabled = !can;
  $('btn-talk').disabled = !can;
  $('btn-inspect').disabled = !can || state.inspectLeft < 1;
  const p = PERIODS[state.period];
  const next = $('btn-next');
  next.textContent = state.period < PERIODS.length - 1 ? `${p.label} 종료 · 답안지 걷기` : '4교시 종료 · 보고서 쓰기';
  next.classList.toggle('ready', state.actionsLeft === 0);
}

function renderAccuse() {
  const n = state.accused.length;
  $('btn-submit').textContent = n ? `${state.accused.join(', ')}번 부정행위로 보고` : '이상 없음으로 보고';
}

function renderResult() {
  const r = state.result;
  $('r-grade').textContent = r.grade;
  $('r-title').textContent = r.title;
  $('r-stats').textContent = r.total === 0
    ? `부정행위자 없음 · 잘못 지목 ${r.falseCount}명 · 민원 ${state.complaints}건`
    : `적발 ${r.caught}/${r.total} · 잘못 지목 ${r.falseCount}명 · 민원 ${state.complaints}건`;
  const list = $('r-truth');
  list.innerHTML = '';
  state.students.forEach((s) => {
    const t = truth(s);
    const accused = state.accused.includes(s.seat);
    const li = document.createElement('li');
    li.className = t.guilty ? 'guilty' : 'innocent';
    const verdict = t.guilty ? (accused ? '적발' : '놓침') : accused ? '잘못 지목' : '무고';
    li.innerHTML = `<span class="no">${s.seat}</span><div><b>${s.name}</b><span class="verdict">${verdict}</span><p>${escapeHtml(t.text)}</p></div>`;
    list.appendChild(li);
  });
  const q = $('r-quote');
  if (r.quote) {
    q.innerHTML = `“${escapeHtml(r.quote.text)}”<figcaption>오늘의 명대사 · ${escapeHtml(label(student(state, r.quote.seat)))} 수험생</figcaption>`;
  } else {
    q.innerHTML = '“……”<figcaption>오늘은 아무와도 말하지 않았다</figcaption>';
  }
  $('r-room').textContent = state.room;
}

function renderLog() {
  const ol = $('log');
  ol.innerHTML = '';
  const entries = state.log.map((e, i) => ({ ...e, i })).reverse();
  entries.forEach((e) => {
    const li = document.createElement('li');
    li.className = e.kind + (e.i >= seenLog ? ' fresh' : '');
    const s = e.seats && e.seats.length === 1 ? student(state, e.seats[0]) : null;
    if (e.kind === 'observe') li.innerHTML = `<span class="act">관찰</span><span class="who">${label(s)}</span>${escapeHtml(e.text)}`;
    else if (e.kind === 'talk') li.innerHTML = `<span class="act">질문</span><span class="who">${label(s)}</span><span class="line">“${escapeHtml(e.text)}”</span>`;
    else if (e.kind === 'inspect') li.innerHTML = `<span class="act">소지품 검사</span><span class="who">${label(s)}</span>${escapeHtml(e.text)}`;
    else li.textContent = e.text;
    ol.appendChild(li);
  });
  seenLog = state.log.length;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

// ---------- 입력 ----------

function onSeat(seat) {
  if (!state) return;
  if (state.phase === 'play') selected = selected === seat ? null : seat;
  else if (state.phase === 'accuse') toggleAccuse(state, seat);
  render();
}

$('scene').addEventListener('click', (ev) => {
  const rect = ev.currentTarget.getBoundingClientRect();
  const x = ((ev.clientX - rect.left) / rect.width) * SCENE_W;
  const y = ((ev.clientY - rect.top) / rect.height) * SCENE_H;
  const seat = seatAt(x, y);
  if (seat) onSeat(seat);
});

$('start-btn').addEventListener('click', () => {
  const typed = normalizeRoom($('room-input').value);
  start(typed || randomRoom());
});
$('room-input').addEventListener('keydown', (ev) => { if (ev.key === 'Enter') $('start-btn').click(); });

$('btn-observe').addEventListener('click', () => { if (selected) { observe(state, selected); render(); } });
$('btn-talk').addEventListener('click', () => { if (selected) { talk(state, selected); render(); } });
$('btn-inspect').addEventListener('click', () => { if (selected) { inspect(state, selected); render(); } });
$('btn-next').addEventListener('click', () => {
  endPeriod(state);
  selected = null;
  render();
  if (state.phase === 'accuse') $('accuse-panel').scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
});
$('btn-submit').addEventListener('click', () => {
  submitReport(state);
  render();
  $('result-panel').scrollIntoView({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' });
});
$('btn-retry').addEventListener('click', () => start(state.room));
$('btn-new').addEventListener('click', () => start(randomRoom()));

$('btn-copy').addEventListener('click', async (ev) => {
  const btn = ev.currentTarget;
  try {
    await navigator.clipboard.writeText(String(state.room));
    btn.textContent = '복사됨';
  } catch (e) {
    btn.textContent = `번호: ${state.room}`;
  }
});

$('btn-card').addEventListener('click', async () => {
  try { await document.fonts.ready; } catch (e) { /* 글꼴 없이도 그린다 */ }
  const canvas = renderCard(state);
  $('card-img').src = canvas.toDataURL('image/png');
  cardBlob = null;
  canvas.toBlob((b) => { cardBlob = b; });
  $('card-overlay').hidden = false;
});
$('btn-close-card').addEventListener('click', () => { $('card-overlay').hidden = true; });
$('btn-share').addEventListener('click', async (ev) => {
  const btn = ev.currentTarget;
  const text = `수능 감독관 ${state.result.grade}등급 · ${state.result.title}. 시험실 ${state.room}에서 대결하자.`;
  try {
    const file = cardBlob ? new File([cardBlob], `suneung-${state.room}.png`, { type: 'image/png' }) : null;
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], text });
      return;
    }
    if (navigator.share) { await navigator.share({ text }); return; }
    throw new Error('share unavailable');
  } catch (e) {
    btn.textContent = '이미지를 길게 눌러 저장하세요';
  }
});

// ---------- 애니메이션 ----------

let lastDraw = 0;
function frame(t) {
  if (state && !$('game').hidden && t - lastDraw > 80) {
    lastDraw = t;
    drawScene(ctx, state, { t, selected: state.phase === 'play' ? selected : null, reduceMotion });
  }
  requestAnimationFrame(frame);
}

// ---------- 시작 ----------

function boot(data) {
  if (data && data.state && data.state.v === 1) {
    state = data.state;
    selected = data.selected || null;
    seenLog = state.log.length;
    $('title').hidden = true;
    $('game').hidden = false;
    render();
  } else {
    showTitle();
  }
  requestAnimationFrame(frame);
}

const hot = window.claude && window.claude.hot;
if (hot && hot.snapshot) hot.snapshot(() => ({ state, selected }));
if (hot && hot.ready) hot.ready(boot);
else boot(hot && hot.data ? hot.data : {});

