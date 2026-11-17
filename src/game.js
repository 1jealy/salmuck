// 게임 규칙. 화면과 분리된 순수 로직. 상태는 평범한 JSON 객체다.
import { SEATS, PERIODS, PRECHECK, BUDGET, SURNAMES, GIVEN_NAMES, SLIPS, SCHEMES, HABITS, NEUTRAL_PATROL, ID_OK, PROXY_ID_HINT, PROTEST, AMBIENT, LOOKS } from './data.js';

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
function fmt([h, m]) {
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
    case 'exam': return addMin(p.start, (BUDGET.patrol - state.patrolLeft) * 20 + 5);
    case 'ending':
    case 'bell':
    case 'break': return p.end;
    default: return PERIODS[3].end;
  }
}

export function clockText(state) {
  return fmt(clock(state));
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
    slip: null,
    scheme: null,
    habit: null,
    checked: { id: false, clothes: false, glasses: false, pockets: false },
    sticker: false,
    glassesSeenAM: false,
    slipState: null, // prevented | reported | excused
    schemeState: null, // caught | flagged
    habitSeen: false,
    flagged: false,
    mood: 'normal',
  }));

  // 계획형: 매 판 1명, 45% 확률로 2명. 실수형: 60% 확률로 1명.
  const seatsShuffled = rng.shuffle(SEATS);
  let cursor = 0;
  const schemeKeys = rng.shuffle(Object.keys(SCHEMES)).slice(0, rng.chance(0.45) ? 2 : 1);
  schemeKeys.forEach((key) => {
    const s = students[seatsShuffled[cursor++] - 1];
    s.scheme = key;
    if (SCHEMES[key].needsGlasses) s.look.glasses = true;
  });
  if (rng.chance(0.6)) students[seatsShuffled[cursor++] - 1].slip = rng.pick(Object.keys(SLIPS));
  // 무고한 습관: 나머지 중 70%
  const habitKeys = Object.keys(HABITS);
  students.filter((s) => !s.scheme && !s.slip).forEach((s) => {
    if (!rng.chance(0.7)) return;
    const options = habitKeys.filter((k) => !HABITS[k].needsGlasses || s.look.glasses);
    s.habit = rng.pick(options);
  });

  // 교시별로 앞에서 보이는 사건 배치
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
      const sc = SCHEMES[s.scheme];
      const t = sc.tells;
      rng.shuffle(t.periods).slice(0, rng.int(t.count[0], t.count[1])).forEach((p) => {
        schedule[p].push({ kind: 'tell', seat: s.seat, text: fill(rng.pick(t.lines), s.seat) });
      });
      if (t.extra) schedule[t.extra.period].push({ kind: 'tell', seat: s.seat, text: fill(t.extra.text, s.seat) });
      if (sc.stickerFalls) {
        rng.shuffle([0, 1, 2, 3]).slice(0, rng.int(2, 3)).forEach((p) => {
          schedule[p].push({ kind: 'sticker', seat: s.seat, text: `${s.seat}번 수험생의 단추 스티커가 떨어져 있다.` });
        });
      }
    }
  });
  PERIODS.forEach((_, p) => {
    if (rng.chance(0.6)) {
      const options = AMBIENT.filter((a) => a.period == null || a.period === p);
      schedule[p].push({ kind: 'ambient', seat: null, text: rng.pick(options).text });
    }
  });

  const state = {
    v: 2,
    room,
    phase: 'precheck',
    period: 0,
    minutes: 0,
    announced: false,
    alertDone: false,
    idLeft: BUDGET.idCheck,
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
  log(state, 'system', '08:10 입실 마감. 30분 안에 본인 확인과 점검을 마쳐야 한다. 끝내지 못한 수험생은 부감독관이 기본 점검(단추 스티커)만 한다.');
  return state;
}

// ---------- 공통 ----------
function log(state, kind, text, seat = null) {
  state.log.push({ time: clockText(state), kind, text, seat });
}

function busy(state) {
  return state.pending != null || state.phase === 'result';
}

function askSlip(state, s, text) {
  const rng = rngFor(state, 9);
  state.pending = { seat: s.seat, text, reaction: rng.pick(SLIPS[s.slip].reaction) };
  s.mood = 'nervous';
  log(state, 'found', text, s.seat);
}

export function resolvePending(state, choice) {
  const p = state.pending;
  if (!p) return;
  const s = student(state, p.seat);
  if (choice === 'report') {
    s.slipState = 'reported';
    s.mood = 'crying';
    log(state, 'decision', `부정행위로 처리했다. 답안지를 회수하고 시험본부에 보고했다. "${p.reaction}"`, s.seat);
  } else {
    s.slipState = 'excused';
    s.mood = 'normal';
    log(state, 'decision', `주의만 주고 넘어갔다. "${p.reaction}"`, s.seat);
  }
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
export function precheckCost(state, kind) {
  return PRECHECK.cost[kind];
}

export function canPrecheck(state, kind, seat) {
  if (state.phase !== 'precheck' || busy(state)) return false;
  if (state.minutes + PRECHECK.cost[kind] > PRECHECK.minutes) return false;
  if (kind === 'announce') return !state.announced;
  const s = student(state, seat);
  if (!s) return false;
  if (kind === 'glasses' && !s.look.glasses) return false;
  return !s.checked[kind];
}

export function precheck(state, kind, seat) {
  if (!canPrecheck(state, kind, seat)) return false;
  const rng = rngFor(state, 1);
  state.minutes += PRECHECK.cost[kind];
  state.actionIndex += 1;

  if (kind === 'announce') {
    state.announced = true;
    log(state, 'action', '"전자기기를 지금 내면 문제없습니다. 시험 시작 후에 나오면 부정행위입니다." 교실 전체에 다시 안내했다.');
    state.students.forEach((s) => {
      if (s.slip && (SLIPS[s.slip].pocket || SLIPS[s.slip].sleeve) && !s.slipState && rng.chance(0.5)) {
        s.slipState = 'prevented';
        log(state, 'prevent', `${s.seat}번 수험생이 머뭇거리다 ${SLIPS[s.slip].sleeve ? '손목에서 시계를 풀어' : '주머니에서 꺼내'} 제출한다.`, s.seat);
      }
    });
  } else {
    const s = student(state, seat);
    s.checked[kind] = true;
    if (kind === 'id') {
      const hint = s.scheme === 'proxy' && rng.chance(0.6);
      log(state, 'check', `본인 확인: ${hint ? rng.pick(PROXY_ID_HINT) : rng.pick(ID_OK)}`, seat);
    } else if (kind === 'clothes') {
      s.sticker = true;
      let text = '소매를 걷게 하고 옷깃과 단추를 확인했다. 단추마다 스티커를 붙였다.';
      if (s.slip && SLIPS[s.slip].sleeve && !s.slipState) {
        s.slipState = 'prevented';
        text += ' 손목에 전자시계가 있어 시험 전에 제출받았다.';
      }
      log(state, 'check', text + schemeHint(s, 'clothes', rng), seat);
    } else if (kind === 'glasses') {
      s.glassesSeenAM = true;
      log(state, 'check', '안경을 벗어 책상에 올리게 했다. 얇은 검은 테의 평범한 안경이다. 모양을 기억해 둔다.' + schemeHint(s, 'glasses', rng), seat);
    } else if (kind === 'pockets') {
      if (s.slip && SLIPS[s.slip].pocket && !s.slipState) {
        s.slipState = 'prevented';
        log(state, 'prevent', `${SLIPS[s.slip].find} 시험 전이라 제출받았다.`, seat);
      } else {
        log(state, 'check', '휴대 물품을 확인했다. 수험표, 신분증, 컴퓨터용 사인펜뿐이다.' + schemeHint(s, 'pockets', rng), seat);
      }
    }
  }
  maybeAlert(state);
  return true;
}

function schemeHint(s, kind, rng) {
  const h = s.scheme && SCHEMES[s.scheme].precheck && SCHEMES[s.scheme].precheck[kind];
  return h && rng.chance(h[0]) ? ` ${h[1]}` : '';
}

function maybeAlert(state) {
  if (state.alertDone || state.minutes < PRECHECK.alertAt) return;
  state.alertDone = true;
  const saved = state.minutes;
  state.minutes = PRECHECK.alertAt;
  log(state, 'alert', '08:25 위급재난문자 발송.');
  const ringers = state.students.filter((s) => s.slip && SLIPS[s.slip].ring && !s.slipState);
  if (ringers.length) {
    ringers.forEach((s) => {
      s.slipState = 'prevented';
      s.mood = 'nervous';
      log(state, 'prevent', `${s.seat}번 수험생 외투에서 알림음이 크게 울린다. 시험 전이라 휴대폰을 제출받았다. "${SLIPS[s.slip].reaction[0]}"`, s.seat);
    });
  } else {
    log(state, 'system', '교실은 조용하다. 옆 교실 어딘가에서 알림음이 들린다.');
  }
  state.minutes = saved;
}

export function finishPrecheck(state) {
  if (state.phase !== 'precheck' || busy(state)) return;
  state.minutes = PRECHECK.minutes;
  maybeAlert(state);
  const rest = state.students.filter((s) => !s.checked.clothes);
  rest.forEach((s) => { s.sticker = true; });
  if (rest.length) log(state, 'system', `부감독관이 나머지 ${rest.length}명의 단추에 스티커만 붙였다. 소매와 주머니는 확인하지 못했다.`);
  state.actionIndex += 1;
  startExam(state);
}

// ---------- 교시 ----------
function startExam(state) {
  const p = PERIODS[state.period];
  state.phase = 'exam';
  state.patrolLeft = BUDGET.patrol;
  state.idLeft = state.period > 0 ? BUDGET.idCheck : 0;
  log(state, 'period', `${p.label} ${p.subject} 시작${state.period === 2 ? ' · 휴대 물품 재점검 날' : ''}`);
  state.schedule[state.period].forEach((ev) => {
    log(state, ev.kind === 'ambient' ? 'ambient' : 'event', ev.text, ev.seat);
    if (ev.kind === 'sticker') {
      student(state, ev.seat).sticker = true;
      log(state, 'action', '다가가서 스티커를 다시 붙였다.', ev.seat);
    }
  });
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

  const slip = s.slip ? SLIPS[s.slip] : null;
  if (slip && !s.slipState && slip.sleeve && p <= 2) {
    askSlip(state, s, `본인 확인 중 소매를 걷게 했다. ${slip.find}`);
    return true;
  }
  if (slip && !s.slipState && slip.pocket && p === 2) {
    askSlip(state, s, `3교시 전 휴대 물품 재점검. ${slip.find}`);
    return true;
  }
  const parts = [];
  if (s.scheme === 'proxy' && rng.chance(0.4)) parts.push(rng.pick(PROXY_ID_HINT));
  else parts.push(rng.pick(ID_OK));
  if (s.look.glasses) {
    const swapped = s.scheme === 'aiGlasses' && p > SCHEMES.aiGlasses.swapAfter;
    if (swapped && s.glassesSeenAM) parts.push('그런데 안경이 오전에 본 것과 다르다. 테가 두껍고 다리가 넓다.');
    else if (swapped) parts.push('안경은 두꺼운 검은 테다. 오전에도 이랬는지 기억나지 않는다.');
    else parts.push('안경을 쓴 채로 확인했다. 특이점은 없다.');
  }
  if (p <= 2) parts.push(s.scheme && SCHEMES[s.scheme].idcheck ? SCHEMES[s.scheme].idcheck : '소매 안쪽도 이상 없다.');
  log(state, 'check', `본인 확인: ${parts.join(' ')}`, seat);
  return true;
}

function schemeActive(s, period) {
  if (!s.scheme) return false;
  if (s.scheme === 'aiGlasses') return period > SCHEMES.aiGlasses.swapAfter;
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

  const slip = s.slip ? SLIPS[s.slip] : null;
  if (slip && !s.slipState && slip.sleeve && rng.chance(0.7)) {
    askSlip(state, s, `순회 중: ${slip.patrol} 다가가 확인하니 전자시계다.`);
    return true;
  }
  let text;
  if (slip && !s.slipState && slip.pocket && rng.chance(0.6)) text = slip.patrol;
  else if (schemeActive(s, state.period) && rng.chance(0.7)) text = rng.pick(SCHEMES[s.scheme].patrol);
  else if (s.habit && (!s.habitSeen || rng.chance(0.4))) { text = HABITS[s.habit].patrol; s.habitSeen = true; }
  else text = rng.pick(NEUTRAL_PATROL);
  log(state, 'patrol', `순회 중: ${text}`, seat);
  return true;
}

export function endExam(state) {
  if (state.phase !== 'exam' || busy(state)) return;
  const p = state.period;
  state.actionIndex += 1;
  state.patrolLeft = 0;
  const s4 = state.students.find((s) => s.slip === 'section4' && !s.slipState);
  if (p === 3 && s4) {
    askSlip(state, s4, fill(SLIPS.section4.event, s4.seat));
    state.phase = 'ending';
    return;
  }
  ringBell(state);
}

function ringBell(state) {
  const p = state.period;
  const bell = state.students.find((s) => s.slip === 'bell' && !s.slipState);
  if (bell && state.bellAt === p) {
    state.phase = 'bell';
    askSlip(state, bell, fill(SLIPS.bell.event, bell.seat));
    return;
  }
  toBreak(state);
}

// 4교시 위반 → 종료령 → 쉬는 시간 순서로 이어 준다.
export function continueAfterPending(state) {
  if (state.pending) return;
  if (state.phase === 'ending') ringBell(state);
  else if (state.phase === 'bell') toBreak(state);
}

function toBreak(state) {
  const p = PERIODS[state.period];
  state.afterLeft = BUDGET.afterCheck;
  state.phase = 'break'; // 종료 시각으로 기록
  log(state, 'system', `${p.label} 종료. 답안지를 걷었다.${state.period === 1 ? ' 이제 점심시간이다.' : ''}`);
  state.students.forEach((s) => { if (s.mood === 'nervous') s.mood = 'normal'; });
  // 의심 표시한 수험생이 있을 때만 쉬는 시간 점검 단계를 연다.
  if (suspects(state).length) state.phase = 'break';
  else advance(state);
}

// 의심 표시했고 아직 처리되지 않은 수험생
export function suspects(state) {
  return state.students.filter((s) => s.flagged && s.schemeState !== 'caught' && s.slipState !== 'reported');
}

export function canAfterCheck(state, seat) {
  return state.phase === 'break' && !busy(state) && state.afterLeft > 0 && !!student(state, seat);
}

// 교시 후 점검: 시험본부에서 금속탐지기와 정밀 점검
export function afterCheck(state, seat) {
  if (!canAfterCheck(state, seat)) return false;
  const s = student(state, seat);
  const rng = rngFor(state, 4);
  state.afterLeft -= 1;
  state.actionIndex += 1;

  if (s.scheme && schemeActive(s, state.period) && rng.chance(SCHEMES[s.scheme].detect)) {
    s.schemeState = 'caught';
    s.mood = 'shocked';
    log(state, 'caught', `교시 후 점검: ${SCHEMES[s.scheme].found} ${SCHEMES[s.scheme].caught}`, seat);
    return true;
  }
  const slip = s.slip ? SLIPS[s.slip] : null;
  if (slip && !s.slipState && (slip.pocket || slip.sleeve)) {
    askSlip(state, s, `교시 후 점검: ${slip.find}`);
    return true;
  }
  state.complaints += 1;
  if (s.scheme) {
    const sc = SCHEMES[s.scheme];
    s.mood = 'calm';
    const miss = schemeActive(s, state.period) && sc.missText ? `${sc.missText} ` : '아무것도 나오지 않았다. ';
    log(state, 'clean', `교시 후 점검: ${miss}"${rng.pick(sc.calm)}" 끝까지 침착하다.`, seat);
  } else {
    s.mood = 'angry';
    log(state, 'clean', `교시 후 점검: 아무것도 나오지 않았다. "${rng.pick(PROTEST)}" 민원 1건.`, seat);
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
    log(state, 'system', '모든 시험이 끝났다. 의심 표시한 수험생은 증거가 없어도 사후 조사를 요청할 수 있다.');
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
