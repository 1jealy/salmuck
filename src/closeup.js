// 확대 그림(160x120) 2판: 도형으로 부위를 채우고, 엔진이 외곽선과 명암을 자동으로 넣는다.
// 빛은 왼쪽 위에서 온다. 외곽선은 검정 대신 각 부위의 가장 어두운 색(셀아웃)을 쓴다.
// 그림 상태(view)는 game.js makeView()가 만든다. 단서는 전부 이 그림 안에 있다.
import { LOOKS } from './data.js';

export const CLOSE_W = 160;
export const CLOSE_H = 120;

// ---------- 팔레트: [외곽선, 그림자, 중간, 밝음, 하이라이트] ----------
const SKIN = [
  ['#7a4632', '#d99a7a', '#f2c4a2', '#fbd9bc', '#fff0e0'],
  ['#6e3e2a', '#c98a64', '#e8b48c', '#f4c9a3', '#ffe3c8'],
  ['#5e3324', '#b07450', '#d49e74', '#e4b58b', '#f6d2ae'],
  ['#4a281c', '#8f5a3c', '#b97f58', '#cc976d', '#e6b890'],
];
const HAIR = [
  ['#08070c', '#16131c', '#24202c', '#383246', '#544b68'],
  ['#0e0806', '#261813', '#3a2820', '#563c30', '#735244'],
  ['#140b07', '#331f15', '#4c3020', '#6c4630', '#8e6044'],
  ['#180d08', '#3f2517', '#5c3825', '#7e5034', '#a06a46'],
];
const CLOTHES = [
  ['#10132a', '#1f2a4a', '#2b3a5e', '#3d5080', '#566c9c'],
  ['#240f18', '#4a202e', '#6b2f3b', '#8a404f', '#a85a68'],
  ['#2a2c33', '#5a5f68', '#757b84', '#9298a1', '#b3b8c0'],
  ['#131f19', '#2b4136', '#3e5a4b', '#527461', '#6c917c'],
  ['#0a0a0e', '#1a1a20', '#28282e', '#3a3a43', '#52525c'],
  ['#4a4234', '#857a66', '#a59a86', '#bfb5a1', '#d8d0be'],
  ['#6a6e7a', '#b8bcc6', '#dedcd4', '#efede6', '#ffffff'],
  ['#2a3a58', '#7890b4', '#9cb3d4', '#b9cbe5', '#dbe5f3'],
];
const WOOD = ['#4a2e1a', '#9b6f45', '#c49464', '#d8ae80', '#ecca9e'];
const WALL = ['#9da196', '#c4c7ba', '#d4d6ca', '#e0e2d7', '#eceee4'];
const LOCK = ['#4f5c55', '#6e7d74', '#84948a', '#9aa99f', '#b6c3ba'];
export { SKIN, HAIR, CLOTHES, WOOD, WALL, LOCK, makeRaster, rampFor, stamp };

const C = {
  ink: '#1b1820', white: '#ffffff', iris: '#2a2230', mouth: '#8a3e36', lip: '#c86a5c', blush: '#f19a8a',
  tear: '#79c4ff', sweat: '#a9dcff', mole: '#5a3020',
  frame: '#1e1c24', lensHi: '#d8eef6', lens: '#7fe8ff', camera: '#25252c',
  stickerOut: '#c9bd8e', sticker: '#f3ecc8', stickerHi: '#fffbe8', stickerBack: '#ffffff',
  button: '#1c1c22', buttonHi: '#5c5c68', shine: '#c9e4ff',
  paper: '#f7f7f2', paperEdge: '#c9cbc2', print: '#c6cad0', pencil: '#4f5965',
  omr: '#f6cdd7', omrLine: '#e48aa2', omrEdge: '#c96f86', mark: '#1a1a20',
  pen: '#1c1c22', penHi: '#4b4b55', cap: '#6c707a', capHi: '#9599a3', band: '#ffffff',
  card: '#ffffff', cardHead: '#4a6fa5', cardEdge: '#a7b0bc', photoBg: '#dfe6ee',
  strap: '#2e2c33', strapHi: '#4a4852', bezel: '#b9bec8', face: '#f6f3ea', tick: '#9aa0aa', hand: '#22202a', handR: '#c0392b',
  lcd: '#0e1a12', seg: '#5dff8a',
  canal: '#6e3a2a', blob: '#f4d2b2', buzz: '#ffd84a',
  phone: '#16161c', screen: '#34486e', bud: '#f2f2f2', budEdge: '#9aa0a8',
  panel: '#0d1015', panelLine: '#f2efe6', tie: '#7a2030', tieHi: '#a33a4a',
};

function rampFor(list, colors, hex) {
  const i = colors.indexOf(hex);
  return list[i >= 0 ? i : 0];
}

// ---------- 엔진 ----------
function makeRaster(w, h) {
  const id = new Int16Array(w * h).fill(-1);
  const parts = [];
  const r = {
    part(ramp, opts = {}) { parts.push({ ramp, ...opts }); return parts.length - 1; },
    set(x, y, p) { if (x >= 0 && y >= 0 && x < w && y < h) id[y * w + x] = p; },
    get(x, y) { return x >= 0 && y >= 0 && x < w && y < h ? id[y * w + x] : -1; },
    fill(p, x0, y0, x1, y1, test) {
      for (let y = Math.max(0, y0); y <= Math.min(h - 1, y1); y++) {
        for (let x = Math.max(0, x0); x <= Math.min(w - 1, x1); x++) if (test(x, y)) r.set(x, y, p);
      }
    },
    ellipse(p, cx, cy, rx, ry) {
      r.fill(p, Math.floor(cx - rx), Math.floor(cy - ry), Math.ceil(cx + rx), Math.ceil(cy + ry),
        (x, y) => ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1);
    },
    rect(p, x, y, ww, hh) { r.fill(p, x, y, x + ww - 1, y + hh - 1, () => true); },
    round(p, x, y, ww, hh, rad) {
      r.fill(p, x, y, x + ww - 1, y + hh - 1, (px, py) => {
        const dx = Math.max(x + rad - px - 0.5, 0, px + 0.5 - (x + ww - rad));
        const dy = Math.max(y + rad - py - 0.5, 0, py + 0.5 - (y + hh - rad));
        return dx * dx + dy * dy <= rad * rad;
      });
    },
    clear(x0, y0, x1, y1, test) { r.fill(-1, x0, y0, x1, y1, test); },
    render(ctx) {
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const p = id[y * w + x];
          if (p < 0) continue;
          const part = parts[p];
          const ramp = part.ramp;
          const inside = (xx, yy) => r.get(xx, yy) === p;
          const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
            const n = r.get(x + dx, y + dy);
            return n !== p && (n < 0 || n < p);
          });
          let c;
          if (edge && !part.noOutline) c = ramp[0];
          else if (part.flat) c = ramp[2];
          else {
            const shadow = !inside(x + 2, y) || !inside(x, y + 2) || !inside(x + 3, y + 2);
            const lit = !inside(x - 1, y) || !inside(x, y - 1);
            const hi = part.shine && !inside(x - 2, y - 1) && inside(x + 1, y + 1);
            c = shadow ? ramp[1] : hi ? ramp[4] : lit ? ramp[3] : ramp[2];
          }
          if (typeof ctx === 'function') ctx(x, y, c);
          else { ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1); }
        }
      }
    },
  };
  return r;
}

function px(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

// 글자 지도로 작은 그림 찍기. 각 글자는 colors의 키, '.'은 투명.
function stamp(ctx, x, y, rows, colors) {
  rows.forEach((row, ry) => [...row].forEach((ch, rx) => { if (ch !== '.' && colors[ch]) px(ctx, x + rx, y + ry, 1, 1, colors[ch]); }));
}

function line(ctx, x0, y0, x1, y1, color) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let i = 0; i <= n; i++) {
    const t = n ? i / n : 0;
    px(ctx, Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t), 1, 1, color);
  }
}

// ---------- 배경 ----------
function background(ctx) {
  for (let y = 0; y < 52; y++) px(ctx, 0, y, CLOSE_W, 1, y < 8 ? WALL[3] : WALL[2]);
  px(ctx, 0, 50, CLOSE_W, 2, WALL[1]);
  px(ctx, 0, 52, CLOSE_W, 44, LOCK[2]);
  for (let x = 0; x < CLOSE_W; x += 27) {
    px(ctx, x, 52, 1, 44, LOCK[0]);
    px(ctx, x + 1, 52, 1, 44, LOCK[3]);
    px(ctx, x + 21, 66, 2, 6, LOCK[4]);
    px(ctx, x + 21, 72, 2, 1, LOCK[1]);
  }
  px(ctx, 0, 52, CLOSE_W, 1, LOCK[0]);
  px(ctx, 0, 73, CLOSE_W, 1, LOCK[1]);
}

// ---------- 머리카락 ----------
// 귀를 덮는 머리 모양: 이때는 귀를 그리지 않고 옆머리가 귀 자리를 덮는다.
export const EARS_HIDDEN = ['bob', 'long'];

function hairBack(r, p, style) {
  if (style === 'long') { r.round(p, 53, 22, 14, 50, 6); r.round(p, 93, 22, 14, 50, 6); }
  if (style === 'ponytail') { r.ellipse(p, 103, 32, 5, 10); r.ellipse(p, 105, 44, 3.5, 8); }
  if (style === 'bob') { r.round(p, 54, 24, 52, 28, 10); }
}

function hairFront(r, p, style) {
  // 머리 윗부분(모자 모양)에서 얼굴 창을 뺀 영역만 칠한다.
  const ell = (cx, cy, rx, ry) => (x, y) => ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1;
  const cap = (test, faceTop) => r.fill(p, 50, 0, 110, 60, (x, y) => test(x, y) && !(y >= faceTop && x > 60 && x < 100));
  const fringe = (y0, depth) => {
    r.fill(p, 61, y0, 99, y0 + depth, (x, y) => {
      const tooth = (Math.floor((x + 1) / 3) % 2) * 2;
      return y <= y0 + depth - tooth && ell(80, 30, 20, 20)(x, y);
    });
  };
  switch (style) {
    case 'buzz':
      cap(ell(80, 27, 20.5, 17), 20);
      break;
    case 'fluffy': {
      const base = ell(80, 25, 23, 17);
      const puffs = [[64, 12, 6], [74, 9, 7], [86, 9, 7], [96, 12, 6], [59, 22, 5], [101, 22, 5]].map(([cx, cy, rr]) => ell(cx, cy, rr, rr - 1));
      cap((x, y) => base(x, y) || puffs.some((f) => f(x, y)), 22);
      fringe(21, 5);
      break;
    }
    case 'bob':
    case 'long': {
      // 얼굴을 감싸는 하나의 매끄러운 덩어리: 바깥 타원에서 얼굴 창(턱선을 따라가는 타원)을 뺀다
      const outer = ell(80, 31, 23, style === 'bob' ? 21 : 24);
      const faceWin = (x, y) => y >= 22 && ((x + 0.5 - 80) / 18.5) ** 2 + ((y + 0.5 - 37) / 21) ** 2 <= 1;
      const bottom = style === 'bob' ? 49 : 54;
      r.fill(p, 54, 6, 106, bottom, (x, y) => outer(x, y) && !faceWin(x, y) && y <= bottom);
      fringe(21, 6);
      break;
    }
    case 'ponytail':
      cap(ell(80, 26, 22, 17), 22);
      fringe(21, 6);
      r.round(p, 59, 22, 3, 10, 1);
      r.round(p, 98, 22, 3, 10, 1);
      break;
    default:
      cap(ell(80, 26, 21, 16), 21);
      fringe(20, 5);
      r.rect(p, 59, 22, 3, 9);
      r.rect(p, 98, 22, 3, 9);
  }
}

// ---------- 얼굴 ----------
// 학생마다 다른 눈·눈썹·입·코 (look.face). 왼쪽 눈 기준이고 오른쪽은 좌우를 뒤집는다.
const EYES = {
  round: ['.kkk.', 'kkwkk', 'kkkkk', '.kkk.'],
  narrow: ['.kkkk.', 'kkwkkk', '..kk..'],
  droopy: ['kkkk.', 'kkwkk', '.kkkk'],
  sharp: ['..kkk', 'kkwkk', 'kkk..'],
};
const EYE_MOOD = {
  shocked: ['.kkk.', 'kwkkk', 'kkkkk', 'kkkkk', '.kkk.'],
  closed: ['.....', 'kkkkk', '.k.k.'],
};
const flip = (rows) => rows.map((r) => [...r].reverse().join(''));

function face(ctx, v, skin, hair) {
  const mood = v.mood;
  const f = v.look.face || { eye: 'round', brow: 'straight', mouth: 'normal', nose: 'small', tilt: 0 };
  const eye = mood === 'shocked' ? EYE_MOOD.shocked : mood === 'crying' ? EYE_MOOD.closed : EYES[f.eye];
  const col = { k: C.iris, w: C.white };
  const ey = 31 - (eye.length > 3 ? 1 : 0);
  stamp(ctx, 69, ey, eye, col);
  stamp(ctx, 86, ey, flip(eye), col);
  // 눈 아래 음영
  px(ctx, 69, ey + eye.length, 5, 1, skin[1]);
  px(ctx, 86, ey + eye.length, 5, 1, skin[1]);
  // 눈썹 (한쪽을 1픽셀 올리거나 내려 비대칭)
  const b = hair[1];
  const ry = 27 + f.tilt;
  if (mood === 'angry') { line(ctx, 68, 26, 74, 28, b); line(ctx, 92, ry - 1, 86, ry + 1, b); }
  else if (mood === 'nervous' || mood === 'crying') { line(ctx, 68, 28, 74, 26, b); line(ctx, 92, ry + 1, 86, ry - 1, b); }
  else if (f.brow === 'arch') { stamp(ctx, 68, 26, ['.bbbb.', 'b....b'], { b }); stamp(ctx, 86, ry - 1, ['.bbbb.', 'b....b'], { b }); }
  else if (f.brow === 'thick') { px(ctx, 68, 26, 6, 2, b); px(ctx, 86, ry - 1, 6, 2, b); }
  else if (f.brow === 'thin') { px(ctx, 69, 27, 5, 1, hair[2]); px(ctx, 86, ry, 5, 1, hair[2]); }
  else { px(ctx, 68, 27, 6, 1, b); px(ctx, 68, 28, 2, 1, b); px(ctx, 86, ry, 6, 1, b); px(ctx, 90, ry + 1, 2, 1, b); }
  // 코
  if (f.nose === 'long') { px(ctx, 79, 35, 1, 6, skin[3]); px(ctx, 80, 37, 1, 5, skin[1]); }
  else { px(ctx, 80, 38, 1, 3, skin[3]); px(ctx, 81, 40, 1, 2, skin[1]); }
  px(ctx, 78, 42, 2, 1, skin[1]);
  px(ctx, 82, 42, 1, 1, skin[1]);
  // 입 (폭과 위치가 학생마다 조금씩 다르다)
  const mw = f.mouth === 'wide' ? 8 : f.mouth === 'small' ? 4 : 6;
  const mx = 80 - Math.floor(mw / 2) + (f.tilt > 0 ? 1 : 0);
  if (mood === 'shocked') stamp(ctx, 77, 46, ['.mmmm.', 'mkkkkm', 'mkrrkm', '.mmmm.'], { m: C.mouth, k: '#3a1a1a', r: C.lip });
  else if (mood === 'calm') { px(ctx, mx - 1, 47, 1, 1, C.mouth); px(ctx, mx, 48, mw, 1, C.mouth); px(ctx, mx + mw, 47, 1, 1, C.mouth); }
  else if (mood === 'nervous') { for (let i = 0; i < mw + 2; i++) px(ctx, mx - 1 + i, 47 + (i % 2), 1, 1, C.mouth); }
  else if (mood === 'angry' || mood === 'crying') { px(ctx, mx, 47, mw, 1, C.mouth); px(ctx, mx - 1, 48, 1, 1, C.mouth); px(ctx, mx + mw, 48, 1, 1, C.mouth); }
  else { px(ctx, mx, 47, mw, 1, C.mouth); px(ctx, mx + 1, 48, mw - 2, 1, C.lip); }
  // 볼, 눈물, 땀
  if (mood === 'angry' || mood === 'nervous') { px(ctx, 65, 41, 3, 1, C.blush); px(ctx, 92, 41, 3, 1, C.blush); }
  if (mood === 'crying') { px(ctx, 70, 35, 1, 5, C.tear); px(ctx, 71, 37, 1, 4, C.tear); px(ctx, 90, 35, 1, 5, C.tear); px(ctx, 89, 37, 1, 4, C.tear); }
  if (mood === 'nervous' || mood === 'shocked') stamp(ctx, 97, 16, ['.s.', 'sws', 'sss', '.s.'], { s: C.sweat, w: C.white });
  if (v.faceMole) px(ctx, 68, 39, 2, 2, C.mole);
}

// 외곽선은 1픽셀. 단, 오후 스마트안경의 두꺼운 테(2픽셀)는 단서라서 예외다.
function glassesOnFace(ctx, g) {
  const t = g.thick ? 2 : 1;
  const frame = (x) => {
    px(ctx, x + 1, 29, 11, t, C.frame); px(ctx, x + 1, 38 - t + 1, 11, t, C.frame);
    px(ctx, x, 30, t, 7, C.frame); px(ctx, x + 13 - t, 30, t, 7, C.frame);
    px(ctx, x + 2, 29 + t, 2, 1, C.lensHi); px(ctx, x + 2, 30 + t, 1, 1, C.lensHi);
  };
  frame(65);
  frame(82);
  px(ctx, 78, 31, 4, 1, C.frame);
  px(ctx, 60, 31, 5, t, C.frame);
  px(ctx, 95, 31, 5, t, C.frame);
  if (g.glint) stamp(ctx, 92, 28, ['cc', 'cl'], { c: C.camera, l: C.lens });
}

// ---------- 옷 ----------
// 단추는 옷 종류마다 따로. 후드·패딩에는 단추가 없다(지퍼).
const BUTTONS = {
  uniform: [[81, 83], [81, 91]],
  shirt: [[80, 71], [80, 77], [80, 83], [80, 89]],
};

function zipper(ctx, ramp, y0, y1) {
  for (let y = y0; y < y1; y++) px(ctx, 80, y, 1, 1, y % 2 ? '#a6acb4' : ramp[0]);
  px(ctx, 79, y0 + 4, 3, 1, '#c3c8cf');
  px(ctx, 80, y0 + 5, 1, 4, '#c3c8cf');
  px(ctx, 79, y0 + 9, 3, 1, '#7d838b');
}

function clothesDetail(ctx, v, cl, ramp) {
  if (cl.kind === 'uniform') {
    // 셔츠가 보이는 V자, 넥타이, 라펠
    for (let y = 60; y <= 77; y++) {
      const half = Math.max(0, Math.round((77 - y) * 0.5));
      px(ctx, 80 - half, y, half * 2 + 1, 1, cl.trim);
    }
    stamp(ctx, 77, 61, [
      '.kkkk.',
      'kttttk',
      '.kttk.',
      '.kttk.',
      'kthttk',
      'kttttk',
      'ktthtk',
      'kttttk',
      'kthttk',
      'kttttk',
      '.kttk.',
      '..kk..',
    ], { k: '#3a0f18', t: C.tie, h: C.tieHi });
    line(ctx, 69, 60, 80, 79, ramp[0]);
    line(ctx, 91, 60, 80, 79, ramp[0]);
    line(ctx, 68, 61, 78, 79, ramp[3]);
    line(ctx, 80, 79, 80, 97, ramp[0]);
  } else if (cl.kind === 'shirt') {
    // V자 와이셔츠 깃: 목 양옆에서 가운데로 내려오는 두 개의 삼각형
    for (let i = 0; i <= 7; i++) {
      const y = 59 + i;
      px(ctx, 71 + i, y, Math.max(1, 6 - i), 1, ramp[4]);
      px(ctx, 89 - i - Math.max(1, 6 - i) + 1, y, Math.max(1, 6 - i), 1, ramp[4]);
    }
    line(ctx, 70, 59, 79, 67, ramp[0]);
    line(ctx, 90, 59, 81, 67, ramp[0]);
    line(ctx, 70, 59, 72, 65, ramp[0]);
    line(ctx, 90, 59, 88, 65, ramp[0]);
    line(ctx, 72, 65, 79, 67, ramp[1]);
    line(ctx, 88, 65, 81, 67, ramp[1]);
    px(ctx, 80, 67, 1, 31, ramp[1]);
    px(ctx, 81, 67, 1, 31, ramp[3]);
  } else if (cl.kind === 'hoodie') {
    zipper(ctx, ramp, 63, 98);
    // 끈
    line(ctx, 74, 62, 73, 74, C.white); px(ctx, 72, 75, 2, 2, '#cfd3d8');
    line(ctx, 86, 62, 87, 74, C.white); px(ctx, 87, 75, 2, 2, '#cfd3d8');
    // 앞주머니
    line(ctx, 62, 86, 98, 86, ramp[1]);
    line(ctx, 62, 86, 58, 97, ramp[1]);
    line(ctx, 98, 86, 102, 97, ramp[1]);
    line(ctx, 62, 87, 98, 87, ramp[3]);
  } else {
    // 패딩: 누빔선(살짝 휘어짐)과 지퍼
    [70, 78, 86, 94].forEach((y) => {
      for (let x = 45; x < 116; x++) {
        const bend = Math.abs(x - 80) > 20 ? 1 : 0;
        px(ctx, x, y + bend, 1, 1, ramp[1]);
        px(ctx, x, y + bend + 1, 1, 1, ramp[3]);
      }
    });
    zipper(ctx, ramp, 60, 98);
  }
}

function buttons(ctx, v, kind) {
  const list = BUTTONS[kind];
  if (!list) return;
  list.forEach(([x, y], i) => {
    const big = v.bigButton && i === 1;
    if (big) stamp(ctx, x - 3, y - 3, ['.bbbb.', 'bhbbbb', 'bbbbbb', 'bbbbsb', 'bbbbbb', '.bbbb.'], { b: C.button, h: C.buttonHi, s: C.shine });
    else if (kind === 'uniform') stamp(ctx, x - 1, y - 1, ['.g.', 'ghg', '.o.'], { g: '#c9a227', h: '#f3d870', o: '#7a5f10' });
    else stamp(ctx, x, y, ['wg', 'gg'], { w: '#fbfbf7', g: '#c4c8ce' });
    const missing = v.sticker === 'missing' && i === 1;
    if (v.sticker === 'none' || missing) return;
    const peeled = v.sticker === 'peeled' && i === list.length - 1;
    stamp(ctx, x - 1, y - 1, peeled
      ? ['shhw', 'sssw', 'ssss', 'oooo']
      : ['hhhs', 'hsss', 'ssss', 'oooo'], { o: C.stickerOut, s: C.sticker, h: C.stickerHi, w: C.stickerBack });
  });
}

// ---------- 손목시계, 사인펜, 책상 물건 ----------
// 손목 위 작은 시계 (손목 두께 안)
function watchSmall(ctx, w, x, y) {
  px(ctx, x - 1, y + 1, 7, 2, C.strap);
  if (w.type === 'digital') stamp(ctx, x, y, ['kkkkk', 'kgggk', 'kkkkk'], { k: '#3a3a42', g: C.seg });
  else stamp(ctx, x, y, ['.bbb.', 'bfffb', '.bbb.'], { b: C.bezel, f: C.face });
}

// 시계 확대 창: 위장 스마트워치 단서(바늘이 지금 시각과 다름)는 여기서 본다
function watchInset(ctx, w) {
  const x = 4;
  const y = 60;
  panel(ctx, x - 1, y - 1, 25, 25);
  const cx = x + 11;
  const cy = y + 11;
  if (w.type === 'digital') {
    px(ctx, x + 3, y + 6, 17, 11, '#3a3a42');
    px(ctx, x + 4, y + 7, 15, 9, C.lcd);
    stamp(ctx, x + 5, y + 9, ['gg.g.gg', 'g..g..g', 'gg.g.gg'].map((r) => r), { g: C.seg });
    return;
  }
  for (let yy = -9; yy <= 9; yy++) {
    for (let xx = -9; xx <= 9; xx++) {
      const d = xx * xx + yy * yy;
      if (d <= 81) px(ctx, cx + xx, cy + yy, 1, 1, d > 64 ? C.bezel : C.face);
    }
  }
  [0, 3, 6, 9].forEach((k) => {
    const a = (k / 12) * Math.PI * 2;
    px(ctx, cx + Math.round(Math.sin(a) * 7), cy - Math.round(Math.cos(a) * 7), 1, 1, C.tick);
  });
  const ma = (w.m / 60) * Math.PI * 2;
  const ha = (((w.h % 12) + w.m / 60) / 12) * Math.PI * 2;
  for (let r = 0; r <= 7; r++) px(ctx, cx + Math.round(Math.sin(ma) * r), cy - Math.round(Math.cos(ma) * r), 1, 1, C.hand);
  for (let r = 0; r <= 4; r++) px(ctx, cx + Math.round(Math.sin(ha) * r), cy - Math.round(Math.cos(ha) * r), 1, 1, C.handR);
}

function pen(ctx, fake, x, y, vertical) {
  if (vertical) {
    for (let i = 0; i < 22; i++) {
      const isCap = i < 7;
      px(ctx, x, y + i, 1, 1, isCap ? C.capHi : C.penHi);
      px(ctx, x + 1, y + i, 2, 1, isCap ? C.cap : C.pen);
    }
    if (!fake) px(ctx, x, y + 7, 3, 2, C.band);
    else px(ctx, x + 1, y, 1, 1, C.lens);
    return;
  }
  for (let i = 0; i < 26; i++) {
    const isCap = i >= 19;
    px(ctx, x + i, y, 1, 1, isCap ? C.capHi : C.penHi);
    px(ctx, x + i, y + 1, 1, 2, isCap ? C.cap : C.pen);
  }
  if (!fake) px(ctx, x + 16, y, 2, 3, C.band);
  else px(ctx, x + 25, y + 1, 1, 1, C.lens);
}

// 책상 위 물건은 위쪽이 좁은 사다리꼴로 찍어 책상 면에 누워 있게 보이게 한다.
function trap(ctx, t, color) {
  for (let y = t.y0; y <= t.y1; y++) {
    const [l, r] = span(t, y);
    px(ctx, l, y, r - l + 1, 1, color);
  }
}

function span(t, y) {
  const k = (y - t.y0) / Math.max(1, t.y1 - t.y0);
  return [Math.round(t.l0 + (t.l1 - t.l0) * k), Math.round(t.r0 + (t.r1 - t.r0) * k)];
}

// 사다리꼴 안의 상대 좌표(u: 0~1 가로, w: 0~1 세로) → 화면 좌표
function at(t, u, w) {
  const y = Math.round(t.y0 + (t.y1 - t.y0) * w);
  const [l, r] = span(t, y);
  return [Math.round(l + (r - l) * u), y];
}

const PAPER = { y0: 99, y1: 118, l0: 48, r0: 86, l1: 43, r1: 91 };
const OMR = { y0: 99, y1: 118, l0: 120, r0: 152, l1: 117, r1: 156 };
const CARD = { y0: 101, y1: 115, l0: 9, r0: 25, l1: 6, r1: 27 };

function desk(ctx, v) {
  if (v.paper !== 'none') {
    // 문제지
    trap(ctx, { ...PAPER, y0: PAPER.y0 + 1, y1: PAPER.y1 + 1 }, C.paperEdge);
    trap(ctx, PAPER, C.paper);
    const [hx, hy] = at(PAPER, 0.08, 0.08);
    px(ctx, hx, hy, 14, 2, '#8a919c');
    for (let w = 0.3; w < 0.95; w += 0.16) {
      const [x0, y] = at(PAPER, 0.08, w);
      const [x1] = at(PAPER, 0.85 - ((w * 37) % 0.2), w);
      px(ctx, x0, y, x1 - x0, 1, C.print);
    }
    if (v.paper === 'scribbled') {
      [[0.15, 0.3, 0.4, 0.5, 0.6, 0.35], [0.5, 0.6, 0.7, 0.45, 0.9, 0.6], [0.1, 0.75, 0.3, 0.9, 0.45, 0.7], [0.55, 0.85, 0.7, 0.75, 0.88, 0.9]].forEach(([a, b, c, d, e, f]) => {
        const p1 = at(PAPER, a, b);
        const p2 = at(PAPER, c, d);
        const p3 = at(PAPER, e, f);
        line(ctx, p1[0], p1[1], p2[0], p2[1], C.pencil);
        line(ctx, p2[0], p2[1], p3[0], p3[1], C.pencil);
      });
      const [cx, cy] = at(PAPER, 0.75, 0.12);
      stamp(ctx, cx, cy, ['.pp.', 'p..p', '.pp.'], { p: C.pencil });
    }
    // OMR 카드
    trap(ctx, { ...OMR, y0: OMR.y0 + 1, y1: OMR.y1 + 1 }, C.omrEdge);
    trap(ctx, OMR, C.omr);
    trap(ctx, { ...OMR, y1: OMR.y0 + 1 }, C.omrLine);
    const filled = Math.round(v.omr * 20);
    let k = 0;
    for (let col = 0; col < 4; col++) {
      const u = 0.06 + col * 0.24;
      const top = at(OMR, u, 0.12);
      const bot = at(OMR, u, 0.95);
      line(ctx, top[0], top[1], bot[0], bot[1], C.omrLine);
      for (let row = 0; row < 5; row++) {
        const [x, y] = at(OMR, u + 0.04, 0.2 + row * 0.17);
        px(ctx, x, y, 5, 1, '#efb2c2');
        if (k < filled) px(ctx, x + ((k * 5) % 3) + 1, y - 1, 2, 2, C.mark);
        k++;
      }
    }
  }
  // 수험표
  trap(ctx, { ...CARD, y0: CARD.y0 + 1, y1: CARD.y1 + 1 }, C.cardEdge);
  trap(ctx, CARD, C.card);
  trap(ctx, { ...CARD, y1: CARD.y0 + 2 }, C.cardHead);
  const [px0, py0] = at(CARD, 0.12, 0.35);
  px(ctx, px0, py0, 6, 7, C.photoBg);
  const [lx, ly] = at(CARD, 0.55, 0.4);
  px(ctx, lx, ly, 7, 1, C.print);
  px(ctx, lx, ly + 3, 5, 1, C.print);
}

// ---------- 확대 창 ----------
function panel(ctx, x, y, w, h) {
  px(ctx, x - 1, y - 1, w + 2, h + 2, C.panel);
  px(ctx, x, y, w, h, C.panelLine);
  px(ctx, x + 1, y + 1, w - 2, h - 2, C.panel);
}

function idInset(ctx, v, skin, hair, cloth) {
  panel(ctx, 3, 3, 40, 52);
  px(ctx, 5, 5, 36, 48, C.card);
  px(ctx, 5, 5, 36, 6, C.cardHead);
  px(ctx, 7, 7, 14, 2, C.white);
  const x = 12;
  const y = 14;
  px(ctx, x, y, 22, 28, C.photoBg);
  px(ctx, x + 3, y + 22, 16, 6, cloth[2]);
  px(ctx, x + 3, y + 22, 16, 1, cloth[0]);
  px(ctx, x + 5, y + 5, 12, 16, skin[2]);
  px(ctx, x + 5, y + 5, 1, 16, skin[0]);
  px(ctx, x + 16, y + 5, 1, 16, skin[1]);
  px(ctx, x + 5, y + 20, 12, 1, skin[1]);
  px(ctx, x + 4, y + 2, 14, 5, hair[2]);
  px(ctx, x + 4, y + 2, 14, 1, hair[0]);
  px(ctx, x + 4, y + 7, 2, 4, hair[2]);
  px(ctx, x + 16, y + 7, 2, 4, hair[2]);
  px(ctx, x + 7, y + 11, 2, 2, C.iris);
  px(ctx, x + 13, y + 11, 2, 2, C.iris);
  px(ctx, x + 9, y + 17, 4, 1, C.mouth);
  if (v.idPhoto.mole) px(ctx, x + 6, y + 14, 2, 2, C.mole);
  px(ctx, 8, 45, 30, 2, C.print);
  px(ctx, 8, 49, 20, 1, C.print);
}

function glassesInset(ctx, g) {
  panel(ctx, 115, 3, 42, 26);
  const t = g.thick ? 2 : 1;
  const frame = (x) => {
    px(ctx, x + 1, 9, 13, t, C.white); px(ctx, x + 1, 20 - t, 13, t, C.white);
    px(ctx, x, 10, t, 9, C.white); px(ctx, x + 15 - t, 10, t, 9, C.white);
    px(ctx, x + 3, 9 + t + 1, 2, 1, C.lensHi);
  };
  frame(118);
  frame(138);
  px(ctx, 133, 12, 5, 1, C.white);
  if (g.glint) px(ctx, 150, 10, 2, 2, C.lens);
}

function pocketsInset(ctx, items) {
  panel(ctx, 115, 3, 42, 32);
  px(ctx, 117, 5, 38, 28, '#cfd5dc');
  px(ctx, 119, 8, 13, 9, C.card);
  px(ctx, 119, 8, 13, 2, C.cardHead);
  pen(ctx, false, 128, 21, false);
  items.forEach((item) => {
    if (item === 'phone') stamp(ctx, 119, 17, ['kkkkkkkkk', 'kssssssss', 'kssssssss', 'kssssssss', 'kssssssss', 'kssssssss', 'kssssssss', 'kssssssss', 'kssssssss', 'kssssssss', 'kssssssss', 'kkkkwkkkk', 'kkkkkkkkk', 'kkkkkkkkk', 'kkkkkkkkk'].map((r) => r.padEnd(9, 'k')), { k: C.phone, s: C.screen, w: '#5a5a66' });
    else stamp(ctx, 136, 25, ['.eeeeeeeeee.', 'ebbbbbbbbbbe', 'eeeeeeeeeeee', 'ebbbbbbbbbbe', 'ebbbbbbbbbbe', '.eeeeeeeeee.'], { e: C.budEdge, b: C.bud });
  });
}

// ---------- 공용 틀 (모든 학생이 같은 틀을 쓰고 색만 바꾼다) ----------
// 틀의 각 칸에는 실제 색 대신 'C0'~'C4'(옷), 'K0'~'K4'(피부), 'H0'~'H4'(머리), 'W0'~'W4'(책상) 같은 자리표시가 들어간다.
const SLOT = (k) => [0, 1, 2, 3, 4].map((i) => `${k}${i}`);
const TEMPLATE_CACHE = new Map();

function capsule(r, p, x0, y0, x1, y1, rad) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len2 = dx * dx + dy * dy;
  r.fill(p, Math.floor(Math.min(x0, x1) - rad), Math.floor(Math.min(y0, y1) - rad), Math.ceil(Math.max(x0, x1) + rad), Math.ceil(Math.max(y0, y1) + rad), (x, y) => {
    const t = Math.max(0, Math.min(1, ((x + 0.5 - x0) * dx + (y + 0.5 - y0) * dy) / len2));
    const ex = x + 0.5 - (x0 + dx * t);
    const ey = y + 0.5 - (y0 + dy * t);
    return ex * ex + ey * ey <= rad * rad;
  });
}

function toMap(r) {
  const map = new Array(CLOSE_W * CLOSE_H).fill(null);
  r.render((x, y, c) => { map[y * CLOSE_W + x] = c; });
  return map;
}

function template(key, build) {
  if (!TEMPLATE_CACHE.has(key)) {
    const r = makeRaster(CLOSE_W, CLOSE_H);
    build(r);
    TEMPLATE_CACHE.set(key, toMap(r));
  }
  return TEMPLATE_CACHE.get(key);
}

// 얼굴형: 턱이 좁아지는 정도와 너비
const FACE_SHAPE = {
  oval: { rx: 20.5, narrow: 0.32, pow: 2 },
  round: { rx: 21, narrow: 0.18, pow: 2 },
  square: { rx: 20, narrow: 0.12, pow: 3 },
  narrow: { rx: 19, narrow: 0.36, pow: 2 },
};

// 몸 뒤쪽 층: 몸통(옷 실루엣 포함), 목, 귀, 머리, 책상, 책상 위가 아닌 팔
function bodyTemplate(pose, sleeves, waist, kind, shape, earsHidden) {
  return template(`body|${pose}|${sleeves}|${waist}|${kind}|${shape}|${earsHidden}`, (r) => {
    const cloth = SLOT('C');
    const skin = SLOT('K');
    // 몸통과 위팔을 한 덩어리로: 목에서 완만하게 내려오는 어깨선 → 둥근 어깨 끝 → 곧게 내려오는 팔 바깥선
    const pTorso = r.part(cloth);
    r.fill(pTorso, 30, 56, 130, 99, (x, y) => {
      const ax = Math.abs(x + 0.5 - 80);
      if (ax > 37) return false;
      let top;
      if (ax <= 9) top = 59.5;
      else if (ax <= 27) top = 59.5 + (ax - 9) * 0.3;
      else top = 64.9 + (1 - Math.sqrt(Math.max(0, 1 - ((ax - 27) / 10) ** 2))) * 10;
      return y >= top;
    });
    if (waist) r.ellipse(pTorso, 117, 90, 6, 6);
    // 옷 종류별 실루엣: 후드는 목 뒤로 접힌 모자, 패딩은 세운 깃
    if (kind === 'hoodie') {
      const pHood = r.part(cloth);
      r.fill(pHood, 56, 48, 104, 68, (x, y) => {
        const out = ((x + 0.5 - 80) / 23) ** 2 + ((y + 0.5 - 62) / 9) ** 2 <= 1;
        const hole = ((x + 0.5 - 80) / 13) ** 2 + ((y + 0.5 - 61) / 6) ** 2 <= 1;
        return out && !hole;
      });
    }
    if (kind === 'padding') {
      const pCollar = r.part(cloth);
      r.round(pCollar, 66, 53, 28, 11, 4);
    }
    // 목
    const pNeck = r.part(skin);
    r.round(pNeck, 72, 50, 16, kind === 'padding' ? 6 : 14, 3);
    // 귀: 작게, 머리 옆에 살짝만 보인다
    if (!earsHidden) {
      const pEars = r.part(skin);
      r.ellipse(pEars, 60, 38, 2, 4.5);
      r.ellipse(pEars, 100, 38, 2, 4.5);
    }
    // 머리: 얼굴형에 따라 턱 모양이 다르다
    const fs = FACE_SHAPE[shape] || FACE_SHAPE.oval;
    const pHead = r.part(skin, { shine: true });
    r.fill(pHead, 56, 10, 104, 58, (x, y) => {
      const ny = (y + 0.5 - 33) / 23;
      const narrow = ny > 0 ? 1 - ny * fs.narrow : 1;
      return Math.abs((x + 0.5 - 80) / (fs.rx * narrow)) ** fs.pow + Math.abs(ny) ** 2 <= 1;
    });
    if (kind === 'padding') { const pFront = r.part(cloth); r.round(pFront, 68, 56, 24, 8, 3); }
    // 책상
    const pDesk = r.part(WOOD.map((_, i) => `W${i}`), { flat: true });
    r.rect(pDesk, 0, 96, CLOSE_W, 24);
    const fore = sleeves ? skin : cloth;
  });
}

// 몸 앞쪽 층: 책상 위에 앞으로 내민 아래팔과 손 (책상 물건 위에 그린다)
function armsTemplate(pose, sleeves) {
  return template(`arms|${pose}|${sleeves}`, (r) => {
    const cloth = SLOT('C');
    const skin = SLOT('K');
    if (pose === 'belly') return;
    const left = true;
    const right = pose !== 'glasses' && pose !== 'ear';
    const rightHand = pose === 'penUp' ? [107, 99] : [97, 105];
    if (left) {
      const pFore = r.part(sleeves ? skin : cloth);
      capsule(r, pFore, 48, 96, 58, 103, 5);
      if (sleeves) { const pCuff = r.part(cloth); r.ellipse(pCuff, 48, 95, 6, 3.5); }
      const pHand = r.part(skin, { shine: true });
      r.ellipse(pHand, 63, 105, 6.5, 4.5);
    }
    if (right) {
      const pFore = r.part(sleeves ? skin : cloth);
      capsule(r, pFore, 112, 96, rightHand[0] + 5, rightHand[1] - 2, 5);
      if (sleeves) { const pCuff = r.part(cloth); r.ellipse(pCuff, 112, 95, 6, 3.5); }
      const pHand = r.part(skin, { shine: true });
      r.ellipse(pHand, rightHand[0], rightHand[1], 6.5, 4.5);
    }
  });
}

// 얼굴로 올린 팔: 머리카락 위에 그려야 손가락이 가려지지 않는다.
// 팔꿈치는 가슴 옆, 아래팔은 얼굴 쪽으로 비스듬히, 손목에서 한 번 꺾여 손가락 끝이 안경테/귀에 닿는다.
function raisedArmTemplate(pose, sleeves) {
  return template(`raised|${pose}|${sleeves}`, (r) => {
    if (pose === 'belly') {
      // 배 잡기: 양 아래팔이 몸 앞을 가로질러 손이 배를 감싼다 (옷 무늬 위에 그려 윤곽이 묻히지 않게)
      const fore = sleeves ? SLOT('K') : SLOT('C');
      const pForeL = r.part(fore);
      capsule(r, pForeL, 48, 93, 69, 87, 4.6);
      const pForeR = r.part(fore);
      capsule(r, pForeR, 112, 93, 91, 87, 4.6);
      const pHands = r.part(SLOT('K'), { shine: true });
      r.ellipse(pHands, 74, 86, 5.5, 4.2);
      const pHand2 = r.part(SLOT('K'), { shine: true });
      r.ellipse(pHand2, 86, 87, 5.5, 4.2);
      return;
    }
    if (pose !== 'glasses' && pose !== 'ear') return;
    const ear = pose === 'ear';
    const fore = sleeves ? SLOT('K') : SLOT('C');
    const skin = SLOT('K');
    const elbow = [115, 90];
    const wrist = ear ? [113, 57] : [109, 52];
    const pFore = r.part(fore);
    capsule(r, pFore, elbow[0], elbow[1], wrist[0], wrist[1], 4.5);
    if (!sleeves) { const pCuff = r.part(SLOT('C')); r.ellipse(pCuff, wrist[0], wrist[1] + 1, 5, 3); }
    const pHand = r.part(skin, { shine: true });
    const palm = ear ? [108, 47] : [104, 43];
    capsule(r, pHand, wrist[0], wrist[1] - 2, palm[0], palm[1], 4);
    const tips = ear ? [[102, 36], [101, 39], [101, 42], [102, 45]] : [[98, 31], [97, 34], [98, 37], [100, 40]];
    tips.forEach(([tx, ty], i) => capsule(r, pHand, palm[0] - 1, palm[1] - 3 + i * 1.5, tx, ty, 1.1));
  });
}

function hairTemplate(style, back) {
  return template(`hair|${style}|${back}`, (r) => {
    const p = r.part(SLOT('H'), { shine: !back });
    if (back) hairBack(r, p, style);
    else hairFront(r, p, style);
  });
}

function paint(ctx, map, colors) {
  for (let i = 0; i < map.length; i++) {
    const tok = map[i];
    if (!tok) continue;
    const ramp = colors[tok[0]];
    ctx.fillStyle = ramp[+tok[1]];
    ctx.fillRect(i % CLOSE_W, Math.floor(i / CLOSE_W), 1, 1);
  }
}

// ---------- 전체 ----------
export function drawCloseup(ctx, v) {
  ctx.imageSmoothingEnabled = false;
  const look = v.look;
  const skin = rampFor(SKIN, LOOKS.skin, look.skin);
  const hair = rampFor(HAIR, LOOKS.hair, look.hair);
  const clothIndex = LOOKS.clothes.findIndex((c) => c.body === look.clothes.body);
  const cloth = CLOTHES[clothIndex >= 0 ? clothIndex : 0];
  const cl = look.clothes;
  const pose = v.pose;
  const colors = { C: cloth, K: skin, H: hair, W: WOOD };

  background(ctx);
  paint(ctx, hairTemplate(look.hairStyle, true), colors);
  const earsHidden = EARS_HIDDEN.includes(look.hairStyle);
  const shape = (look.face && look.face.shape) || 'oval';
  paint(ctx, bodyTemplate(pose, !!v.sleeves, !!v.waist, cl.kind, shape, earsHidden), colors);
  paint(ctx, hairTemplate(look.hairStyle, false), colors);
  // 팔과 몸통 사이 주름(겨드랑이에서 팔꿈치까지)
  const crease = (x0, x1) => { line(ctx, x0, 77, x1, 95, cloth[1]); line(ctx, x0 + (x1 > x0 ? 1 : -1), 79, x1 + (x1 > x0 ? 1 : -1), 95, cloth[3]); };
  if (pose !== 'belly' && cl.kind !== 'padding') crease(55, 54);
  if (pose !== 'glasses' && pose !== 'ear' && pose !== 'belly' && cl.kind !== 'padding') crease(105, 106);

  // 책상 가장자리
  px(ctx, 0, 96, CLOSE_W, 1, WOOD[0]);
  px(ctx, 0, 97, CLOSE_W, 1, WOOD[3]);
  for (let x = 6; x < CLOSE_W; x += 23) px(ctx, x, 104 + (x % 5), 9, 1, WOOD[1]);

  // 귓구멍과 이어폰
  if (!earsHidden) {
    px(ctx, 101, 37, 1, 3, C.canal);
    px(ctx, 59, 37, 1, 3, skin[1]);
    // 이어폰: 귓구멍에서 살짝 나온 둥근 알 (외곽선 + 하이라이트로 노이즈가 아닌 물체로 보이게)
    if (v.earBlob && pose !== 'ear') stamp(ctx, 100, 36, ['.oo.', 'obwo', 'obbo', '.oo.'], { o: '#8a5a44', b: C.blob, w: C.white });
  }

  clothesDetail(ctx, v, cl, cloth);
  if (v.pocketBulge) {
    const w = v.pocketBulge === 'phone' ? 10 : 7;
    const h = v.pocketBulge === 'phone' ? 13 : 6;
    px(ctx, 53, 81, w, h, cloth[1]);
    px(ctx, 53, 81, w, 1, cloth[3]);
    px(ctx, 53, 81, 1, h, cloth[3]);
  }
  if (v.buzz) stamp(ctx, 124, 84, ['.y.y', 'y.y.', '....', '.y.y', 'y.y.'], { y: C.buzz });
  buttons(ctx, v, cl.kind);
  face(ctx, v, skin, hair);
  if (v.glasses && !v.glasses.off) glassesOnFace(ctx, v.glasses);
  paint(ctx, raisedArmTemplate(pose, !!v.sleeves), colors);
  if (pose === 'belly') {
    // 팔 아래 그림자로 몸통과 분리
    line(ctx, 50, 98, 69, 92, cloth[0]);
    line(ctx, 110, 98, 91, 92, cloth[0]);
    [72, 74, 76].forEach((x) => px(ctx, x, 87, 1, 2, skin[1]));
    [84, 86, 88].forEach((x) => px(ctx, x, 88, 1, 2, skin[1]));
  }

  desk(ctx, v);
  paint(ctx, armsTemplate(pose, !!v.sleeves), colors);
  if (pose !== 'belly') {
    // 손가락 사이 선
    [60, 63, 66].forEach((x) => px(ctx, x, 106, 1, 2, skin[1]));
  }
  if (pose === 'desk' || pose === 'tap') [94, 97, 100].forEach((x) => px(ctx, x, 106, 1, 2, skin[1]));
  if (v.watch && pose !== 'belly') watchSmall(ctx, v.watch, 52, 99);
  else if (v.watch) watchSmall(ctx, v.watch, 58, 90);
  if (v.watch) watchInset(ctx, v.watch);
  if (v.paper !== 'none') {
    if (pose === 'penUp') pen(ctx, v.fakePen, 106, 79, true);
    else pen(ctx, v.fakePen, 74, 113, false);
  }
  if (pose === 'tap') stamp(ctx, 95, 97, ['k..k', '.k..', 'k..k'], { k: C.ink });

  if (v.idPhoto) idInset(ctx, v, skin, hair, cloth);
  if (v.glasses && v.glasses.off) glassesInset(ctx, v.glasses);
  else if (v.pockets) pocketsInset(ctx, v.pockets);
}
