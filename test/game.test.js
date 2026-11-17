import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame, observe, talk, inspect, endPeriod, toggleAccuse, submitReport, score, normalizeRoom, truth, ACTIONS_PER_PERIOD } from '../src/game.js';
import { CHEATS } from '../src/data.js';

const ROOMS = Array.from({ length: 400 }, (_, i) => 1000 + i * 17);

function countClues(state, seat) {
  return [...state.schedule, ...state.endSchedule].flat().filter((ev) => ev.seats.includes(seat)).length;
}

test('같은 시험실 번호면 같은 판이 나온다', () => {
  assert.deepEqual(newGame(4271), newGame(4271));
  assert.notDeepEqual(newGame(4271).students, newGame(4272).students);
});

test('부정행위자는 0~2명이고 모두 단서가 2개 이상 있다', () => {
  const counts = [0, 0, 0];
  for (const room of ROOMS) {
    const s = newGame(room);
    const culprits = s.students.filter((x) => x.guilty);
    assert.ok(culprits.length <= 2);
    counts[culprits.length] += 1;
    for (const c of culprits) {
      assert.ok(CHEATS[c.cheat], `알 수 없는 부정행위 ${c.cheat}`);
      assert.ok(countClues(s, c.seat) >= 2, `시험실 ${room} ${c.seat}번 단서 부족`);
      if (c.partner) assert.equal(s.students[c.partner - 1].partner, c.seat);
    }
    for (const x of s.students.filter((y) => !y.guilty)) assert.ok(x.herring);
  }
  assert.ok(counts.every((n) => n > 0), `분포 ${counts}`);
});

test('남은 텍스트에 {n}, {m} 자리표시가 없다', () => {
  for (const room of ROOMS) {
    const s = newGame(room);
    const all = [...s.schedule, ...s.endSchedule].flat().map((e) => e.text);
    for (const t of all) assert.ok(!/[{}]/.test(t), t);
    for (const x of s.students) assert.ok(!/[{}]/.test(truth(x).text));
  }
});

test('한 판을 끝까지 진행할 수 있다', () => {
  const s = newGame(1234);
  for (let p = 0; p < 4; p++) {
    assert.equal(s.actionsLeft, ACTIONS_PER_PERIOD);
    assert.ok(observe(s, 1));
    assert.ok(talk(s, 2));
    assert.equal(observe(s, 3), null, '행동을 다 쓰면 더 못 한다');
    endPeriod(s);
  }
  assert.equal(s.phase, 'accuse');
  toggleAccuse(s, 3);
  toggleAccuse(s, 5);
  toggleAccuse(s, 5);
  assert.deepEqual(s.accused, [3]);
  const r = submitReport(s);
  assert.equal(s.phase, 'result');
  assert.ok(r.grade >= 1 && r.grade <= 9);
  assert.ok(r.title);
});

test('소지품 검사는 한 번만, 무고한 수험생이면 민원 2건', () => {
  const s = newGame(2222);
  const innocent = s.students.find((x) => !x.guilty);
  inspect(s, innocent.seat);
  assert.equal(s.complaints, 2);
  assert.equal(s.inspectLeft, 0);
  assert.equal(inspect(s, innocent.seat), null);
});

test('채점 규칙', () => {
  assert.equal(score({ culprits: [2], accused: [2], complaints: 0 }).grade, 1);
  assert.equal(score({ culprits: [2], accused: [2], complaints: 0 }).title, '매의 눈');
  assert.equal(score({ culprits: [], accused: [], complaints: 1 }).title, '평화를 지킨 감독관');
  assert.equal(score({ culprits: [2], accused: [4], complaints: 0 }).grade, 9);
  assert.equal(score({ culprits: [2], accused: [], complaints: 0 }).grade, 7);
  assert.equal(score({ culprits: [2, 4], accused: [2], complaints: 0 }).grade, 3);
  assert.equal(score({ culprits: [2], accused: [2], complaints: 6 }).grade, 3);
  assert.equal(score({ culprits: [2], accused: [3], complaints: 7 }).title, '민원 폭탄 감독관');
});

test('시험실 번호 정규화', () => {
  assert.equal(normalizeRoom('4271'), 4271);
  assert.equal(normalizeRoom('room-0042'), null);
  assert.equal(normalizeRoom('abc'), null);
});
