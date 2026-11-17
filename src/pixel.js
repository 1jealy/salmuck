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

// ---------- 확대 그림 ----------
// game.js makeView()가 만든 그림 상태를 160x120 도트로 그린다. 단서는 전부 여기에 그림으로만 있다.
export const CLOSE_W = 160;
export const CLOSE_H = 120;

const Z = {
  wall: '#c9cbbd', locker: '#8a9a90', lockerLine: '#728177',
  desk: '#c79a68', deskEdge: '#9b734b', paper: '#f7f7f2', print: '#cfd2cc', pencil: '#5a5f66',
  omr: '#f3c4cf', omrDot: '#e08aa0', omrFill: '#1a1d1f',
  ink: '#1a1d1f', white: '#ffffff', sticker: '#ffe766', stickerEdge: '#d9b92e',
  button: '#2a2a2e', shine: '#c9d6e8', lens: '#7fe8ff', canal: '#8a5a44',
  pen: '#1c1c1c', penCap: '#5b5f66', penBand: '#ffffff',
  watchBand: '#3b3b40', watchFace: '#f4f1e6', digital: '#0e1a12', digit: '#5dff8a',
  card: '#ffffff', cardHead: '#4a6fa5', mole: '#4a2c1e', tear: '#6fb8ff', sweat: '#8fd0ff', blush: '#e98a8a',
  buzz: '#ffd84a', panel: '#0d1015', panelLine: '#f2efe6',
};

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.max(0, Math.min(255, Math.round(v * f))));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

function line(ctx, x0, y0, x1, y1, color) {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let i = 0; i <= steps; i++) {
    const t = steps ? i / steps : 0;
    px(ctx, Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t), 1, 1, color);
  }
}

function panel(ctx, x, y, w, h) {
  px(ctx, x, y, w, h, Z.panelLine);
  px(ctx, x + 1, y + 1, w - 2, h - 2, Z.panel);
}

function closeHair(ctx, look, back) {
  const c = look.hair;
  const style = look.hairStyle;
  if (back) {
    if (style === 'long') { px(ctx, 54, 18, 8, 48, c); px(ctx, 98, 18, 8, 48, c); }
    if (style === 'ponytail') px(ctx, 100, 18, 8, 26, c);
    return;
  }
  switch (style) {
    case 'buzz': px(ctx, 60, 12, 40, 6, c); break;
    case 'bob': px(ctx, 56, 10, 48, 12, c); px(ctx, 56, 22, 6, 26, c); px(ctx, 98, 22, 6, 26, c); px(ctx, 62, 22, 36, 4, c); break;
    case 'fluffy': px(ctx, 56, 8, 48, 14, c); px(ctx, 60, 5, 10, 3, c); px(ctx, 74, 4, 12, 4, c); px(ctx, 90, 5, 10, 3, c); px(ctx, 56, 22, 5, 8, c); px(ctx, 99, 22, 5, 8, c); break;
    case 'long': px(ctx, 58, 10, 44, 12, c); px(ctx, 58, 22, 4, 10, c); px(ctx, 98, 22, 4, 10, c); break;
    case 'ponytail': px(ctx, 58, 10, 44, 12, c); px(ctx, 58, 22, 3, 8, c); px(ctx, 99, 22, 3, 8, c); break;
    default: px(ctx, 58, 10, 44, 12, c); px(ctx, 58, 22, 4, 10, c); px(ctx, 98, 22, 4, 10, c);
  }
}

function closeFace(ctx, v) {
  const mood = v.mood;
  // 눈썹
  if (mood === 'angry') { line(ctx, 67, 26, 74, 28, Z.ink); line(ctx, 93, 26, 86, 28, Z.ink); }
  else { px(ctx, 67, 27, 7, 2, shade(v.look.hair, 1)); px(ctx, 86, 27, 7, 2, shade(v.look.hair, 1)); }
  // 눈
  if (mood === 'crying') {
    px(ctx, 68, 33, 6, 1, Z.ink); px(ctx, 86, 33, 6, 1, Z.ink);
    px(ctx, 69, 35, 2, 6, Z.tear); px(ctx, 89, 35, 2, 6, Z.tear);
  } else if (mood === 'shocked') {
    px(ctx, 68, 31, 5, 5, Z.ink); px(ctx, 87, 31, 5, 5, Z.ink); px(ctx, 69, 32, 1, 1, Z.white); px(ctx, 88, 32, 1, 1, Z.white);
  } else {
    px(ctx, 69, 31, 4, 4, Z.ink); px(ctx, 87, 31, 4, 4, Z.ink); px(ctx, 70, 32, 1, 1, Z.white); px(ctx, 88, 32, 1, 1, Z.white);
  }
  // 코
  px(ctx, 79, 38, 2, 5, shade(v.look.skin, 0.85));
  // 입
  if (mood === 'shocked') px(ctx, 77, 47, 6, 5, Z.ink);
  else if (mood === 'calm') { px(ctx, 75, 48, 1, 1, Z.ink); px(ctx, 76, 49, 8, 1, Z.ink); px(ctx, 84, 48, 1, 1, Z.ink); }
  else if (mood === 'nervous') { [0, 2, 4, 6, 8].forEach((d, i) => px(ctx, 75 + d, 48 + (i % 2), 2, 1, Z.ink)); }
  else if (mood === 'angry' || mood === 'crying') { px(ctx, 76, 50, 8, 1, Z.ink); px(ctx, 75, 51, 1, 1, Z.ink); px(ctx, 84, 51, 1, 1, Z.ink); }
  else px(ctx, 76, 49, 8, 1, Z.ink);
  if (mood === 'angry') { px(ctx, 64, 42, 4, 2, Z.blush); px(ctx, 92, 42, 4, 2, Z.blush); }
  if (mood === 'nervous' || mood === 'shocked') { px(ctx, 100, 18, 2, 2, Z.sweat); px(ctx, 99, 20, 4, 4, Z.sweat); }
  // 점 (왼쪽 눈 밑)
  if (v.faceMole) px(ctx, 68, 40, 2, 2, Z.mole);
}

function closeGlasses(ctx, g) {
  const t = g.thick ? 3 : 1;
  const frame = (x) => {
    px(ctx, x, 29, 12, t, Z.ink); px(ctx, x, 38 - t + 1, 12, t, Z.ink);
    px(ctx, x, 29, t, 10, Z.ink); px(ctx, x + 12 - t, 29, t, 10, Z.ink);
  };
  frame(65);
  frame(83);
  px(ctx, 77, 31, 6, 1, Z.ink);
  px(ctx, 60, 31, 5, t, Z.ink);
  px(ctx, 95, 31, 5, t, Z.ink);
  if (g.glint) { px(ctx, 93, 29, 2, 2, Z.button); px(ctx, 94, 29, 1, 1, Z.lens); }
}

function closeWatch(ctx, w, x, y) {
  px(ctx, x - 1, y + 2, 13, 6, Z.watchBand);
  if (w.type === 'digital') {
    px(ctx, x, y, 11, 10, Z.ink);
    px(ctx, x + 1, y + 1, 9, 8, Z.digital);
    px(ctx, x + 2, y + 3, 2, 4, Z.digit); px(ctx, x + 5, y + 3, 1, 1, Z.digit); px(ctx, x + 5, y + 5, 1, 1, Z.digit); px(ctx, x + 7, y + 3, 2, 4, Z.digit);
    return;
  }
  px(ctx, x, y, 11, 11, Z.ink);
  px(ctx, x + 1, y + 1, 9, 9, Z.watchFace);
  const cx = x + 5, cy = y + 5;
  [0, 3, 6, 9].forEach((k) => {
    const a = (k / 12) * Math.PI * 2;
    px(ctx, cx + Math.round(Math.sin(a) * 4), cy - Math.round(Math.cos(a) * 4), 1, 1, Z.print);
  });
  const ma = (w.m / 60) * Math.PI * 2;
  const ha = (((w.h % 12) + w.m / 60) / 12) * Math.PI * 2;
  for (let r = 0; r <= 4; r++) px(ctx, cx + Math.round(Math.sin(ma) * r), cy - Math.round(Math.cos(ma) * r), 1, 1, Z.ink);
  for (let r = 0; r <= 2; r++) px(ctx, cx + Math.round(Math.sin(ha) * r), cy - Math.round(Math.cos(ha) * r), 1, 1, '#c0392b');
}

function closePen(ctx, fake, x, y, vertical) {
  if (vertical) {
    px(ctx, x, y, 3, 20, Z.pen);
    px(ctx, x, y, 3, 6, Z.penCap);
    if (!fake) px(ctx, x, y + 6, 3, 2, Z.penBand);
    else { px(ctx, x + 1, y, 1, 1, Z.lens); }
    return;
  }
  px(ctx, x, y, 22, 3, Z.pen);
  px(ctx, x + 16, y, 6, 3, Z.penCap);
  if (!fake) px(ctx, x + 14, y, 2, 3, Z.penBand);
  else px(ctx, x + 21, y + 1, 1, 1, Z.lens);
}

function idInset(ctx, v) {
  panel(ctx, 3, 3, 38, 50);
  px(ctx, 5, 5, 34, 46, Z.card);
  px(ctx, 5, 5, 34, 5, Z.cardHead);
  // 사진
  const x = 11, y = 13;
  px(ctx, x, y, 22, 28, '#dde3ea');
  px(ctx, x + 5, y + 6, 12, 14, v.look.skin);
  px(ctx, x + 4, y + 3, 14, 5, v.look.hair);
  px(ctx, x + 7, y + 11, 2, 2, Z.ink); px(ctx, x + 13, y + 11, 2, 2, Z.ink);
  px(ctx, x + 9, y + 16, 4, 1, Z.ink);
  px(ctx, x + 3, y + 21, 16, 7, v.look.clothes.body);
  if (v.idPhoto.mole) px(ctx, x + 7, y + 14, 2, 2, Z.mole);
  px(ctx, 8, 44, 28, 2, Z.print); px(ctx, 8, 48, 18, 1, Z.print);
}

function glassesInset(ctx, v) {
  panel(ctx, 116, 3, 41, 24);
  const t = v.glasses.thick ? 3 : 1;
  const frame = (x) => {
    px(ctx, x, 9, 14, t, Z.white); px(ctx, x, 19 - t + 1, 14, t, Z.white);
    px(ctx, x, 9, t, 11, Z.white); px(ctx, x + 14 - t, 9, t, 11, Z.white);
  };
  frame(119);
  frame(139);
  px(ctx, 133, 11, 6, 1, Z.white);
  if (v.glasses.glint) px(ctx, 151, 9, 2, 2, Z.lens);
}

function pocketsInset(ctx, v) {
  panel(ctx, 116, 3, 41, 30);
  px(ctx, 120, 8, 12, 8, Z.card);
  px(ctx, 120, 8, 12, 2, Z.cardHead);
  px(ctx, 135, 9, 18, 2, Z.pen);
  px(ctx, 135, 13, 18, 2, Z.pen);
  v.pockets.forEach((item) => {
    if (item === 'phone') { px(ctx, 121, 18, 9, 13, Z.ink); px(ctx, 122, 19, 7, 10, '#3a4a6a'); }
    else { px(ctx, 136, 21, 12, 8, Z.white); px(ctx, 136, 24, 12, 1, Z.print); }
  });
}

export function drawCloseup(ctx, v) {
  ctx.imageSmoothingEnabled = false;
  const look = v.look;
  const cl = look.clothes;
  // 배경
  px(ctx, 0, 0, CLOSE_W, 64, Z.wall);
  px(ctx, 0, 52, CLOSE_W, 44, Z.locker);
  for (let x = 0; x < CLOSE_W; x += 26) px(ctx, x, 52, 1, 44, Z.lockerLine);

  closeHair(ctx, look, true);

  // 몸
  const sleeveCol = cl.body;
  px(ctx, 42, 64, 76, 34, cl.body);
  px(ctx, 38, 68, 4, 30, cl.body);
  px(ctx, 118, 68, 4, 30, cl.body);
  if (v.waist) { px(ctx, 118, 84, 7, 12, cl.body); px(ctx, 119, 85, 5, 1, shade(cl.body, 1.25)); }
  if (v.buzz) { [[127, 86], [129, 85], [131, 86], [127, 90], [129, 89], [131, 90]].forEach(([x, y]) => px(ctx, x, y, 2, 1, Z.buzz)); }
  if (cl.kind === 'uniform') { px(ctx, 72, 64, 16, 12, cl.trim); line(ctx, 72, 64, 79, 78, shade(cl.body, 0.7)); line(ctx, 88, 64, 81, 78, shade(cl.body, 0.7)); }
  else if (cl.kind === 'shirt') { px(ctx, 79, 64, 2, 34, shade(cl.body, 0.85)); line(ctx, 72, 64, 79, 70, cl.trim); line(ctx, 88, 64, 81, 70, cl.trim); }
  else if (cl.kind === 'hoodie') { px(ctx, 66, 64, 28, 4, cl.trim); px(ctx, 72, 68, 1, 10, Z.white); px(ctx, 87, 68, 1, 10, Z.white); }
  else { [74, 82, 90].forEach((y) => px(ctx, 42, y, 76, 1, cl.trim)); }
  if (v.pocketBulge) {
    const w = v.pocketBulge === 'phone' ? 11 : 7;
    const h = v.pocketBulge === 'phone' ? 12 : 6;
    px(ctx, 46, 82, w, h, shade(cl.body, 0.75));
    px(ctx, 46, 82, w, 1, shade(cl.body, 1.3));
  }
  // 단추와 스티커
  [70, 77, 84, 91].forEach((y, i) => {
    const big = v.bigButton && i === 1;
    const size = big ? 6 : 3;
    const bx = 80 - Math.floor(size / 2);
    px(ctx, bx, y - Math.floor(size / 2), size, size, Z.button);
    if (big) px(ctx, bx + 1, y - 2, 2, 1, Z.shine);
    const missing = v.sticker === 'missing' && i === 1;
    if (v.sticker !== 'none' && !missing) {
      px(ctx, 78, y - 2, 5, 5, Z.sticker);
      px(ctx, 78, y + 2, 5, 1, Z.stickerEdge);
      if (v.sticker === 'peeled' && i === 2) { px(ctx, 82, y - 2, 1, 2, Z.white); px(ctx, 81, y - 2, 1, 1, Z.white); }
    }
  });

  // 목, 머리, 귀
  px(ctx, 72, 56, 16, 10, shade(look.skin, 0.92));
  px(ctx, 60, 14, 40, 44, look.skin);
  px(ctx, 62, 58, 36, 2, look.skin);
  px(ctx, 53, 29, 8, 17, look.skin);
  px(ctx, 99, 29, 8, 17, look.skin);
  px(ctx, 53, 29, 1, 17, shade(look.skin, 0.85));
  px(ctx, 106, 29, 1, 17, shade(look.skin, 0.85));
  px(ctx, 55, 33, 3, 8, shade(look.skin, 0.8));
  px(ctx, 102, 33, 3, 8, Z.canal);
  if (v.earBlob) { px(ctx, 102, 35, 3, 4, '#f6d2b0'); px(ctx, 102, 35, 1, 1, Z.white); }
  closeHair(ctx, look, false);
  closeFace(ctx, v);
  if (v.glasses && !v.glasses.off) closeGlasses(ctx, v.glasses);

  // 책상
  px(ctx, 0, 96, CLOSE_W, 24, Z.desk);
  px(ctx, 0, 96, CLOSE_W, 1, Z.deskEdge);
  if (v.paper !== 'none') {
    px(ctx, 46, 99, 44, 19, Z.paper);
    for (let y = 101; y < 117; y += 3) px(ctx, 49, y, 34, 1, Z.print);
    if (v.paper === 'scribbled') {
      [[52, 102, 66, 106], [70, 103, 84, 101], [55, 109, 61, 114], [64, 112, 80, 110], [73, 115, 86, 114]].forEach(([a, b, c, d]) => line(ctx, a, b, c, d, Z.pencil));
      px(ctx, 50, 104, 3, 3, Z.pencil);
    }
    px(ctx, 118, 99, 38, 19, Z.omr);
    const filled = Math.round(v.omr * 20);
    let k = 0;
    for (let col = 0; col < 4; col++) {
      for (let row = 0; row < 5; row++) {
        const x = 121 + col * 9;
        const y = 101 + row * 3;
        px(ctx, x, y, 2, 2, Z.omrDot);
        if (k < filled) px(ctx, x + 3 + ((k * 7) % 3) * 1, y, 2, 2, Z.omrFill);
        k++;
      }
    }
  }
  // 수험표(작게)
  px(ctx, 6, 101, 18, 13, Z.card);
  px(ctx, 6, 101, 18, 3, Z.cardHead);
  px(ctx, 8, 105, 6, 7, '#dde3ea');

  // 팔과 손
  const sleeveUpY = 86;
  const arm = (x, w, handX) => {
    px(ctx, x, 70, w, 30, sleeveCol);
    if (v.sleeves) { px(ctx, x, sleeveUpY, w, 14, shade(look.skin, 0.95)); px(ctx, x - 1, sleeveUpY - 2, w + 2, 3, shade(sleeveCol, 0.8)); }
    px(ctx, handX, 98, 11, 6, look.skin);
  };
  arm(30, 12, 32);
  const pose = v.pose;
  if (pose === 'glasses' || pose === 'ear') {
    const hy = pose === 'glasses' ? 27 : 32;
    const hx = pose === 'glasses' ? 92 : 98;
    px(ctx, 108, 40, 10, 58, sleeveCol);
    line(ctx, 112, 40, hx + 4, hy + 6, sleeveCol);
    px(ctx, hx + 2, hy + 4, 10, 12, sleeveCol);
    px(ctx, hx, hy, 9, 9, look.skin);
  } else if (pose === 'belly') {
    px(ctx, 118, 70, 12, 30, sleeveCol);
    px(ctx, 112, 98, 11, 6, look.skin);
    px(ctx, 42, 84, 22, 8, sleeveCol);
    px(ctx, 62, 83, 10, 9, look.skin);
  } else {
    arm(118, 12, 114);
  }
  if (pose === 'tap') { px(ctx, 112, 95, 2, 3, look.skin); px(ctx, 116, 95, 2, 3, look.skin); px(ctx, 113, 91, 1, 2, Z.ink); px(ctx, 117, 90, 1, 2, Z.ink); }
  if (v.watch) closeWatch(ctx, v.watch, 31, 87);
  if (v.paper !== 'none') {
    if (pose === 'penUp') closePen(ctx, v.fakePen, 117, 78, true);
    else closePen(ctx, v.fakePen, 90, 112, false);
  }

  // 확대 창
  if (v.idPhoto) idInset(ctx, v);
  if (v.glasses && v.glasses.off) glassesInset(ctx, v);
  else if (v.pockets) pocketsInset(ctx, v);
}
