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
  stickerOut: '#b8901c', sticker: '#ffe45c', stickerHi: '#fff6b4', stickerBack: '#ffffff',
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
          ctx.fillStyle = c;
          ctx.fillRect(x, y, 1, 1);
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
function hairBack(r, p, style) {
  if (style === 'long') { r.round(p, 54, 22, 13, 50, 6); r.round(p, 93, 22, 13, 50, 6); }
  if (style === 'ponytail') { r.ellipse(p, 103, 34, 6, 12); r.ellipse(p, 104, 47, 4, 8); }
  if (style === 'bob') { r.round(p, 56, 24, 48, 30, 10); }
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
    case 'long':
    case 'ponytail':
      cap(ell(80, 26, 22, 17), 22);
      fringe(21, 6);
      r.round(p, 58, 22, 5, style === 'bob' ? 28 : 14, 2);
      r.round(p, 97, 22, 5, style === 'bob' ? 28 : 14, 2);
      break;
    default:
      cap(ell(80, 26, 21, 16), 21);
      fringe(20, 5);
      r.rect(p, 59, 22, 3, 10);
      r.rect(p, 98, 22, 3, 10);
  }
}

// ---------- 얼굴 ----------
const EYE = {
  open: ['.kkk.', 'kkwkk', '.kkk.'],
  shocked: ['.kkk.', 'kwkkk', 'kkkkk', '.kkk.'],
  closed: ['.....', 'kkkkk', '.k.k.'],
};

function face(ctx, v, skin, hair) {
  const mood = v.mood;
  const eyes = mood === 'shocked' ? EYE.shocked : mood === 'crying' ? EYE.closed : EYE.open;
  const col = { k: C.iris, w: C.white };
  stamp(ctx, 69, 31, eyes, col);
  stamp(ctx, 86, 31, eyes, col);
  // 아래 속눈썹 그림자
  px(ctx, 69, 34 + (mood === 'shocked' ? 1 : 0), 5, 1, skin[1]);
  px(ctx, 86, 34 + (mood === 'shocked' ? 1 : 0), 5, 1, skin[1]);
  // 눈썹
  const b = hair[1];
  if (mood === 'angry') { line(ctx, 68, 26, 74, 28, b); line(ctx, 68, 27, 74, 29, b); line(ctx, 92, 26, 86, 28, b); line(ctx, 92, 27, 86, 29, b); }
  else if (mood === 'nervous' || mood === 'crying') { line(ctx, 68, 28, 74, 26, b); line(ctx, 92, 28, 86, 26, b); px(ctx, 69, 28, 5, 1, b); px(ctx, 86, 28, 5, 1, b); }
  else { px(ctx, 68, 27, 6, 2, b); px(ctx, 86, 27, 6, 2, b); px(ctx, 68, 27, 1, 1, hair[2]); px(ctx, 91, 27, 1, 1, hair[2]); }
  // 코
  px(ctx, 80, 37, 1, 4, skin[3]);
  px(ctx, 81, 39, 1, 3, skin[1]);
  px(ctx, 78, 42, 2, 1, skin[1]);
  px(ctx, 82, 42, 1, 1, skin[1]);
  // 입
  if (mood === 'shocked') stamp(ctx, 77, 46, ['.mmmm.', 'mkkkkm', 'mkrrkm', '.mmmm.'], { m: C.mouth, k: '#3a1a1a', r: C.lip });
  else if (mood === 'calm') stamp(ctx, 76, 47, ['m......m', '.mmmmmm.', '..llll..'], { m: C.mouth, l: skin[1] });
  else if (mood === 'nervous') stamp(ctx, 76, 47, ['.m.m.m.m', 'm.m.m.m.'], { m: C.mouth });
  else if (mood === 'angry' || mood === 'crying') stamp(ctx, 76, 47, ['..mmmm..', '.m....m.', 'm......m'], { m: C.mouth });
  else stamp(ctx, 76, 47, ['.mmmmmm.', '..llll..'], { m: C.mouth, l: C.lip });
  // 볼, 눈물, 땀
  if (mood === 'angry' || mood === 'nervous') { px(ctx, 65, 41, 3, 1, C.blush); px(ctx, 92, 41, 3, 1, C.blush); }
  if (mood === 'crying') { px(ctx, 70, 35, 1, 5, C.tear); px(ctx, 71, 37, 1, 4, C.tear); px(ctx, 90, 35, 1, 5, C.tear); px(ctx, 89, 37, 1, 4, C.tear); }
  if (mood === 'nervous' || mood === 'shocked') stamp(ctx, 97, 16, ['.s.', 'sws', 'sss', '.s.'], { s: C.sweat, w: C.white });
  if (v.faceMole) px(ctx, 68, 39, 2, 2, C.mole);
}

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
  if (g.thick) { px(ctx, 59, 30, 6, 1, C.frame); px(ctx, 95, 30, 6, 1, C.frame); }
  if (g.glint) stamp(ctx, 92, 28, ['cc', 'cl'], { c: C.camera, l: C.lens });
}

// ---------- 옷 ----------
const BUTTON_Y = [74, 80, 86, 92];

function clothesDetail(ctx, v, cl, ramp) {
  if (cl.kind === 'uniform') {
    stamp(ctx, 72, 63, [
      'ss........ss',
      '.ss......ss.',
      '..ss.tt.ss..',
      '...sstttss..',
      '....sttts...',
      '.....ttt....',
      '.....ttt....',
      '......t.....',
    ].map((r) => r.padEnd(16, '.')), { s: cl.trim, t: C.tie });
    line(ctx, 70, 63, 78, 74, ramp[0]);
    line(ctx, 90, 63, 82, 74, ramp[0]);
  } else if (cl.kind === 'shirt') {
    stamp(ctx, 71, 62, ['cccc......cccc', '.cccc....cccc.', '..ccc....ccc..', '...cc....cc...'], { c: ramp[3] });
    line(ctx, 71, 62, 75, 66, ramp[0]);
    line(ctx, 88, 62, 84, 66, ramp[0]);
    px(ctx, 79, 66, 1, 32, ramp[1]);
  } else if (cl.kind === 'hoodie') {
    px(ctx, 64, 62, 32, 3, ramp[1]);
    px(ctx, 64, 62, 32, 1, ramp[0]);
    px(ctx, 73, 65, 1, 9, C.white); px(ctx, 86, 65, 1, 9, C.white);
    px(ctx, 72, 74, 2, 2, C.white); px(ctx, 86, 74, 2, 2, C.white);
    px(ctx, 79, 65, 1, 33, ramp[0]);
  } else {
    [70, 78, 86, 94].forEach((y) => { px(ctx, 46, y, 68, 1, ramp[1]); px(ctx, 46, y + 1, 68, 1, ramp[3]); });
    px(ctx, 79, 63, 1, 35, ramp[0]);
  }
}

function buttons(ctx, v) {
  BUTTON_Y.forEach((y, i) => {
    const big = v.bigButton && i === 1;
    if (big) stamp(ctx, 77, y - 3, ['.bbbb.', 'bhbbbb', 'bbbbbb', 'bbbbsb', 'bbbbbb', '.bbbb.'], { b: C.button, h: C.buttonHi, s: C.shine });
    else stamp(ctx, 79, y - 1, ['bb', 'bh'].map((r) => r), { b: C.button, h: C.buttonHi });
    const missing = v.sticker === 'missing' && i === 1;
    if (v.sticker === 'none' || missing) return;
    const peeled = v.sticker === 'peeled' && i === 2;
    stamp(ctx, 78, y - 2, peeled
      ? ['ohhhw', 'ossww', 'osssw', 'ossso', '.ooo.']
      : ['.hhh.', 'hsssh', 'sssss', 'ossso', '.ooo.'], { o: C.stickerOut, s: C.sticker, h: C.stickerHi, w: C.stickerBack });
  });
}

// ---------- 손목시계, 사인펜, 책상 물건 ----------
function watch(ctx, w, x, y) {
  px(ctx, x - 1, y + 2, 13, 7, C.strap);
  px(ctx, x - 1, y + 2, 13, 1, C.strapHi);
  if (w.type === 'digital') {
    stamp(ctx, x, y, [
      'kkkkkkkkkkk',
      'kllllllllll',
      'klgg.l.gglk',
      'klg.glg.glk',
      'klgg.l.gglk',
      'kllllllllll',
      'kkkkkkkkkkk',
    ].map((r) => r.padEnd(11, 'k')), { k: '#3a3a42', l: C.lcd, g: C.seg });
    return;
  }
  stamp(ctx, x, y - 1, [
    '...bbbbb...',
    '.bbfffffbb.',
    '.bfffffffb.',
    'bfffffffffb',
    'bfffffffffb',
    'bfffffffffb',
    'bfffffffffb',
    'bfffffffffb',
    '.bfffffffb.',
    '.bbfffffbb.',
    '...bbbbb...',
  ], { b: C.bezel, f: C.face });
  const cx = x + 5;
  const cy = y + 4;
  [0, 3, 6, 9].forEach((k) => {
    const a = (k / 12) * Math.PI * 2;
    px(ctx, cx + Math.round(Math.sin(a) * 4), cy - Math.round(Math.cos(a) * 4), 1, 1, C.tick);
  });
  const ma = (w.m / 60) * Math.PI * 2;
  const ha = (((w.h % 12) + w.m / 60) / 12) * Math.PI * 2;
  for (let r = 0; r <= 4; r++) px(ctx, cx + Math.round(Math.sin(ma) * r), cy - Math.round(Math.cos(ma) * r), 1, 1, C.hand);
  for (let r = 0; r <= 2; r++) px(ctx, cx + Math.round(Math.sin(ha) * r), cy - Math.round(Math.cos(ha) * r), 1, 1, C.handR);
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

function desk(ctx, v) {
  if (v.paper !== 'none') {
    // 문제지
    px(ctx, 44, 99, 46, 20, C.paperEdge);
    px(ctx, 44, 98, 45, 20, C.paper);
    px(ctx, 47, 100, 16, 2, '#8a919c');
    for (let y = 104; y < 117; y += 3) px(ctx, 47, y, 38 - ((y * 7) % 9), 1, C.print);
    if (v.paper === 'scribbled') {
      [[50, 104, 60, 108, 70, 105], [66, 110, 74, 106, 84, 109], [49, 113, 57, 116, 63, 112], [72, 115, 78, 113, 86, 116]].forEach(([a, b, c, d, e, f]) => {
        line(ctx, a, b, c, d, C.pencil);
        line(ctx, c, d, e, f, C.pencil);
      });
      stamp(ctx, 76, 101, ['.pp.', 'p..p', '.pp.'], { p: C.pencil });
    }
    // OMR 카드
    px(ctx, 117, 99, 40, 20, C.omrEdge);
    px(ctx, 117, 98, 39, 20, C.omr);
    px(ctx, 117, 98, 39, 2, C.omrLine);
    const filled = Math.round(v.omr * 20);
    let k = 0;
    for (let col = 0; col < 4; col++) {
      px(ctx, 119 + col * 9, 101, 1, 16, C.omrLine);
      for (let row = 0; row < 5; row++) {
        const x = 121 + col * 9;
        const y = 102 + row * 3;
        px(ctx, x, y, 6, 1, '#efb2c2');
        if (k < filled) px(ctx, x + ((k * 5) % 4) + 1, y - 1, 2, 2, C.mark);
        k++;
      }
    }
  }
  // 수험표(작게)
  px(ctx, 6, 101, 20, 15, C.cardEdge);
  px(ctx, 6, 100, 19, 15, C.card);
  px(ctx, 6, 100, 19, 3, C.cardHead);
  px(ctx, 8, 105, 6, 8, C.photoBg);
  px(ctx, 16, 106, 7, 1, C.print);
  px(ctx, 16, 109, 5, 1, C.print);
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

// ---------- 전체 ----------
export function drawCloseup(ctx, v) {
  ctx.imageSmoothingEnabled = false;
  const look = v.look;
  const skin = rampFor(SKIN, LOOKS.skin, look.skin);
  const hair = rampFor(HAIR, LOOKS.hair, look.hair);
  const clothIndex = LOOKS.clothes.findIndex((c) => c.body === look.clothes.body);
  const cloth = CLOTHES[clothIndex >= 0 ? clothIndex : 0];
  const cl = look.clothes;

  background(ctx);
  const r = makeRaster(CLOSE_W, CLOSE_H);

  // 뒷머리
  const pHairBack = r.part(hair);
  hairBack(r, pHairBack, look.hairStyle);
  // 몸통 (어깨선이 둥글게 퍼진다)
  const pTorso = r.part(cloth);
  r.fill(pTorso, 30, 60, 130, 99, (x, y) => {
    const half = 15 + Math.min(27, (y - 60) * 2.4);
    const top = y >= 60 + Math.max(0, Math.abs(x - 80) - 28) * 0.18;
    return Math.abs(x + 0.5 - 80) <= half && top;
  });
  if (v.waist) r.ellipse(pTorso, 120, 90, 6, 6);
  // 목
  const pNeck = r.part(skin);
  r.round(pNeck, 72, 52, 16, 14, 3);
  // 귀
  const pEars = r.part(skin);
  r.ellipse(pEars, 59, 37, 4.5, 7.5);
  r.ellipse(pEars, 101, 37, 4.5, 7.5);
  // 머리 (턱이 좁아지는 계란형)
  const pHead = r.part(skin, { shine: true });
  r.fill(pHead, 58, 10, 102, 58, (x, y) => {
    const ny = (y + 0.5 - 33) / 23;
    const narrow = ny > 0 ? 1 - ny * 0.32 : 1;
    return ((x + 0.5 - 80) / (20.5 * narrow)) ** 2 + ny ** 2 <= 1;
  });
  // 앞머리
  const pHair = r.part(hair, { shine: true });
  hairFront(r, pHair, look.hairStyle);
  // 책상
  const pDesk = r.part(WOOD, { flat: true });
  r.rect(pDesk, 0, 96, CLOSE_W, 24);
  // 팔
  const pose = v.pose;
  const pArmL = r.part(cloth);
  r.round(pArmL, 29, 68, 15, 34, 5);
  const pSkinL = r.part(skin);
  if (v.sleeves) r.round(pSkinL, 30, 84, 13, 16, 4);
  r.ellipse(pSkinL, 37, 100, 7, 4.5);
  const pArmR = r.part(cloth);
  const pSkinR = r.part(skin, { shine: true });
  if (pose === 'glasses' || pose === 'ear') {
    const hx = pose === 'glasses' ? 98 : 104;
    const hy = pose === 'glasses' ? 33 : 38;
    r.round(pArmR, 112, 52, 14, 50, 6);
    r.fill(pArmR, hx, hy, 126, 60, (x, y) => Math.abs(x - (hx + 6 + (y - hy) * 0.35)) <= 6);
    r.ellipse(pSkinR, hx + 3, hy, 6, 5.5);
  } else if (pose === 'belly') {
    r.round(pArmR, 116, 68, 15, 34, 5);
    r.ellipse(pSkinR, 122, 100, 7, 4.5);
    r.round(pArmL, 40, 82, 26, 10, 4);
    r.ellipse(pSkinL, 68, 87, 6, 5);
  } else {
    r.round(pArmR, 116, 68, 15, 34, 5);
    if (v.sleeves) r.round(pSkinR, 117, 84, 13, 16, 4);
    r.ellipse(pSkinR, 123, 100, 7, 4.5);
  }
  r.render(ctx);

  // 소매 끝
  if (v.sleeves) { px(ctx, 29, 83, 15, 2, cloth[1]); if (pose !== 'glasses' && pose !== 'ear' && pose !== 'belly') px(ctx, 116, 83, 15, 2, cloth[1]); }
  // 책상 가장자리
  px(ctx, 0, 96, CLOSE_W, 1, WOOD[0]);
  px(ctx, 0, 97, CLOSE_W, 1, WOOD[3]);
  for (let x = 6; x < CLOSE_W; x += 23) px(ctx, x, 104 + (x % 5), 9, 1, WOOD[1]);

  // 귓구멍과 이어폰
  px(ctx, 101, 34, 2, 6, skin[1]);
  px(ctx, 102, 35, 1, 4, C.canal);
  px(ctx, 58, 34, 2, 6, skin[1]);
  if (v.earBlob && pose !== 'ear') stamp(ctx, 101, 35, ['bw', 'bb', 'bb'], { b: C.blob, w: C.white });

  clothesDetail(ctx, v, cl, cloth);
  if (v.pocketBulge) {
    const w = v.pocketBulge === 'phone' ? 10 : 7;
    const h = v.pocketBulge === 'phone' ? 13 : 6;
    px(ctx, 47, 82, w, h, cloth[1]);
    px(ctx, 47, 82, w, 1, cloth[3]);
    px(ctx, 47, 82, 1, h, cloth[3]);
  }
  if (v.buzz) stamp(ctx, 126, 84, ['.y.y', 'y.y.', '....', '.y.y', 'y.y.'], { y: C.buzz });
  buttons(ctx, v);
  face(ctx, v, skin, hair);
  if (v.glasses && !v.glasses.off) glassesOnFace(ctx, v.glasses);

  desk(ctx, v);
  // 손을 책상 물건 위로 다시 (손이 종이를 누르는 느낌)
  const hand = ['.oooooooo.', 'ollllllmmo', 'olmlmlmlmo', '.oooooooo.'];
  const handCol = { o: skin[0], l: skin[3], m: skin[2] };
  if (pose !== 'belly') stamp(ctx, 32, 97, hand, handCol);
  if (pose === 'desk' || pose === 'tap' || pose === 'belly') stamp(ctx, 118, 97, hand, handCol);
  if (v.watch) watch(ctx, v.watch, 31, 86);
  if (v.paper !== 'none') {
    if (pose === 'penUp') pen(ctx, v.fakePen, 118, 76, true);
    else pen(ctx, v.fakePen, 88, 113, false);
  }
  if (pose === 'tap') stamp(ctx, 116, 91, ['k..k', '.k..', 'k..k'], { k: C.ink });

  if (v.idPhoto) idInset(ctx, v, skin, hair, cloth);
  if (v.glasses && v.glasses.off) glassesInset(ctx, v.glasses);
  else if (v.pockets) pocketsInset(ctx, v.pockets);
}
