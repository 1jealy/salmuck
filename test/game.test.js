import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame, makeView, makeRng, precheck, finishPrecheck, idCheck, patrol, endExam, afterCheck, nextPeriod, resolvePending, toggleFlag, submitReport, normalizeRoom, truth, student } from '../src/game.js';
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
    for (let i = 0; i < 3; i++) { idCheck(state, pick(k++)); settle(); }
    for (let i = 0; i < 3; i++) { patrol(state, pick(k++)); settle(); }
    if (p % 2 === 0) toggleFlag(state, pick(k++));
    endExam(state);
    settle();
    if (state.phase === 'break') {
      afterCheck(state, state.students.find((x) => x.flagged && x.schemeState !== 'caught' && x.slipState !== 'reported').seat);
      settle();
      nextPeriod(state);
    }
  }
  if (state.phase === 'report') submitReport(state);
  assert.equal(state.phase, 'result');
  return state.result;
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

test('모든 계획형은 그림 단서가 있고 정답 설명이 있다', () => {
  for (const [k, v] of Object.entries(SCHEMES)) {
    assert.ok(v.found && v.reveal && v.calm.length, k);
    assert.ok(v.detect > 0 && v.detect <= 1, k);
  }
});

test('확대 그림 단서: 계획형은 장비를 쓰는 동안 그림에 흔적이 남는다', () => {
  const seen = {};
  for (const room of ROOMS.slice(0, 300)) {
    const s = newGame(room);
    finishPrecheck(s);
    for (let p = 0; p < 4; p++) {
      s.students.filter((x) => x.scheme).forEach((x) => {
        for (let i = 0; i < 5; i++) {
          const v = makeView(s, x, makeRng(room * 31 + p * 7 + i));
          const k = x.scheme;
          seen[k] = seen[k] || false;
          if (k === 'aiGlasses' && v.glasses.thick) seen[k] = true;
          if (k === 'buttonCam' && v.bigButton) seen[k] = true;
          if (k === 'penCam' && v.fakePen) seen[k] = true;
          if (k === 'earpiece' && v.earBlob) seen[k] = true;
          if (k === 'vibration' && (v.waist || v.buzz)) seen[k] = true;
          if (k === 'hybridWatch' && v.watch && (v.watch.h !== v.time[0] % 24 || v.watch.m !== v.time[1])) seen[k] = true;
          if (k === 'proxy') seen[k] = makeView(s, x, makeRng(1), { id: true }).idPhoto.mole && !v.faceMole;
        }
      });
      if (p < 3) { endExam(s); while (s.pending) resolvePending(s, 'report'); if (s.phase === 'break') nextPeriod(s); }
    }
  }
  for (const k of Object.keys(SCHEMES)) assert.equal(seen[k], true, k);
});

test('오전의 스마트안경은 평범한 안경으로 그려진다', () => {
  const room = ROOMS.find((r) => newGame(r).students.some((x) => x.scheme === 'aiGlasses'));
  const s = newGame(room);
  const x = s.students.find((y) => y.scheme === 'aiGlasses');
  precheck(s, 'glasses', x.seat);
  const v = s.log[s.log.length - 1].view;
  assert.equal(v.glasses.thick, false);
  assert.equal(v.glasses.off, true);
});

test('입실 점검은 30분을 넘지 않고 08:25 재난문자는 한 번만', () => {
  const s = newGame(3333);
  for (let seat = 1; seat <= 12; seat++) { precheck(s, 'clothes', seat); precheck(s, 'id', seat); }
  assert.ok(s.minutes <= 30);
  finishPrecheck(s);
  assert.equal(s.log.filter((e) => e.kind === 'alert').length, 1);
  assert.equal(s.phase, 'exam');
  assert.ok(s.students.every((x) => x.sticker === !!x.look.clothes.buttons), '단추 있는 옷만 스티커');
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
  toggleFlag(early, seat);
  endExam(early);
  while (early.pending) resolvePending(early, 'report');
  afterCheck(early, seat);
  assert.notEqual(student(early, seat).schemeState, 'caught');

  const late = newGame(room);
  finishPrecheck(late);
  for (let p = 0; p < 3; p++) {
    if (p === 2) toggleFlag(late, seat);
    endExam(late);
    while (late.pending) resolvePending(late, 'report');
  }
  assert.equal(late.phase, 'break');
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
  toggleFlag(s, 1);
  endExam(s);
  while (s.pending) resolvePending(s, 'report');
  assert.equal(s.phase, 'break');
  afterCheck(s, 1);
  assert.equal(s.complaints, 1);
});

test('의심 표시가 없으면 쉬는 시간 단계 없이 바로 다음 교시로 간다', () => {
  const room = ROOMS.find((r) => !newGame(r).students.some((x) => x.slip === 'bell' || x.slip === 'section4'));
  const s = newGame(room);
  finishPrecheck(s);
  for (let p = 0; p < 3; p++) {
    endExam(s);
    assert.equal(s.phase, 'exam');
    assert.equal(s.period, p + 1);
  }
  endExam(s);
  assert.equal(s.phase, 'result');
});

test('스티커 습관은 단추 있는 옷에만, 이어폰 수험생은 귀가 보이는 머리', () => {
  for (const room of ROOMS) {
    const s = newGame(room);
    s.students.forEach((x) => {
      if (x.habit === 'stickerItch' || x.habit === 'stickerFalls') assert.ok(x.look.clothes.buttons, `${room} ${x.seat}`);
      if (x.scheme === 'earpiece') assert.ok(!['bob', 'long'].includes(x.look.hairStyle));
      if (x.scheme === 'buttonCam') assert.equal(x.look.clothes.kind, 'shirt');
      assert.ok(x.look.face && x.look.face.shape);
    });
  }
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
