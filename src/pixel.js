// 도트 시험실: 교탁에서 본 12명 (3줄 x 4칸).
// closeup.js와 같은 엔진(도형 + 자동 외곽선·명암)과 팔레트를 쓴다.
import { SCHEMES, LOOKS } from './data.js';
import { clock } from './game.js';
import { SKIN, HAIR, CLOTHES, WOOD, WALL, LOCK, makeRaster, rampFor, stamp } from './closeup.js';


export const SCENE_W = 240;
export const SCENE_H = 204;
const COLS = [36, 92, 148, 204];
const ROWS = [178, 134, 90]; // 책상 윗면 y: 앞줄(1~4), 가운데(5~8), 뒷줄(9~12)

const C = {
  ink: '#1b1820', white: '#ffffff', iris: '#2a2230', mouth: '#8a3e36',
  floor: ['#4e3622', '#76543a', '#8c6a4c', '#9c7a5a', '#ad8b6a'],
  board: ['#5a3f22', '#7f5c36', '#9b7a52', '#b08f66', '#c4a47a'],
  notes: ['#efe9d6', '#cfe0ea', '#f2d27a', '#f4c7d2'],
  metal: ['#2f3438', '#4d5459', '#62696f', '#7d858b', '#9aa2a8'],
  paper: '#f7f7f2', omr: '#f2a3b6', plate: '#f4f2ea', plateEdge: '#8b8f96',
  sticker: '#ffe45c', sweat: '#a9dcff', tear: '#79c4ff', blush: '#f19a8a',
  select: '#ffd84a', selectDark: '#8a6a00', flag: '#ffd84a', red: '#ff5a5a', orange: '#ff9f43', frame: '#1e1c24',
  clockFace: '#f6f3ea', clockRim: '#2a2a30', hand: '#22202a', handR: '#c0392b',
};

const DIGITS = {
  0: ['111', '101', '101', '101', '111'], 1: ['010', '110', '010', '010', '111'],
  2: ['111', '001', '111', '100', '111'], 3: ['111', '001', '111', '001', '111'],
  4: ['101', '101', '111', '001', '001'], 5: ['111', '100', '111', '001', '111'],
  6: ['111', '100', '111', '101', '111'], 7: ['111', '001', '010', '010', '010'],
  8: ['111', '101', '111', '101', '111'], 9: ['111', '101', '111', '001', '111'],
};

function px(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

function digits(ctx, str, x, y, color) {
  let cx = x;
  for (const ch of str) {
    DIGITS[ch].forEach((row, ry) => [...row].forEach((b, rx) => { if (b === '1') px(ctx, cx + rx, y + ry, 1, 1, color); }));
    cx += 4;
  }
}

export function seatPos(seat) {
  const row = Math.floor((seat - 1) / 4);
  const col = (seat - 1) % 4;
  return { x: COLS[col], desk: ROWS[row], row };
}

function drawRoom(ctx, state) {
  // 벽
  px(ctx, 0, 0, SCENE_W, 34, WALL[2]);
  px(ctx, 0, 0, SCENE_W, 3, WALL[3]);
  // 게시판
  px(ctx, 13, 5, 152, 22, C.board[0]);
  px(ctx, 14, 6, 150, 20, C.board[2]);
  px(ctx, 14, 6, 150, 1, C.board[3]);
  [[18, 9, 0], [34, 8, 1], [52, 10, 0], [68, 8, 2], [88, 9, 3], [106, 8, 1], [124, 10, 0], [142, 8, 2]].forEach(([x, y, c]) => {
    px(ctx, x + 1, y + 1, 13, 14, C.board[1]);
    px(ctx, x, y, 13, 14, C.notes[c]);
    px(ctx, x + 2, y + 3, 9, 1, '#b9bcc2');
    px(ctx, x + 2, y + 6, 7, 1, '#b9bcc2');
    px(ctx, x + 6, y - 1, 2, 2, C.red);
  });
  // 시계
  const [h, m] = clock(state);
  stamp(ctx, 195, 4, [
    '....kkkkkk....',
    '..kkffffffkk..',
    '.kffffffffffk.',
    '.kffffffffffk.',
    'kffffffffffffk',
    'kffffffffffffk',
    'kffffffffffffk',
    'kffffffffffffk',
    'kffffffffffffk',
    'kffffffffffffk',
    '.kffffffffffk.',
    '.kffffffffffk.',
    '..kkffffffkk..',
    '....kkkkkk....',
  ].map((r) => r), { k: C.clockRim, f: C.clockFace });
  const cx = 202, cy = 11;
  const ha = (((h % 12) + m / 60) / 12) * Math.PI * 2;
  const ma = (m / 60) * Math.PI * 2;
  for (let r = 0; r <= 3; r++) px(ctx, cx + Math.round(Math.sin(ha) * r), cy - Math.round(Math.cos(ha) * r), 1, 1, C.hand);
  for (let r = 0; r <= 5; r++) px(ctx, cx + Math.round(Math.sin(ma) * r), cy - Math.round(Math.cos(ma) * r), 1, 1, C.handR);
  // 사물함
  px(ctx, 0, 32, SCENE_W, 28, LOCK[2]);
  px(ctx, 0, 32, SCENE_W, 1, LOCK[0]);
  px(ctx, 0, 45, SCENE_W, 1, LOCK[1]);
  px(ctx, 0, 46, SCENE_W, 1, LOCK[3]);
  for (let x = 0; x < SCENE_W; x += 20) {
    px(ctx, x, 33, 1, 27, LOCK[0]);
    px(ctx, x + 1, 33, 1, 27, LOCK[3]);
    px(ctx, x + 15, 38, 2, 3, LOCK[4]);
    px(ctx, x + 15, 51, 2, 3, LOCK[4]);
  }
  // 바닥
  px(ctx, 0, 60, SCENE_W, SCENE_H - 60, C.floor[2]);
  px(ctx, 0, 60, SCENE_W, 2, C.floor[0]);
  for (let y = 66; y < SCENE_H; y += 9) {
    px(ctx, 0, y, SCENE_W, 1, C.floor[1]);
    px(ctx, 0, y + 1, SCENE_W, 1, C.floor[3]);
    for (let x = (y * 13) % 37; x < SCENE_W; x += 37) px(ctx, x, y + 2, 1, 7, C.floor[1]);
  }
}

function clothesRamp(look) {
  const i = LOOKS.clothes.findIndex((c) => c.body === look.clothes.body);
  return CLOTHES[i >= 0 ? i : 0];
}

// 한 줄(4명)을 엔진으로 그린다: 몸, 머리, 머리카락, 책상
function rowInfo(state, row) {
  return state.students.filter((s) => Math.floor((s.seat - 1) / 4) === row).map((s) => {
    const { x, desk } = seatPos(s.seat);
    return { s, x, desk, hy: desk - 23, off: s.seat * 977 };
  });
}

function rasterRow(ctx, state, row) {
  const r = makeRaster(SCENE_W, SCENE_H);
  const info = rowInfo(state, row);
  info.forEach(({ s, x, desk, hy }) => {
    const look = s.look;
    const skin = rampFor(SKIN, LOOKS.skin, look.skin);
    const hair = rampFor(HAIR, LOOKS.hair, look.hair);
    const cloth = clothesRamp(look);
    if (look.hairStyle === 'long') { const pb = r.part(hair); r.round(pb, x - 7, hy + 2, 14, 14, 4); }
    if (look.hairStyle === 'ponytail') { const pb = r.part(hair); r.ellipse(pb, x + 6, hy + 6, 2.5, 5); }
    const pBody = r.part(cloth);
    r.fill(pBody, x - 10, desk - 12, x + 10, desk + 1, (xx, yy) => Math.abs(xx + 0.5 - x) <= 5 + Math.min(4, (yy - (desk - 12)) * 1.2));
    const pHead = r.part(skin, { shine: true });
    r.ellipse(pHead, x, hy + 6, 5.5, 6.5);
    r.ellipse(pHead, x - 5.5, hy + 6.5, 1.5, 2);
    r.ellipse(pHead, x + 5.5, hy + 6.5, 1.5, 2);
    const pHair = r.part(hair, { shine: true });
    const capRx = look.hairStyle === 'fluffy' ? 7 : 6;
    r.fill(pHair, x - 8, hy - 3, x + 8, hy + 12, (xx, yy) => {
      const inCap = ((xx + 0.5 - x) / capRx) ** 2 + ((yy + 0.5 - (hy + 3)) / (look.hairStyle === 'buzz' ? 3.2 : 4.5)) ** 2 <= 1;
      const sides = (look.hairStyle === 'bob' || look.hairStyle === 'long') && yy <= hy + 9 && Math.abs(xx + 0.5 - x) >= 4.5 && Math.abs(xx + 0.5 - x) <= 6.5;
      return (inCap && yy <= hy + 4) || sides;
    });
    const pDesk = r.part(WOOD, { flat: false });
    r.rect(pDesk, x - 18, desk, 36, 5);
    const pFront = r.part([WOOD[0], WOOD[0], WOOD[1], WOOD[2], WOOD[2]]);
    r.rect(pFront, x - 17, desk + 5, 34, 11);
    const pHands = r.part(skin);
    r.ellipse(pHands, x - 8, desk + 1, 2.5, 1.5);
    r.ellipse(pHands, x + 8, desk + 1, 2.5, 1.5);
  });
  r.render(ctx);
}

function detailRow(ctx, state, row, o) {
  rowInfo(state, row).forEach(({ s, x, desk, hy, off }) => {
    const look = s.look;
    const skin = rampFor(SKIN, LOOKS.skin, look.skin);
    const cloth = clothesRamp(look);
    // 다리
    px(ctx, x - 16, desk + 16, 2, 8, C.metal[1]);
    px(ctx, x - 16, desk + 16, 1, 8, C.metal[3]);
    px(ctx, x + 14, desk + 16, 2, 8, C.metal[1]);
    px(ctx, x + 14, desk + 16, 1, 8, C.metal[3]);
    // 책상 위 시험지와 OMR
    px(ctx, x - 11, desk, 12, 2, C.paper);
    px(ctx, x + 3, desk, 8, 2, C.omr);
    // 옷 디테일과 스티커
    if (look.clothes.kind === 'uniform') { px(ctx, x - 1, desk - 12, 3, 3, look.clothes.trim); px(ctx, x, desk - 10, 1, 3, '#7a2030'); }
    if (look.clothes.kind === 'hoodie') { px(ctx, x - 3, desk - 12, 7, 1, cloth[1]); }
    if (s.sticker) { px(ctx, x, desk - 8, 1, 1, C.sticker); px(ctx, x, desk - 5, 1, 1, C.sticker); px(ctx, x, desk - 2, 1, 1, C.sticker); }
    // 얼굴
    const blink = (o.t + off * 3) % 4100 < 140;
    const ey = hy + 6;
    const mood = s.mood;
    if (blink || mood === 'crying') { px(ctx, x - 3, ey, 2, 1, C.iris); px(ctx, x + 2, ey, 2, 1, C.iris); }
    else if (mood === 'shocked') { px(ctx, x - 3, ey - 1, 2, 2, C.iris); px(ctx, x + 2, ey - 1, 2, 2, C.iris); }
    else { px(ctx, x - 3, ey - 1, 1, 2, C.iris); px(ctx, x + 2, ey - 1, 1, 2, C.iris); }
    if (mood === 'shocked') px(ctx, x - 1, ey + 3, 2, 2, C.mouth);
    else if (mood === 'angry' || mood === 'crying') { px(ctx, x - 1, ey + 4, 3, 1, C.mouth); }
    else px(ctx, x - 1, ey + 4, 2, 1, C.mouth);
    if (mood === 'crying') { px(ctx, x - 3, ey + 1, 1, 2, C.tear); px(ctx, x + 3, ey + 1, 1, 2, C.tear); }
    if (mood === 'angry') { px(ctx, x - 4, ey + 2, 1, 1, C.blush); px(ctx, x + 4, ey + 2, 1, 1, C.blush); }
    if (mood === 'nervous' || mood === 'shocked') stamp(ctx, x + 6, hy, ['.s', 'ss'], { s: C.sweat });
    px(ctx, x, ey + 2, 1, 1, skin[1]);
    if (look.glasses) {
      const thick = s.scheme === 'aiGlasses' && s.swapAt != null && state.period >= s.swapAt && state.phase !== 'precheck';
      const col = C.frame;
      stamp(ctx, x - 5, ey - 2, thick
        ? ['kkkk.kkkk', 'k..kkk..k', 'kkkk.kkkk']
        : ['kkkk.kkkk', 'k..k.k..k', 'kkkk.kkkk'], { k: col });
    }
    // 좌석 번호판
    const label = String(s.seat);
    const w = label.length * 4 + 3;
    const lx = x - Math.floor(w / 2);
    px(ctx, lx - 1, desk + 7, w + 2, 9, C.plateEdge);
    px(ctx, lx, desk + 8, w, 7, C.plate);
    digits(ctx, label, lx + 2, desk + 9, C.ink);
  });
}

function drawMarks(ctx, state, o) {
  state.students.forEach((s) => {
    const { x, desk } = seatPos(s.seat);
    const top = desk - 33;
    if (o.phase === 'result') {
      const c = s.scheme ? C.red : s.slip ? C.orange : null;
      if (c) stamp(ctx, x - 3, top, ['.ccccc.', 'ccc.ccc', 'ccc.ccc', 'ccc.ccc', 'ccccccc', 'ccc.ccc', '.ccccc.'], { c });
      return;
    }
    if (s.flagged) stamp(ctx, x + 7, desk - 26, ['yyyyy', 'yy.yy', 'yy.yy', 'yyyyy', 'yy.yy', 'yyyyy'], { y: C.flag });
    if (o.selected === s.seat) {
      const up = o.reduceMotion ? 0 : Math.floor(o.t / 300) % 2;
      stamp(ctx, x - 4, top - up, ['ddddddddd', 'dyyyyyyyd', '.dyyyyyd.', '..dyyyd..', '...dyd...', '....d....'], { y: C.select, d: C.selectDark });
    }
  });
}

// 정적인 부분(방, 몸, 책상)은 상태가 바뀔 때만 다시 그린다.
const cache = { sig: null, canvas: null };

function signature(state) {
  return JSON.stringify([state.room, state.period, state.phase, clock(state), state.students.map((s) => [s.look.clothes.body, s.look.hairStyle, s.look.hair, s.look.skin])]);
}

export function drawScene(ctx, state, opts = {}) {
  const o = { t: 0, selected: null, reduceMotion: false, ...opts, phase: state.phase };
  ctx.imageSmoothingEnabled = false;
  const sig = signature(state);
  if (typeof document !== 'undefined') {
    if (cache.sig !== sig) {
      cache.canvas = cache.canvas || document.createElement('canvas');
      cache.canvas.width = SCENE_W;
      cache.canvas.height = SCENE_H;
      const cc = cache.canvas.getContext('2d');
      drawRoom(cc, state);
      [2, 1, 0].forEach((row) => rasterRow(cc, state, row));
      cache.sig = sig;
    }
    ctx.drawImage(cache.canvas, 0, 0);
  } else {
    drawRoom(ctx, state);
    [2, 1, 0].forEach((row) => rasterRow(ctx, state, row));
  }
  [2, 1, 0].forEach((row) => detailRow(ctx, state, row, o));
  drawMarks(ctx, state, o);
}

export function seatAt(x, y) {
  for (const row of [0, 1, 2]) {
    for (let col = 0; col < 4; col++) {
      const seat = row * 4 + col + 1;
      const { x: sx, desk } = seatPos(seat);
      if (Math.abs(x - sx) <= 24 && y >= desk - 34 && y <= desk + 16) return seat;
    }
  }
  return null;
}
