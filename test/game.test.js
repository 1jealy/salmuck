import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame, precheck, finishPrecheck, idCheck, finishIdCheck, patrol, endExam, afterCheck, nextPeriod, resolvePending, toggleFlag, submitReport, normalizeRoom, truth, student } from '../src/game.js';
import { SLIPS, SCHEMES } from '../src/data.js';

const ROOMS = Array.from({ length: 500 }, (_, i) => 1000 + i * 17);

// 아무 선택이나 해서 끝까지 진행하는 도우미
function playThrough(state, pick = (n) => n % 12 + 1) {
  let k = 0;
  const settle = () => { while (state.pending) resolvePending(state, k++ % 2 ? 'report' : 'excuse'); };
  precheck(state, 'announce');
  for (let i = 0; i < 6; i++) { precheck(state, 'clothes', pick(k++)); settle(); }
  finishPrecheck(state);
  settle();
  for (let p = 0; p < 4; p++) {
    if (state.phase === 'idcheck') { for (let i = 0; i < 3; i++) { idCheck(state, pick(k++)); settle(); } finishIdCheck(state); }
    for (let i = 0; i < 3; i++) { patrol(state, pick(k++)); settle(); }
    endExam(state);
    settle();
    assert.equal(state.phase, 'break');
    afterCheck(state, pick(k++));
    settle();
    nextPeriod(state);
  }
  assert.equal(state.phase, 'report');
  return submitReport(state);
}

test('같은 시험실 번호면 같은 판이 나온다', () => {
  assert.deepEqual(newGame(4271), newGame(4271));
  assert.notDeepEqual(newGame(4271).students, newGame(4272).students);
});

test('판 구성: 계획형 1~2명, 실수형 0~1명, 겹치지 않음', () => {
  let two = 0;
  const kinds = new Set();
  for (const room of ROOMS) {
    const s = newGame(room);
    const schemes = s.students.filter((x) => x.scheme);
    const slips = s.students.filter((x) => x.slip);
    assert.ok(schemes.length >= 1 && schemes.length <= 2);
    assert.ok(slips.length <= 1);
    s.students.forEach((x) => assert.ok(!(x.scheme && x.slip)));
    schemes.forEach((x) => { kinds.add(x.scheme); if (SCHEMES[x.scheme].needsGlasses) assert.ok(x.look.glasses); });
    if (schemes.length === 2) two += 1;
  }
  assert.equal(kinds.size, Object.keys(SCHEMES).length, '모든 계획형이 등장');
  assert.ok(two > ROOMS.length * 0.3 && two < ROOMS.length * 0.6, `2명 비율 ${two}`);
});

test('모든 계획형은 앞에서 보이는 징후나 순회 징후가 있다', () => {
  for (const [k, v] of Object.entries(SCHEMES)) {
    assert.ok(v.patrol.length >= 1, k);
    assert.ok(v.found && v.reveal && v.calm.length, k);
    assert.ok(v.detect > 0 && v.detect <= 1, k);
  }
});

test('입실 점검은 30분을 넘지 않고 08:25 재난문자는 한 번만', () => {
  const s = newGame(3333);
  for (let seat = 1; seat <= 12; seat++) { precheck(s, 'clothes', seat); precheck(s, 'id', seat); }
  assert.ok(s.minutes <= 30);
  finishPrecheck(s);
  assert.equal(s.log.filter((e) => e.kind === 'alert').length, 1);
  assert.equal(s.phase, 'exam');
  assert.ok(s.students.every((x) => x.sticker));
});

test('켜진 휴대폰은 재난문자로 시험 전에 예방된다', () => {
  const room = ROOMS.find((r) => newGame(r).students.some((x) => x.slip === 'phoneOn'));
  const s = newGame(room);
  finishPrecheck(s);
  assert.equal(s.students.find((x) => x.slip === 'phoneOn').slipState, 'prevented');
});

test('스마트안경은 점심 전 점검에서는 깨끗하고 오후에는 적발된다', () => {
  const room = ROOMS.find((r) => newGame(r).students.some((x) => x.scheme === 'aiGlasses'));
  const early = newGame(room);
  const seat = early.students.find((x) => x.scheme === 'aiGlasses').seat;
  finishPrecheck(early);
  endExam(early);
  while (early.pending) resolvePending(early, 'report');
  afterCheck(early, seat);
  assert.notEqual(student(early, seat).schemeState, 'caught');

  const late = newGame(room);
  finishPrecheck(late);
  for (let p = 0; p < 3; p++) {
    if (late.phase === 'idcheck') finishIdCheck(late);
    endExam(late);
    while (late.pending) resolvePending(late, 'report');
    if (p < 2) nextPeriod(late);
  }
  afterCheck(late, seat);
  assert.equal(student(late, seat).schemeState, 'caught');
});

test('어떤 판이든 끝까지 진행되고 등급은 1~9', () => {
  for (const room of ROOMS.slice(0, 200)) {
    const r = playThrough(newGame(room));
    assert.ok(r.grade >= 1 && r.grade <= 9);
    assert.ok(r.title);
  }
});

test('남은 텍스트에 자리표시가 없다', () => {
  for (const room of ROOMS.slice(0, 200)) {
    const s = newGame(room);
    playThrough(s);
    s.log.forEach((e) => assert.ok(!/[{}]/.test(e.text), e.text));
    s.students.forEach((x) => assert.ok(!/[{}]/.test(truth(x).text)));
  }
});

test('무고한 수험생 교시 후 점검은 민원 1건, 의심 표시는 감점', () => {
  const room = ROOMS.find((r) => newGame(r).students[0].slip == null && newGame(r).students[0].scheme == null);
  const s = newGame(room);
  finishPrecheck(s);
  endExam(s);
  while (s.pending) resolvePending(s, 'report');
  afterCheck(s, 1);
  assert.equal(s.complaints, 1);
  toggleFlag(s, 1);
  assert.ok(student(s, 1).flagged);
});

test('실수형 데이터 형식', () => {
  for (const [k, v] of Object.entries(SLIPS)) {
    assert.ok(v.reaction.length >= 1, k);
    assert.ok(v.reveal, k);
  }
});

test('시험실 번호 정규화', () => {
  assert.equal(normalizeRoom('4271'), 4271);
  assert.equal(normalizeRoom('42'), null);
  assert.equal(normalizeRoom('abc'), null);
});
