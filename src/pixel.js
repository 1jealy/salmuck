// 도트 시험실: 교탁에서 본 12명 (3줄 x 4칸). 이미지 파일 없이 사각형으로 그린다.
import { SCHEMES } from './data.js';
import { clock } from './game.js';

export const SCENE_W = 240;
export const SCENE_H = 204;
const COLS = [36, 92, 148, 204];
const ROWS = [178, 134, 90]; // 책상 윗면 y: 앞줄(1~4), 가운데(5~8), 뒷줄(9~12)

const C = {
  wall: '#c9cbbd', wallDark: '#b4b7a6', locker: '#7f8f86', lockerLine: '#65746c', handle: '#d9dccf',
  board: '#9b7a52', note: '#efe9d6', noteB: '#cfe0ea', noteC: '#f2d27a',
  floor: '#8c6c4c', floorLine: '#7a5b3e',
  deskTop: '#c79a68', deskFront: '#a27850', deskEdge: '#7d5a37', metal: '#596066',
  paper: '#f6f6f1', omr: '#e0607d', ink: '#1a1d1f', plate: '#eef0ea',
  sticker: '#fff3a6', sweat: '#8fd0ff', tear: '#6fb8ff', blush: '#e98a8a',
  select: '#ffd84a', flag: '#ffd84a', red: '#ff5a5a', orange: '#ff9f43', green: '#5fd38d',
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
    const g = DIGITS[ch];
    g.forEach((row, ry) => [...row].forEach((b, rx) => { if (b === '1') px(ctx, cx + rx, y + ry, 1, 1, color); }));
    cx += 4;
  }
}

export function seatPos(seat) {
  const row = Math.floor((seat - 1) / 4);
  const col = (seat - 1) % 4;
  return { x: COLS[col], desk: ROWS[row], row };
}

function drawRoom(ctx, state) {
  px(ctx, 0, 0, SCENE_W, 60, C.wall);
  // 게시판과 공지
  px(ctx, 14, 6, 150, 20, C.board);
  [[18, 9, C.note], [34, 8, C.noteB], [52, 10, C.note], [70, 8, C.noteC], [92, 9, C.note], [110, 8, C.noteB], [130, 10, C.note], [146, 8, C.noteC]]
    .forEach(([x, y, c]) => px(ctx, x, y, 12, 14, c));
  // 시계
  const [h, m] = clock(state);
  px(ctx, 196, 4, 24, 24, C.ink);
  px(ctx, 198, 6, 20, 20, C.plate);
  const cx = 208, cy = 16;
  const ha = (((h % 12) + m / 60) / 12) * Math.PI * 2;
  const ma = (m / 60) * Math.PI * 2;
  for (let r = 0; r <= 5; r++) px(ctx, cx + Math.round(Math.sin(ha) * r), cy - Math.round(Math.cos(ha) * r), 1, 1, C.ink);
  for (let r = 0; r <= 8; r++) px(ctx, cx + Math.round(Math.sin(ma) * r), cy - Math.round(Math.cos(ma) * r), 1, 1, C.red);
  // 사물함
  px(ctx, 0, 32, SCENE_W, 28, C.locker);
  for (let x = 0; x < SCENE_W; x += 20) {
    px(ctx, x, 32, 1, 28, C.lockerLine);
    px(ctx, x + 15, 44, 2, 4, C.handle);
  }
  px(ctx, 0, 45, SCENE_W, 1, C.lockerLine);
  // 바닥
  px(ctx, 0, 60, SCENE_W, SCENE_H - 60, C.floor);
  for (let y = 66; y < SCENE_H; y += 9) px(ctx, 0, y, SCENE_W, 1, C.floorLine);
}

function hair(ctx, x, y, look, back) {
  const c = look.hair;
  switch (look.hairStyle) {
    case 'buzz': if (!back) px(ctx, x - 5, y - 1, 10, 2, c); break;
    case 'long':
      if (back) px(ctx, x - 6, y, 12, 14, c);
      else { px(ctx, x - 5, y - 1, 10, 4, c); px(ctx, x - 6, y + 1, 2, 9, c); px(ctx, x + 4, y + 1, 2, 9, c); }
      break;
    case 'ponytail':
      if (back) px(ctx, x + 4, y + 2, 3, 8, c);
      else { px(ctx, x - 5, y - 1, 10, 4, c); px(ctx, x - 6, y + 1, 1, 4, c); px(ctx, x + 5, y + 1, 1, 4, c); }
      break;
    case 'bob':
      if (!back) { px(ctx, x - 6, y - 1, 12, 4, c); px(ctx, x - 6, y + 3, 2, 5, c); px(ctx, x + 4, y + 3, 2, 5, c); }
      break;
    case 'fluffy':
      if (!back) { px(ctx, x - 6, y - 2, 12, 5, c); px(ctx, x - 4, y - 3, 3, 1, c); px(ctx, x + 1, y - 3, 3, 1, c); }
      break;
    default:
      if (!back) { px(ctx, x - 5, y - 1, 10, 4, c); px(ctx, x - 5, y + 3, 1, 2, c); px(ctx, x + 4, y + 3, 1, 2, c); }
  }
}

function face(ctx, x, y, s, blink, thickGlasses) {
  const ey = y + 5;
  const mood = s.mood;
  if (mood === 'shocked') {
    px(ctx, x - 3, ey - 1, 2, 2, C.ink); px(ctx, x + 2, ey - 1, 2, 2, C.ink); px(ctx, x - 1, y + 8, 2, 2, C.ink);
  } else {
    if (blink || mood === 'crying') { px(ctx, x - 3, ey, 2, 1, C.ink); px(ctx, x + 2, ey, 2, 1, C.ink); }
    else { px(ctx, x - 3, ey - 1, 1, 2, C.ink); px(ctx, x + 2, ey - 1, 1, 2, C.ink); }
    if (mood === 'angry') { px(ctx, x - 4, ey - 3, 2, 1, C.ink); px(ctx, x + 3, ey - 3, 2, 1, C.ink); px(ctx, x - 1, y + 9, 3, 1, C.ink); }
    else if (mood === 'calm') { px(ctx, x - 2, y + 8, 1, 1, C.ink); px(ctx, x - 1, y + 9, 3, 1, C.ink); px(ctx, x + 2, y + 8, 1, 1, C.ink); }
    else if (mood === 'nervous') { px(ctx, x - 2, y + 9, 1, 1, C.ink); px(ctx, x - 1, y + 8, 1, 1, C.ink); px(ctx, x, y + 9, 1, 1, C.ink); px(ctx, x + 1, y + 8, 1, 1, C.ink); }
    else px(ctx, x - 1, y + 9, 3, 1, C.ink);
    if (mood === 'crying') { px(ctx, x - 3, ey + 1, 1, 3, C.tear); px(ctx, x + 3, ey + 1, 1, 3, C.tear); }
    if (mood === 'angry') { px(ctx, x - 5, y + 7, 1, 1, C.blush); px(ctx, x + 5, y + 7, 1, 1, C.blush); }
  }
  if (s.look.glasses) {
    const t = thickGlasses ? 2 : 1;
    px(ctx, x - 5, ey - 2, 5, t, C.ink); px(ctx, x + 1, ey - 2, 5, t, C.ink);
    px(ctx, x - 5, ey + 1, 5, 1, C.ink); px(ctx, x + 1, ey + 1, 5, 1, C.ink);
    px(ctx, x - 5, ey - 2, t, 4, C.ink); px(ctx, x + 5 - (t - 1), ey - 2, t, 4, C.ink);
    px(ctx, x, ey - 1, 1, 1, C.ink);
    if (thickGlasses) { px(ctx, x - 7, ey - 1, 2, 2, C.ink); px(ctx, x + 6, ey - 1, 2, 2, C.ink); }
  }
}

function drawStudent(ctx, state, s, o) {
  const { x, desk } = seatPos(s.seat);
  const t = o.t;
  const off = s.seat * 977;
  const blink = (t + off * 3) % 4100 < 140;
  const bob = !o.reduceMotion && (t + off) % 2900 < 160 ? 1 : 0;
  const headY = desk - 23 + bob;
  const cl = s.look.clothes;
  const thick = s.scheme === 'aiGlasses' && state.period > SCHEMES.aiGlasses.swapAfter && !['precheck'].includes(state.phase);

  // 몸
  px(ctx, x - 7, desk - 11, 14, 11, cl.body);
  if (cl.kind === 'uniform') { px(ctx, x - 2, desk - 11, 4, 3, cl.trim); }
  else if (cl.kind === 'hoodie') { px(ctx, x - 4, desk - 11, 8, 2, cl.trim); }
  else if (cl.kind === 'shirt') { px(ctx, x - 1, desk - 11, 2, 1, cl.trim); px(ctx, x, desk - 10, 1, 9, cl.trim); }
  else { px(ctx, x - 7, desk - 7, 14, 1, cl.trim); }
  if (s.sticker) { px(ctx, x - 1, desk - 8, 2, 2, C.sticker); px(ctx, x - 1, desk - 4, 2, 2, C.sticker); }
  // 머리
  hair(ctx, x, headY, s.look, true);
  px(ctx, x - 4, headY, 8, 11, s.look.skin);
  px(ctx, x - 5, headY + 2, 1, 6, s.look.skin);
  px(ctx, x + 4, headY + 2, 1, 6, s.look.skin);
  hair(ctx, x, headY, s.look, false);
  face(ctx, x, headY, s, blink, thick);
  if (s.mood === 'nervous' || s.mood === 'shocked') { px(ctx, x + 6, headY + 1, 1, 1, C.sweat); px(ctx, x + 5, headY + 2, 3, 2, C.sweat); }

  // 책상
  px(ctx, x - 18, desk, 36, 4, C.deskTop);
  px(ctx, x - 10, desk - 1, 12, 2, C.paper);
  px(ctx, x + 4, desk - 1, 7, 2, C.omr);
  px(ctx, x - 9, desk - 1, 3, 2, s.look.skin);
  px(ctx, x + 6, desk - 1, 3, 2, s.look.skin);
  px(ctx, x - 18, desk + 4, 36, 1, C.deskEdge);
  px(ctx, x - 17, desk + 5, 34, 11, C.deskFront);
  px(ctx, x - 16, desk + 16, 2, 8, C.metal);
  px(ctx, x + 14, desk + 16, 2, 8, C.metal);
  const label = String(s.seat);
  const w = label.length * 4 + 3;
  px(ctx, x - Math.floor(w / 2), desk + 6, w, 8, C.plate);
  digits(ctx, label, x - Math.floor(w / 2) + 2, desk + 7, C.ink);

  // 표시
  const top = headY - 9;
  if (o.phase === 'result') {
    const c = s.scheme ? C.red : s.slip ? C.orange : null;
    if (c) { px(ctx, x - 3, top - 1, 7, 7, c); px(ctx, x, top, 1, 3, C.plate); px(ctx, x, top + 4, 1, 1, C.plate); }
  } else {
    if (s.flagged) { px(ctx, x + 7, headY - 2, 5, 7, C.flag); px(ctx, x + 9, headY - 1, 1, 3, C.ink); px(ctx, x + 9, headY + 3, 1, 1, C.ink); }
    if (o.selected === s.seat) {
      const up = o.reduceMotion ? 0 : Math.floor(t / 300) % 2;
      px(ctx, x - 3, top - up, 7, 1, C.select); px(ctx, x - 2, top + 1 - up, 5, 1, C.select);
      px(ctx, x - 1, top + 2 - up, 3, 1, C.select); px(ctx, x, top + 3 - up, 1, 1, C.select);
    }
  }
}

export function drawScene(ctx, state, opts = {}) {
  const o = { t: 0, selected: null, reduceMotion: false, ...opts, phase: state.phase };
  ctx.imageSmoothingEnabled = false;
  drawRoom(ctx, state);
  // 뒷줄부터 그려서 앞줄이 위에 오게
  [2, 1, 0].forEach((row) => {
    state.students.filter((s) => Math.floor((s.seat - 1) / 4) === row).forEach((s) => drawStudent(ctx, state, s, o));
  });
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
