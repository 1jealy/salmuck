// 게임 규칙. 화면과 분리된 순수 로직. 상태는 평범한 JSON 객체다.
// 관찰 결과는 글이 아니라 "그림 상태(view)"로 남긴다. pixel.js가 그것을 확대 그림으로 그린다.
import { SEATS, PERIODS, PRECHECK, BUDGET, SURNAMES, GIVEN_NAMES, SLIPS, SCHEMES, HABITS, PROTEST, AMBIENT, LOOKS } from './data.js';

// ---------- 난수 ----------
export function makeRng(seed) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    chance: (p) => next() < p,
    shuffle: (arr) => {
      const out = arr.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    },
  };
}

export function normalizeRoom(value) {
  const n = parseInt(String(value).replace(/\D/g, ''), 10);
  if (!Number.isFinite(n) || n < 1000 || n > 9999) return null;
  return n;
}

export function randomRoom() {
  return 1000 + Math.floor(Math.random() * 9000);
}

function rngFor(state, salt) {
  return makeRng((Math.imul(state.room, 2654435761) + state.actionIndex * 7919 + salt) >>> 0);
}

export function fill(text, n) {
  return text.split('{n}').join(String(n));
}

// ---------- 시각 ----------
export function formatTime([h, m]) {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function addMin([h, m], d) {
  const t = h * 60 + m + d;
  return [Math.floor(t / 60), t % 60];
}

export function clock(state) {
  const p = PERIODS[state.period];
  switch (state.phase) {
    case 'precheck': return addMin(PRECHECK.start, state.minutes);
    case 'exam': return addMin(p.start, (BUDGET.patrol - state.patrolLeft) * 20 + (BUDGET.idCheck - state.idLeft) * 2 + 5);
    case 'ending':
    case 'bell':
    case 'break': return p.end;
    default: return PERIODS[3].end;
  }
}

export function clockText(state) {
  return formatTime(clock(state));
}

// ---------- 생성 ----------
export function student(state, seat) {
  return state.students[seat - 1];
}

export function label(s) {
  return `${s.seat}번 ${s.name}`;
}

export function newGame(room) {
  const rng = makeRng(Math.imul(room, 7919) + 101);
  const given = rng.shuffle(GIVEN_NAMES);
  const students = SEATS.map((seat, i) => ({
    seat,
    name: rng.pick(SURNAMES) + given[i],
    look: {
      skin: rng.pick(LOOKS.skin),
      hair: rng.pick(LOOKS.hair),
      hairStyle: rng.pick(LOOKS.hairStyle),
      glasses: rng.chance(0.4),
      clothes: rng.pick(LOOKS.clothes),
    },
    mole: rng.chance(0.3),
    watch: rng.chance(0.35) ? 'analog' : null,
    slip: null,
    scheme: null,
    habit: null,
    checked: { id: false, clothes: false, glasses: false, pockets: false },
    sticker: false,
    slipState: null, // prevented | reported | excused
    schemeState: null, // caught | flagged
    flagged: false,
    mood: 'normal',
  }));

  // 계획형: 매 판 1명, 45% 확률로 2명. 실수형: 60% 확률로 1명.
  const order = rng.shuffle(SEATS);
  let cursor = 0;
  rng.shuffle(Object.keys(SCHEMES)).slice(0, rng.chance(0.45) ? 2 : 1).forEach((key) => {
    const s = students[order[cursor++] - 1];
    const sc = SCHEMES[key];
    s.scheme = key;
    if (sc.needsGlasses) s.look.glasses = true;
    if (sc.clothes) s.look.clothes = LOOKS.clothes.find((c) => c.kind === sc.clothes);
    if (sc.watch) s.watch = sc.watch;
    if (key === 'proxy') s.mole = false; // 사진에는 점이 있고 얼굴에는 없다
  });
  if (rng.chance(0.6)) {
    const s = students[order[cursor++] - 1];
    s.slip = rng.pick(Object.keys(SLIPS));
    if (s.slip === 'watch') s.watch = 'digital';
  }
  students.filter((s) => !s.scheme && !s.slip).forEach((s) => {
    if (!rng.chance(0.7)) return;
    const options = Object.keys(HABITS).filter((k) => !HABITS[k].needsGlasses || s.look.glasses);
    s.habit = rng.pick(options);
    if (HABITS[s.habit].watch) s.watch = HABITS[s.habit].watch;
  });

  // 교시별로 앞에서 보이는 장면
  const schedule = PERIODS.map(() => []);
  const bellAt = rng.int(0, 3);
  students.forEach((s) => {
    if (s.habit) {
      const h = HABITS[s.habit];
      let periods;
      if (h.period != null) periods = [h.period];
      else if (h.falls) periods = [rng.int(0, 3)];
      else periods = rng.shuffle([0, 1, 2, 3]).slice(0, rng.int(1, 2));
      periods.forEach((p) => schedule[p].push({ kind: h.falls ? 'sticker' : 'habit', seat: s.seat, text: fill(h.line, s.seat) }));
    }
    if (s.scheme) {
      const t = SCHEMES[s.scheme].tells;
      rng.shuffle(t.periods).slice(0, rng.int(t.count[0], t.count[1])).forEach((p) => {
        schedule[p].push({ kind: t.sticker ? 'sticker' : 'tell', seat: s.seat, text: fill(rng.pick(t.lines), s.seat) });
      });
      if (t.extra) schedule[t.extra.period].push({ kind: 'tell', seat: s.seat, text: fill(t.extra.text, s.seat) });
    }
  });
  PERIODS.forEach((_, p) => {
    if (rng.chance(0.5)) {
      const options = AMBIENT.filter((a) => a.period == null || a.period === p);
      schedule[p].push({ kind: 'ambient', seat: null, text: rng.pick(options).text });
    }
  });

  const state = {
    v: 3,
    room,
    phase: 'precheck',
    period: 0,
    minutes: 0,
    announced: false,
    alertDone: false,
    idLeft: 0,
    patrolLeft: BUDGET.patrol,
    afterLeft: BUDGET.afterCheck,
    complaints: 0,
    actionIndex: 0,
    students,
    schedule: schedule.map((list) => rng.shuffle(list)),
    bellAt,
    pending: null,
    log: [],
    result: null,
  };
  log(state, 'system', '08:10 입실 마감. 08:40까지 30분 동안 점검한다.');
  return state;
}

// ---------- 공통 ----------
function log(state, kind, text, seat = null, view = null) {
  const entry = { time: clockText(state), kind, text, seat };
  if (view) entry.view = view;
  state.log.push(entry);
  return entry;
}

function busy(state) {
  return state.pending != null || state.phase === 'result';
}

function schemeActive(s, period, phase) {
  if (!s.scheme || phase === 'precheck') return false;
  if (s.scheme === 'aiGlasses') return period > SCHEMES.aiGlasses.swapAfter;
  return true;
}

function eventNow(state, s) {
  if (state.phase !== 'exam') return null;
  return state.schedule[state.period].find((e) => e.seat === s.seat && e.kind !== 'ambient') || null;
}

// 지금 이 수험생을 가까이 봤을 때의 그림 상태
// mode: { id: 수험표 사진, sleeves: 소매 걷음, glassesOff: 안경 벗김, pockets: 소지품 꺼냄 }
export function makeView(state, s, rng, mode = {}) {
  const active = schemeActive(s, state.period, state.phase);
  const sc = s.scheme ? SCHEMES[s.scheme] : null;
  const h = s.habit ? HABITS[s.habit] : null;
  const ev = eventNow(state, s);
  const slip = s.slip && !s.slipState ? SLIPS[s.slip] : null;
  const [ch, cm] = clock(state);

  let pose = 'desk';
  if (ev && rng.chance(0.75)) pose = (sc && sc.pose) || (h && h.pose) || 'desk';
  else if (active && sc.pose !== 'none' && rng.chance(0.35)) pose = sc.pose;
  if (pose === 'none') pose = 'desk';

  let watch = null;
  if (s.watch === 'digital') watch = { type: 'digital' };
  else if (s.watch === 'analog' || s.watch === 'hybrid') {
    let wh = ch;
    let wm = cm;
    if (s.watch === 'hybrid' && active && rng.chance(0.65)) {
      wh = rng.int(1, 12);
      wm = rng.pick([0, 15, 30, 45]);
    }
    watch = { type: 'analog', h: wh, m: wm };
  }

  let sticker = s.sticker ? 'on' : 'none';
  if (s.sticker && ((ev && ev.kind === 'sticker') || (s.scheme === 'buttonCam' && active && rng.chance(0.4)))) sticker = 'missing';
  if (sticker === 'on' && h && h.peeled) sticker = 'peeled';

  const usingAnswers = active && sc.blank > 0 && rng.chance(sc.blank);
  const progress = state.phase === 'precheck' ? 0 : Math.min(1, (BUDGET.patrol - state.patrolLeft + 1) / (BUDGET.patrol + 1));

  return {
    seat: s.seat,
    time: [ch, cm],
    look: s.look,
    mood: s.mood,
    pose,
    faceMole: s.mole,
    glasses: s.look.glasses
      ? { thick: s.scheme === 'aiGlasses' && active, glint: s.scheme === 'aiGlasses' && active && rng.chance(0.6), off: !!mode.glassesOff }
      : null,
    sticker,
    bigButton: s.scheme === 'buttonCam',
    sleeves: !!mode.sleeves,
    watch,
    earBlob: s.scheme === 'earpiece' && active && rng.chance(0.55),
    waist: s.scheme === 'vibration' && (active || !!mode.sleeves) && rng.chance(0.6),
    buzz: s.scheme === 'vibration' && active && rng.chance(0.4),
    pocketBulge: slip && slip.pocket ? (s.slip === 'earbuds' ? 'small' : 'phone') : null,
    fakePen: s.scheme === 'penCam' && state.phase !== 'precheck',
    paper: state.phase === 'precheck' ? 'none' : usingAnswers || (h && h.blank) ? 'blank' : 'scribbled',
    omr: progress,
    idPhoto: mode.id ? { mole: s.scheme === 'proxy' ? true : s.mole } : null,
    pockets: mode.pockets ? (slip && slip.pocket ? [s.slip === 'earbuds' ? 'earbuds' : 'phone'] : []) : null,
  };
}

function askSlip(state, s, text, view = null) {
  const rng = rngFor(state, 9);
  state.pending = { seat: s.seat, text, reaction: rng.pick(SLIPS[s.slip].reaction) };
  s.mood = 'nervous';
  log(state, 'found', text, s.seat, view);
}

export function resolvePending(state, choice) {
  const p = state.pending;
  if (!p) return;
  const s = student(state, p.seat);
  if (choice === 'report') {
    s.slipState = 'reported';
    s.mood = 'crying';
    log(state, 'decision', `부정행위로 처리했다. "${p.reaction}"`, s.seat);
  } else {
    s.slipState = 'excused';
    s.mood = 'normal';
    log(state, 'decision', `주의만 주고 넘어갔다. "${p.reaction}"`, s.seat);
  }
  if (s.slip === 'watch') s.watch = null;
  state.pending = null;
  state.actionIndex += 1;
  continueAfterPending(state);
}

export function toggleFlag(state, seat) {
  if (state.phase === 'result') return;
  const s = student(state, seat);
  s.flagged = !s.flagged;
}

// ---------- 입실 점검 (08:10~08:40) ----------
export function canPrecheck(state, kind, seat) {
  if (state.phase !== 'precheck' || busy(state)) return false;
  if (state.minutes + PRECHECK.cost[kind] > PRECHECK.minutes) return false;
  if (kind === 'announce') return !state.announced;
  const s = student(state, seat);
  if (!s) return false;
  if (kind === 'glasses' && !s.look.glasses) return false;
  return !s.checked[kind];
}

const PRECHECK_CAPTION = { id: '사진 대조', clothes: '소매 걷기 · 단추 스티커', glasses: '안경 벗겨 보기', pockets: '소지품 꺼내 보기' };

export function precheck(state, kind, seat) {
  if (!canPrecheck(state, kind, seat)) return false;
  const rng = rngFor(state, 1);
  state.minutes += PRECHECK.cost[kind];
  state.actionIndex += 1;

  if (kind === 'announce') {
    state.announced = true;
    log(state, 'action', '"전자기기는 지금 내면 문제없습니다." 다시 안내했다.');
    state.students.forEach((s) => {
      if (s.slip && (SLIPS[s.slip].pocket || SLIPS[s.slip].sleeve) && !s.slipState && rng.chance(0.5)) {
        s.slipState = 'prevented';
        if (s.slip === 'watch') s.watch = null;
        log(state, 'prevent', `${s.seat}번이 머뭇거리다 전자기기를 냈다.`, s.seat);
      }
    });
  } else {
    const s = student(state, seat);
    s.checked[kind] = true;
    if (kind === 'clothes') s.sticker = true;
    const view = makeView(state, s, rng, { id: kind === 'id', sleeves: kind === 'clothes', glassesOff: kind === 'glasses', pockets: kind === 'pockets' });
    log(state, 'view', PRECHECK_CAPTION[kind], seat, view);
    const slip = s.slip && !s.slipState ? SLIPS[s.slip] : null;
    if (slip && ((kind === 'clothes' && slip.sleeve) || (kind === 'pockets' && slip.pocket))) {
      s.slipState = 'prevented';
      if (s.slip === 'watch') s.watch = null;
      log(state, 'prevent', `${slip.find} 시험 전이라 제출받았다.`, seat);
    }
  }
  maybeAlert(state);
  return true;
}

function maybeAlert(state) {
  if (state.alertDone || state.minutes < PRECHECK.alertAt) return;
  state.alertDone = true;
  const saved = state.minutes;
  state.minutes = PRECHECK.alertAt;
  log(state, 'alert', '08:25 위급재난문자 발송');
  const ringers = state.students.filter((s) => s.slip && SLIPS[s.slip].ring && !s.slipState);
  if (ringers.length) {
    ringers.forEach((s) => {
      s.slipState = 'prevented';
      s.mood = 'nervous';
      log(state, 'prevent', `${s.seat}번 외투에서 알림음! 휴대폰을 제출받았다.`, s.seat);
    });
  } else {
    log(state, 'system', '교실은 조용하다.');
  }
  state.minutes = saved;
}

export function finishPrecheck(state) {
  if (state.phase !== 'precheck' || busy(state)) return;
  state.minutes = PRECHECK.minutes;
  maybeAlert(state);
  const rest = state.students.filter((s) => !s.checked.clothes);
  rest.forEach((s) => { s.sticker = true; });
  if (rest.length) log(state, 'system', `부감독관이 나머지 ${rest.length}명에게 스티커만 붙였다.`);
  state.actionIndex += 1;
  startExam(state);
}

// ---------- 교시 ----------
function startExam(state) {
  const p = PERIODS[state.period];
  state.phase = 'exam';
  state.patrolLeft = BUDGET.patrol;
  state.idLeft = state.period > 0 ? BUDGET.idCheck : 0;
  log(state, 'period', `${p.label} ${p.subject}${state.period === 2 ? ' · 소지품 재점검' : ''}`);
  state.schedule[state.period].forEach((ev) => log(state, ev.kind === 'ambient' ? 'ambient' : 'event', ev.text, ev.seat));
}

export function canIdCheck(state, seat) {
  return state.phase === 'exam' && !busy(state) && state.idLeft > 0 && !!student(state, seat);
}

export function idCheck(state, seat) {
  if (!canIdCheck(state, seat)) return false;
  const s = student(state, seat);
  const rng = rngFor(state, 2);
  const p = state.period;
  state.idLeft -= 1;
  state.actionIndex += 1;
  const view = makeView(state, s, rng, { id: true, sleeves: p <= 2, pockets: p === 2 });
  const slip = s.slip && !s.slipState ? SLIPS[s.slip] : null;
  if (slip && ((slip.sleeve && p <= 2) || (slip.pocket && p === 2))) {
    askSlip(state, s, `본인 확인 중 발견: ${slip.find}`, view);
    return true;
  }
  log(state, 'view', `본인 확인${p <= 2 ? ' · 소매' : ''}${p === 2 ? ' · 소지품' : ''}`, seat, view);
  return true;
}

export function canPatrol(state, seat) {
  return state.phase === 'exam' && !busy(state) && state.patrolLeft > 0 && !!student(state, seat);
}

export function patrol(state, seat) {
  if (!canPatrol(state, seat)) return false;
  const s = student(state, seat);
  const rng = rngFor(state, 3);
  state.patrolLeft -= 1;
  state.actionIndex += 1;
  const view = makeView(state, s, rng);
  if (s.slip === 'watch' && !s.slipState) {
    askSlip(state, s, '손목에 숫자 화면이 있는 전자시계.', view);
    return true;
  }
  log(state, 'view', '가까이 봄', seat, view);
  return true;
}

export function endExam(state) {
  if (state.phase !== 'exam' || busy(state)) return;
  state.actionIndex += 1;
  state.patrolLeft = 0;
  state.idLeft = 0;
  const s4 = state.students.find((s) => s.slip === 'section4' && !s.slipState);
  if (state.period === 3 && s4) {
    state.phase = 'ending';
    askSlip(state, s4, fill(SLIPS.section4.event, s4.seat));
    return;
  }
  ringBell(state);
}

function ringBell(state) {
  const bell = state.students.find((s) => s.slip === 'bell' && !s.slipState);
  if (bell && state.bellAt === state.period) {
    state.phase = 'bell';
    askSlip(state, bell, fill(SLIPS.bell.event, bell.seat));
    return;
  }
  toBreak(state);
}

export function continueAfterPending(state) {
  if (state.pending) return;
  if (state.phase === 'ending') ringBell(state);
  else if (state.phase === 'bell') toBreak(state);
}

export function suspects(state) {
  return state.students.filter((s) => s.flagged && s.schemeState !== 'caught' && s.slipState !== 'reported');
}

function toBreak(state) {
  const p = PERIODS[state.period];
  state.afterLeft = BUDGET.afterCheck;
  state.phase = 'break';
  log(state, 'system', `${p.label} 종료${state.period === 1 ? ' · 점심시간' : ''}`);
  state.students.forEach((s) => { if (s.mood === 'nervous') s.mood = 'normal'; });
  // 의심 표시한 수험생이 있을 때만 쉬는 시간 점검 단계를 연다.
  if (!suspects(state).length) advance(state);
}

export function canAfterCheck(state, seat) {
  return state.phase === 'break' && !busy(state) && state.afterLeft > 0 && !!student(state, seat);
}

// 쉬는 시간 정밀 점검: 시험본부 금속탐지기
export function afterCheck(state, seat) {
  if (!canAfterCheck(state, seat)) return false;
  const s = student(state, seat);
  const rng = rngFor(state, 4);
  state.afterLeft -= 1;
  state.actionIndex += 1;

  if (s.scheme && schemeActive(s, state.period, state.phase) && rng.chance(SCHEMES[s.scheme].detect)) {
    s.schemeState = 'caught';
    s.mood = 'shocked';
    log(state, 'caught', `${SCHEMES[s.scheme].found} ${SCHEMES[s.scheme].caught}`, seat);
    return true;
  }
  const slip = s.slip && !s.slipState ? SLIPS[s.slip] : null;
  if (slip && (slip.pocket || slip.sleeve)) {
    askSlip(state, s, slip.find);
    return true;
  }
  state.complaints += 1;
  if (s.scheme) {
    const sc = SCHEMES[s.scheme];
    s.mood = 'calm';
    const miss = schemeActive(s, state.period, state.phase) && sc.missText ? sc.missText : '아무것도 나오지 않았다.';
    log(state, 'clean', `${miss} "${rng.pick(sc.calm)}" 민원 1건.`, seat);
  } else {
    s.mood = 'angry';
    log(state, 'clean', `아무것도 나오지 않았다. "${rng.pick(PROTEST)}" 민원 1건.`, seat);
  }
  return true;
}

export function nextPeriod(state) {
  if (state.phase !== 'break' || busy(state)) return;
  advance(state);
}

function advance(state) {
  state.actionIndex += 1;
  if (state.period < PERIODS.length - 1) {
    state.period += 1;
    startExam(state);
  } else if (suspects(state).length) {
    state.phase = 'report';
    log(state, 'system', '시험 끝. 의심 표시한 수험생은 사후 조사를 요청할 수 있다.');
  } else {
    state.phase = 'report';
    submitReport(state);
  }
}

// ---------- 채점 ----------
export function submitReport(state) {
  if (state.phase !== 'report') return null;
  let score = 100;
  const tally = { prevented: 0, reported: 0, excused: 0, missedSlip: 0, falseFlags: 0 };
  const schemes = [];
  state.students.forEach((s) => {
    if (s.slip) {
      if (s.slipState === 'prevented') tally.prevented += 1;
      else if (s.slipState === 'reported') tally.reported += 1;
      else if (s.slipState === 'excused') { tally.excused += 1; score -= 15; }
      else { tally.missedSlip += 1; score -= 10; }
    }
    if (s.scheme) {
      if (s.schemeState !== 'caught' && s.flagged) s.schemeState = 'flagged';
      schemes.push({ seat: s.seat, key: s.scheme, state: s.schemeState || 'missed' });
      if (s.schemeState === 'flagged') score -= 15;
      if (!s.schemeState) score -= 35;
    } else if (s.flagged && !s.slip) {
      tally.falseFlags += 1;
      score -= 10;
    }
  });
  score -= state.complaints * 5;
  score = Math.max(0, Math.min(100, score));
  const grade = score >= 90 ? 1 : score >= 80 ? 2 : score >= 70 ? 3 : score >= 60 ? 4 : score >= 50 ? 5 : score >= 40 ? 6 : score >= 30 ? 7 : score >= 20 ? 8 : 9;

  const caught = schemes.filter((x) => x.state === 'caught').length;
  const missed = schemes.filter((x) => x.state === 'missed').length;
  let title;
  if (caught === schemes.length) title = grade <= 2 ? '2년의 준비를 무너뜨린 감독관' : '잡긴 다 잡은 감독관';
  else if (missed === schemes.length) title = '아무 일 없던 시험실… 이었을까?';
  else if (state.complaints + tally.falseFlags >= 4) title = '민원 폭탄 감독관';
  else if (caught > 0) title = '절반만 막은 감독관';
  else title = '촉은 맞았던 감독관';

  state.result = { score, grade, title, schemes, ...tally, complaints: state.complaints };
  state.phase = 'result';
  return state.result;
}

export function truth(s) {
  if (s.scheme) return { tag: '계획형', name: SCHEMES[s.scheme].name, text: SCHEMES[s.scheme].reveal };
  if (s.slip) return { tag: '실수형', name: SLIPS[s.slip].name, text: SLIPS[s.slip].reveal };
  return { tag: '무고', name: '', text: s.habit ? '수상해 보인 행동은 그냥 습관이었다.' : '아무 문제 없이 시험을 봤다.' };
}

export function outcome(s) {
  if (s.scheme) return { caught: '적발', flagged: '사후 조사로 적발', missed: '놓침' }[s.schemeState || 'missed'];
  if (s.slip) return { prevented: '시험 전 예방', reported: '부정행위 처리', excused: '봐줌' }[s.slipState] || '놓침';
  return s.flagged ? '잘못 의심' : '';
}

// 수험생별 확대 그림 기록(수첩)
export function snapshots(state, seat) {
  return state.log.filter((e) => e.seat === seat && e.view);
}
