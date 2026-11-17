// 도트 시험실. 이미지 파일 없이 사각형을 찍어서 그린다.
// 논리 해상도 192x108을 화면에서 확대한다(image-rendering: pixelated).
import { HERRINGS } from './data.js';
import { clockTime } from './game.js';

export const SCENE_W = 192;
export const SCENE_H = 108;
export const DESK_X = [22, 59, 96, 133, 170];

const C = {
  wall: '#c7cdbd',
  wallShade: '#b3baa8',
  trim: '#8d9583',
  floor: '#8a6b4c',
  floorLine: '#78593c',
  boardFrame: '#6b5137',
  board: '#2c4a3e',
  chalk: '#e6ece3',
  chalkDim: '#9fb4a6',
  deskTop: '#c19463',
  deskFront: '#9a7148',
  deskEdge: '#7d5a37',
  metal: '#5d6468',
  paper: '#f4f5f1',
  omr: '#e0607d',
  ink: '#1b1f1d',
  sky: '#a9cde0',
  ginkgo: '#e8c33c',
  ginkgoDark: '#c99a22',
  sweat: '#8fd0ff',
  mark: '#e23d5f',
  ok: '#4fbf7a',
  blush: '#e98a8a',
  plate: '#eef0ea',
};

// 3x5 숫자 글꼴
const DIGITS = {
  0: ['111', '101', '101', '101', '111'],
  1: ['010', '110', '010', '010', '111'],
  2: ['111', '001', '111', '100', '111'],
  3: ['111', '001', '111', '001', '111'],
  4: ['101', '101', '111', '001', '001'],
  5: ['111', '100', '111', '001', '111'],
  6: ['111', '100', '111', '101', '111'],
  7: ['111', '001', '010', '010', '010'],
  8: ['111', '101', '111', '101', '111'],
  9: ['111', '101', '111', '001', '111'],
  ':': ['0', '1', '0', '1', '0'],
};

function rect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

function text3x5(ctx, str, x, y, color) {
  let cx = x;
  for (const ch of str) {
    const g = DIGITS[ch];
    if (!g) { cx += 2; continue; }
    g.forEach((row, ry) => {
      [...row].forEach((bit, rx) => { if (bit === '1') rect(ctx, cx + rx, y + ry, 1, 1, color); });
    });
    cx += g[0].length + 1;
  }
}

function drawRoom(ctx, state) {
  rect(ctx, 0, 0, SCENE_W, 62, C.wall);
  rect(ctx, 0, 54, SCENE_W, 8, C.wallShade);
  rect(ctx, 0, 54, SCENE_W, 1, C.trim);
  rect(ctx, 0, 62, SCENE_W, SCENE_H - 62, C.floor);
  for (let y = 68; y < SCENE_H; y += 7) rect(ctx, 0, y, SCENE_W, 1, C.floorLine);

  // 창문과 은행나무
  rect(ctx, 3, 7, 22, 36, C.boardFrame);
  rect(ctx, 5, 9, 18, 32, C.sky);
  rect(ctx, 13, 9, 1, 32, C.boardFrame);
  rect(ctx, 5, 24, 18, 1, C.boardFrame);
  const leaves = [[6, 12], [8, 10], [10, 13], [15, 11], [17, 14], [19, 12], [7, 16], [16, 17], [20, 19], [9, 19], [11, 27], [18, 29], [6, 33], [20, 34]];
  leaves.forEach(([x, y], i) => {
    rect(ctx, x, y, 2, 2, i % 3 ? C.ginkgo : C.ginkgoDark);
  });

  // 칠판: 교시와 현재 시각
  rect(ctx, 34, 5, 124, 32, C.boardFrame);
  rect(ctx, 36, 7, 120, 28, C.board);
  rect(ctx, 36, 35, 120, 2, C.deskEdge);
  const [h, m] = clockTime(state);
  const period = Math.min(state.period, 3) + 1;
  text3x5(ctx, String(period), 42, 12, C.chalk);
  // "교시" 대신 짧은 분필 낙서
  rect(ctx, 47, 13, 9, 1, C.chalkDim);
  rect(ctx, 47, 15, 7, 1, C.chalkDim);
  text3x5(ctx, `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`, 128, 12, C.chalk);
  // 유의사항 낙서 줄
  rect(ctx, 42, 22, 52, 1, C.chalkDim);
  rect(ctx, 42, 25, 40, 1, C.chalkDim);
  rect(ctx, 42, 28, 58, 1, C.chalkDim);
  rect(ctx, 104, 22, 18, 1, C.chalkDim);
  // 분필통
  rect(ctx, 96, 34, 3, 1, C.chalk);
  rect(ctx, 101, 34, 2, 1, C.omr);

  // 벽시계
  const cx = 176, cy = 16;
  rect(ctx, cx - 6, cy - 7, 13, 15, C.ink);
  rect(ctx, cx - 5, cy - 6, 11, 13, C.plate);
  rect(ctx, cx, cy, 1, 1, C.ink);
  const hourAngle = (((h % 12) + m / 60) / 12) * Math.PI * 2;
  const minAngle = (m / 60) * Math.PI * 2;
  for (let r = 1; r <= 3; r++) rect(ctx, cx + Math.round(Math.sin(hourAngle) * r), cy - Math.round(Math.cos(hourAngle) * r), 1, 1, C.ink);
  for (let r = 1; r <= 5; r++) rect(ctx, cx + Math.round(Math.sin(minAngle) * r), cy - Math.round(Math.cos(minAngle) * r), 1, 1, C.mark);
}

function drawHair(ctx, x, y, look, behind) {
  const c = look.hair;
  switch (look.hairStyle) {
    case 'buzz':
      if (!behind) rect(ctx, x - 6, y - 2, 12, 3, c);
      break;
    case 'long':
      if (behind) rect(ctx, x - 7, y, 14, 15, c);
      else { rect(ctx, x - 6, y - 2, 12, 4, c); rect(ctx, x - 7, y, 2, 10, c); rect(ctx, x + 5, y, 2, 10, c); }
      break;
    case 'bob':
      if (!behind) { rect(ctx, x - 7, y - 2, 14, 5, c); rect(ctx, x - 7, y + 3, 2, 6, c); rect(ctx, x + 5, y + 3, 2, 6, c); }
      break;
    case 'fluffy':
      if (!behind) {
        rect(ctx, x - 7, y - 3, 14, 5, c);
        rect(ctx, x - 5, y - 4, 3, 1, c);
        rect(ctx, x + 1, y - 4, 4, 1, c);
        rect(ctx, x - 7, y + 2, 1, 3, c);
        rect(ctx, x + 6, y + 2, 1, 3, c);
      }
      break;
    default:
      if (!behind) { rect(ctx, x - 6, y - 2, 12, 4, c); rect(ctx, x - 6, y + 2, 1, 3, c); rect(ctx, x + 5, y + 2, 1, 3, c); }
  }
}

function drawFace(ctx, x, y, s, blink) {
  const eyeY = y + 5;
  const mood = s.mood;
  if (mood === 'shocked') {
    rect(ctx, x - 3, eyeY - 1, 2, 2, C.ink);
    rect(ctx, x + 2, eyeY - 1, 2, 2, C.ink);
    rect(ctx, x - 1, y + 8, 2, 2, C.ink);
  } else {
    if (blink) {
      rect(ctx, x - 3, eyeY, 2, 1, C.ink);
      rect(ctx, x + 2, eyeY, 2, 1, C.ink);
    } else {
      rect(ctx, x - 3, eyeY - 1, 1, 2, C.ink);
      rect(ctx, x + 2, eyeY - 1, 1, 2, C.ink);
    }
    if (mood === 'nervous') {
      rect(ctx, x - 2, y + 9, 1, 1, C.ink);
      rect(ctx, x - 1, y + 8, 1, 1, C.ink);
      rect(ctx, x, y + 9, 1, 1, C.ink);
      rect(ctx, x + 1, y + 8, 1, 1, C.ink);
    } else if (mood === 'wronged') {
      rect(ctx, x - 4, eyeY - 3, 2, 1, C.ink);
      rect(ctx, x + 3, eyeY - 3, 2, 1, C.ink);
      rect(ctx, x - 2, y + 9, 4, 1, C.ink);
      rect(ctx, x - 5, y + 7, 1, 1, C.blush);
      rect(ctx, x + 5, y + 7, 1, 1, C.blush);
    } else {
      rect(ctx, x - 1, y + 9, 3, 1, C.ink);
    }
  }
  if (s.look.glasses) {
    ctx.strokeStyle = C.ink;
    rect(ctx, x - 4, eyeY - 2, 4, 1, C.ink);
    rect(ctx, x + 1, eyeY - 2, 4, 1, C.ink);
    rect(ctx, x - 4, eyeY + 1, 4, 1, C.ink);
    rect(ctx, x + 1, eyeY + 1, 4, 1, C.ink);
    rect(ctx, x - 4, eyeY - 2, 1, 4, C.ink);
    rect(ctx, x + 4, eyeY - 2, 1, 4, C.ink);
    rect(ctx, x, eyeY - 1, 1, 1, C.ink);
  }
}

function drawStudent(ctx, s, t, opts) {
  const seed = s.seat * 977;
  const reduce = opts.reduceMotion;
  const herring = s.herring ? HERRINGS[s.herring] : null;
  const sleeping = herring && herring.pose === 'sleep' && opts.phase !== 'result';
  let x = DESK_X[s.seat - 1];
  let deskShake = 0;
  if (!reduce && s.herring === 'legShake' && Math.floor(t / 110) % 2 === 0) deskShake = 1;
  // 엿보기 수험생은 가끔 고개가 옆으로 간다
  let headShift = 0;
  if (!reduce && s.cheat === 'peek' && (t + seed) % 4200 < 700) headShift = s.seat < 3 ? 2 : -2;
  const bob = !reduce && (t + seed) % 2600 < 160 ? 1 : 0;
  const blink = (t + seed * 3) % 3700 < 140;

  const headY = sleeping ? 53 : 40 + bob;
  const hx = x + headShift;
  const cl = s.look.clothes;

  // 몸
  rect(ctx, x - 8, 53, 16, 12, cl.body);
  if (cl.kind === 'uniform') {
    rect(ctx, x - 2, 53, 4, 3, cl.trim);
    rect(ctx, x - 1, 56, 2, 1, cl.trim);
  } else if (cl.kind === 'hoodie') {
    rect(ctx, x - 5, 53, 10, 2, cl.trim);
  } else {
    rect(ctx, x - 8, 58, 16, 1, cl.trim);
  }
  // 팔
  rect(ctx, x - 10, 59, 4, 5, cl.body);
  rect(ctx, x + 6, 59, 4, 5, cl.body);

  // 머리
  if (!sleeping) drawHair(ctx, hx, headY, s.look, true);
  if (sleeping) {
    rect(ctx, hx - 6, headY, 12, 8, s.look.hair);
  } else {
    rect(ctx, hx - 5, headY, 10, 12, s.look.skin);
    rect(ctx, hx - 6, headY + 2, 1, 7, s.look.skin);
    rect(ctx, hx + 5, headY + 2, 1, 7, s.look.skin);
    drawHair(ctx, hx, headY, s.look, false);
    drawFace(ctx, hx, headY, s, blink);
    if (s.mood === 'nervous' || s.mood === 'shocked') {
      rect(ctx, hx + 7, headY + 1, 1, 1, C.sweat);
      rect(ctx, hx + 6, headY + 2, 3, 2, C.sweat);
    }
  }

  // 책상
  const dx = x + deskShake;
  rect(ctx, dx - 15, 63, 30, 4, C.deskTop);
  rect(ctx, dx - 15, 67, 30, 1, C.deskEdge);
  rect(ctx, dx - 9, 62, 11, 2, C.paper);
  rect(ctx, dx + 4, 62, 6, 2, C.omr);
  rect(ctx, dx - 14, 68, 28, 13, C.deskFront);
  rect(ctx, dx - 14, 80, 28, 1, C.deskEdge);
  rect(ctx, dx - 13, 81, 2, 15, C.metal);
  rect(ctx, dx + 11, 81, 2, 15, C.metal);
  // 손(책상 위)
  rect(ctx, x - 9, 62, 3, 2, s.look.skin);
  rect(ctx, x + 6, 62, 3, 2, s.look.skin);
  // 좌석 번호판
  rect(ctx, dx - 3, 71, 7, 7, C.plate);
  text3x5(ctx, String(s.seat), dx - 1, 72, C.ink);

  // 표시: 선택, 지목, 결과
  const top = headY - 9;
  if (opts.phase === 'result') {
    const markColor = s.guilty ? C.mark : C.ok;
    const accused = opts.accused.includes(s.seat);
    if (s.guilty || accused) {
      rect(ctx, x - 3, top - 2, 7, 7, markColor);
      if (s.guilty) {
        rect(ctx, x, top - 1, 1, 3, C.plate);
        rect(ctx, x, top + 3, 1, 1, C.plate);
      } else {
        rect(ctx, x - 1, top + 2, 1, 1, C.plate);
        rect(ctx, x, top + 3, 1, 1, C.plate);
        rect(ctx, x + 1, top + 2, 1, 1, C.plate);
        rect(ctx, x + 2, top + 1, 1, 1, C.plate);
      }
    }
  } else if (opts.phase === 'accuse' && opts.accused.includes(s.seat)) {
    rect(ctx, x - 3, top - 1, 7, 5, C.mark);
    rect(ctx, x - 2, top - 2, 5, 7, C.mark);
  } else if (opts.selected === s.seat) {
    const up = reduce ? 0 : Math.floor(t / 300) % 2;
    rect(ctx, x - 3, top - up, 7, 1, C.mark);
    rect(ctx, x - 2, top + 1 - up, 5, 1, C.mark);
    rect(ctx, x - 1, top + 2 - up, 3, 1, C.mark);
    rect(ctx, x, top + 3 - up, 1, 1, C.mark);
  }
}

export function drawScene(ctx, state, opts) {
  const o = { t: 0, selected: null, reduceMotion: false, ...opts, phase: state.phase, accused: state.accused };
  ctx.imageSmoothingEnabled = false;
  drawRoom(ctx, state);
  state.students.forEach((s) => drawStudent(ctx, s, o.t, o));
}

// 화면 좌표(논리 해상도 기준)를 좌석 번호로
export function seatAt(x, y) {
  if (y < 28 || y > 98) return null;
  let best = null;
  DESK_X.forEach((dx, i) => {
    if (Math.abs(x - dx) <= 17) best = i + 1;
  });
  return best;
}
