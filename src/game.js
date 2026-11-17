// 게임 규칙. 화면과 분리된 순수 로직이라 테스트하기 쉽다.
// 상태(state)는 평범한 JSON 객체라 저장/복원이 가능하다.
import { PERIODS, TRAITS, CHEATS, HERRINGS, NEUTRAL_CLOSE, MISLEADING_CLOSE, GUILTY_NOT_FOUND, INNOCENT_FINDS, INSPECT_PROTEST, AMBIENT, SURNAMES, GIVEN_NAMES, LOOKS } from './data.js';

export const SEATS = [1, 2, 3, 4, 5];
export const ACTIONS_PER_PERIOD = 2;
export const COMPLAINT_LIMIT = 6;

// 시드 고정 난수: 같은 시험실 번호면 같은 판이 나온다.
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

function fill(text, n, m) {
  return text.split('{n}').join(String(n)).split('{m}').join(m == null ? '' : String(m));
}

function actionRng(state, salt) {
  return makeRng((Math.imul(state.room, 2654435761) + state.actionIndex * 7919 + salt) >>> 0);
}

function makeLook(rng) {
  return {
    skin: rng.pick(LOOKS.skin),
    hair: rng.pick(LOOKS.hair),
    hairStyle: rng.pick(LOOKS.hairStyle),
    glasses: rng.chance(0.4),
    clothes: rng.pick(LOOKS.clothes),
  };
}

export function student(state, seat) {
  return state.students.find((s) => s.seat === seat);
}

export function label(s) {
  return `${s.seat}번 ${s.name}`;
}

export function newGame(room) {
  const rng = makeRng(Math.imul(room, 7919) + 13);
  const given = rng.shuffle(GIVEN_NAMES);
  const traitKeys = rng.shuffle(Object.keys(TRAITS));
  const students = SEATS.map((seat, i) => ({
    seat,
    name: rng.pick(SURNAMES) + given[i],
    trait: traitKeys[i % traitKeys.length],
    look: makeLook(rng),
    guilty: false,
    cheat: null,
    partner: null,
    herring: null,
    closeIdx: 0,
    herringSeen: false,
    mood: 'normal',
  }));

  // 부정행위자 수: 0명 12%, 1명 70%, 2명 18%
  const roll = rng.next();
  const count = roll < 0.12 ? 0 : roll < 0.82 ? 1 : 2;
  const culpritSeats = rng.shuffle(SEATS).slice(0, count).sort((a, b) => a - b);

  if (count === 2 && rng.chance(0.5)) {
    const [a, b] = culpritSeats;
    Object.assign(students[a - 1], { guilty: true, cheat: 'signal', partner: b });
    Object.assign(students[b - 1], { guilty: true, cheat: 'signal', partner: a });
  } else {
    const pool = rng.shuffle(Object.keys(CHEATS).filter((k) => !CHEATS[k].pair));
    culpritSeats.forEach((seat, i) => Object.assign(students[seat - 1], { guilty: true, cheat: pool[i] }));
  }

  const herringPool = rng.shuffle(Object.keys(HERRINGS));
  students.filter((s) => !s.guilty).forEach((s, i) => { s.herring = herringPool[i % herringPool.length]; });

  // 교시별 공개 사건 배치
  const schedule = PERIODS.map(() => []);
  const endSchedule = PERIODS.map(() => []);
  const spreadPeriods = (min, max) => rng.shuffle([0, 1, 2, 3]).slice(0, rng.int(min, max)).sort((a, b) => a - b);

  for (const s of students) {
    if (s.guilty) {
      const c = CHEATS[s.cheat];
      if (c.pair && s.partner < s.seat) continue; // 짝 신호는 한 번만 배치
      const texts = rng.shuffle(c.public);
      if (c.periods) {
        const p = c.periods[0];
        schedule[p].push({ text: fill(texts[0], s.seat, s.partner), seats: [s.seat] });
        endSchedule[p].push({ text: fill(texts[1 % texts.length], s.seat, s.partner), seats: [s.seat] });
      } else {
        spreadPeriods(2, 3).forEach((p, i) => {
          const ev = { text: fill(texts[i % texts.length], s.seat, s.partner), seats: s.partner ? [s.seat, s.partner] : [s.seat] };
          (c.atEnd ? endSchedule : schedule)[p].push(ev);
        });
      }
    } else {
      const h = HERRINGS[s.herring];
      const texts = rng.shuffle(h.public);
      spreadPeriods(1, 2).forEach((p, i) => {
        schedule[p].push({ text: fill(texts[i % texts.length], s.seat), seats: [s.seat] });
      });
    }
  }
  PERIODS.forEach((_, p) => {
    if (rng.chance(0.55)) {
      const options = AMBIENT.filter((a) => a.period == null || a.period === p);
      schedule[p].push({ text: rng.pick(options).text, seats: [] });
    }
  });

  const state = {
    v: 1,
    room,
    phase: 'play',
    period: 0,
    actionsLeft: ACTIONS_PER_PERIOD,
    inspectLeft: 1,
    complaints: 0,
    actionIndex: 0,
    students,
    schedule: schedule.map((list) => rng.shuffle(list)),
    endSchedule,
    log: [],
    quotes: [],
    accused: [],
    result: null,
  };
  startPeriod(state);
  return state;
}

function push(state, entry) {
  state.log.push({ period: state.period, ...entry });
}

function startPeriod(state) {
  const p = PERIODS[state.period];
  push(state, { kind: 'period', text: `${p.label} ${p.subject} 시작 · ${p.start}` });
  state.schedule[state.period].forEach((ev) => push(state, { kind: 'event', text: ev.text, seats: ev.seats }));
}

function canAct(state) {
  return state.phase === 'play' && state.actionsLeft > 0;
}

function spend(state) {
  state.actionsLeft -= 1;
  state.actionIndex += 1;
}

function cheatActive(state, s) {
  const c = CHEATS[s.cheat];
  return !c.periods || c.periods.includes(state.period);
}

export function observe(state, seat) {
  if (!canAct(state)) return null;
  const s = student(state, seat);
  const rng = actionRng(state, 1);
  let text;
  if (s.guilty) {
    const c = CHEATS[s.cheat];
    if (cheatActive(state, s) && rng.chance(0.7)) {
      text = fill(c.close[s.closeIdx % c.close.length], s.seat, s.partner);
      s.closeIdx += 1;
    } else {
      text = rng.chance(0.25) ? rng.pick(MISLEADING_CLOSE) : rng.pick(NEUTRAL_CLOSE);
    }
  } else if (!s.herringSeen) {
    text = rng.pick(HERRINGS[s.herring].close);
    s.herringSeen = true;
  } else {
    text = rng.chance(0.25) ? rng.pick(MISLEADING_CLOSE) : rng.pick(NEUTRAL_CLOSE);
  }
  push(state, { kind: 'observe', seats: [seat], text });
  spend(state);
  return text;
}

export function talk(state, seat) {
  if (!canAct(state)) return null;
  const s = student(state, seat);
  const rng = actionRng(state, 2);
  let line;
  if (s.guilty && cheatActive(state, s) && rng.chance(0.55)) {
    line = fill(rng.pick(CHEATS[s.cheat].guiltyLines), s.seat, s.partner);
  } else if (!s.guilty && rng.chance(0.55)) {
    line = rng.pick(HERRINGS[s.herring].lines);
  } else {
    line = rng.pick(TRAITS[s.trait].lines);
  }
  s.mood = 'nervous';
  state.complaints += 1;
  state.quotes.push({ seat, name: s.name, text: line });
  push(state, { kind: 'talk', seats: [seat], text: line });
  spend(state);
  return line;
}

export function inspect(state, seat) {
  if (!canAct(state) || state.inspectLeft < 1) return null;
  const s = student(state, seat);
  const rng = actionRng(state, 3);
  let text;
  if (s.guilty) {
    const c = CHEATS[s.cheat];
    text = c.inspect.found ? c.inspect.text : GUILTY_NOT_FOUND;
    s.mood = c.inspect.found ? 'shocked' : 'nervous';
  } else {
    text = HERRINGS[s.herring].inspect || rng.pick(INNOCENT_FINDS);
    s.mood = 'wronged';
    state.complaints += 2;
    const protest = rng.pick(INSPECT_PROTEST);
    state.quotes.push({ seat, name: s.name, text: protest });
    text += ` "${protest}"`;
  }
  state.inspectLeft -= 1;
  push(state, { kind: 'inspect', seats: [seat], text });
  spend(state);
  return text;
}

export function endPeriod(state) {
  if (state.phase !== 'play') return;
  const p = PERIODS[state.period];
  state.endSchedule[state.period].forEach((ev) => push(state, { kind: 'event', text: ev.text, seats: ev.seats }));
  push(state, { kind: 'system', text: `${p.label} 종료 · ${p.end}. 답안지를 걷었다.` });
  state.students.forEach((s) => { if (s.mood === 'nervous') s.mood = 'normal'; });
  state.actionIndex += 1;
  if (state.period < PERIODS.length - 1) {
    state.period += 1;
    state.actionsLeft = ACTIONS_PER_PERIOD;
    startPeriod(state);
  } else {
    state.phase = 'accuse';
    state.actionsLeft = 0;
    push(state, { kind: 'system', text: '모든 교시가 끝났다. 감독 보고서를 쓸 시간이다.' });
  }
}

export function toggleAccuse(state, seat) {
  if (state.phase !== 'accuse') return;
  const i = state.accused.indexOf(seat);
  if (i >= 0) state.accused.splice(i, 1);
  else state.accused.push(seat);
  state.accused.sort((a, b) => a - b);
}

export function score({ culprits, accused, complaints }) {
  const caught = accused.filter((s) => culprits.includes(s)).length;
  const falseCount = accused.length - caught;
  const missed = culprits.length - caught;
  const total = culprits.length;

  let grade;
  if (total === 0) grade = falseCount === 0 ? 1 : 6 + Math.min(falseCount, 3);
  else if (caught === total && falseCount === 0) grade = 1;
  else if (caught === total) grade = 4;
  else if (caught > 0 && falseCount === 0) grade = 3;
  else if (caught > 0) grade = 5;
  else if (falseCount === 0) grade = 7;
  else grade = 9;
  if (complaints >= COMPLAINT_LIMIT) grade += 2;
  else if (complaints >= 4) grade += 1;
  grade = Math.max(1, Math.min(9, grade));

  let title;
  if (total === 0 && falseCount === 0) title = '평화를 지킨 감독관';
  else if (total === 0) title = '죄 없는 수험생을 잡은 감독관';
  else if (caught === total && falseCount === 0) title = complaints >= 4 ? '시끄러운 명탐정' : '매의 눈';
  else if (caught === 0 && falseCount > 0) title = '엉뚱한 수험생을 잡은 감독관';
  else if (caught === 0) title = '아무것도 못 본 감독관';
  else if (falseCount > 0) title = '반은 맞고 반은 민원';
  else title = '아깝게 놓친 감독관';
  if (complaints >= COMPLAINT_LIMIT && grade >= 3) title = '민원 폭탄 감독관';

  return { grade, title, caught, falseCount, missed, total };
}

export function submitReport(state) {
  if (state.phase !== 'accuse') return null;
  const culprits = state.students.filter((s) => s.guilty).map((s) => s.seat);
  const result = score({ culprits, accused: state.accused, complaints: state.complaints });
  const rng = actionRng(state, 4);
  result.quote = state.quotes.length ? rng.pick(state.quotes) : null;
  state.result = result;
  state.phase = 'result';
  state.students.forEach((s) => {
    if (state.accused.includes(s.seat)) s.mood = s.guilty ? 'shocked' : 'wronged';
  });
  return result;
}

export function truth(s) {
  if (s.guilty) return { guilty: true, name: CHEATS[s.cheat].name, text: fill(CHEATS[s.cheat].reveal, s.seat, s.partner) };
  return { guilty: false, name: '무고', text: HERRINGS[s.herring].reveal };
}

export function clockTime(state) {
  const p = PERIODS[Math.min(state.period, PERIODS.length - 1)];
  const used = state.phase === 'play' ? ACTIONS_PER_PERIOD - state.actionsLeft : ACTIONS_PER_PERIOD + 1;
  const minutes = p.clock[0] * 60 + p.clock[1] + used * 25;
  return [Math.floor(minutes / 60), minutes % 60];
}
