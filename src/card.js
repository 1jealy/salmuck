// 결과 공유 카드(1080x1350)
import { drawScene, SCENE_W, SCENE_H } from './pixel.js';
import { SCHEMES } from './data.js';

const W = 1080;
const H = 1350;
const K = { page: '#1b1f27', box: '#0d1015', line: '#f2efe6', text: '#f4f1e8', dim: '#a9b1bb', yellow: '#ffd84a', shadow: '#6b4f00', red: '#ff6b6b', green: '#69db7c' };
const FONT = '"Galmuri11", "Apple SD Gothic Neo", monospace';

function box(ctx, x, y, w, h) {
  ctx.fillStyle = K.box;
  ctx.fillRect(x - 9, y - 9, w + 18, h + 18);
  ctx.fillStyle = K.line;
  ctx.fillRect(x - 6, y - 6, w + 12, h + 12);
  ctx.fillStyle = K.box;
  ctx.fillRect(x, y, w, h);
}

function text(ctx, str, x, y, size, color, weight = 400) {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
  return ctx.measureText(str).width;
}

export function renderCard(state) {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const r = state.result;
  ctx.textBaseline = 'top';
  ctx.fillStyle = K.page;
  ctx.fillRect(0, 0, W, H);

  // 장면
  const scene = document.createElement('canvas');
  scene.width = SCENE_W;
  scene.height = SCENE_H;
  drawScene(scene.getContext('2d'), state, { reduceMotion: true });
  const sw = SCENE_W * 4;
  const sh = SCENE_H * 4;
  const sx = (W - sw) / 2;
  box(ctx, sx, 60, sw, sh);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(scene, sx, 60, sw, sh);

  // 등급 상자
  const by = 60 + sh + 48;
  box(ctx, sx, by, sw, H - by - 60);
  let y = by + 36;
  text(ctx, `수능 감독관 · 시험실 ${state.room}`, sx + 40, y, 33, K.dim);
  y += 64;
  const g = String(r.grade);
  text(ctx, g, sx + 44, y + 6, 132, K.shadow, 700);
  const gw = text(ctx, g, sx + 40, y, 132, K.yellow, 700);
  text(ctx, '등급', sx + 56 + gw, y + 70, 55, K.text, 700);
  y += 160;
  text(ctx, r.title, sx + 40, y, 44, K.yellow, 700);
  y += 76;

  let line;
  if (r.scheme) {
    const name = SCHEMES[r.scheme.key].name;
    line = r.scheme.state === 'caught' ? `${name} 적발` : r.scheme.state === 'flagged' ? `${name} 사후 조사로 적발` : `${name}를 놓쳤다`;
    text(ctx, line, sx + 40, y, 36, r.scheme.state === 'missed' ? K.red : K.green);
  } else {
    text(ctx, '계획형 부정행위자 없음', sx + 40, y, 36, K.green);
  }
  y += 58;
  text(ctx, `예방 ${r.prevented} · 처리 ${r.reported} · 봐줌 ${r.excused} · 놓침 ${r.missedSlip} · 민원 ${r.complaints}`, sx + 40, y, 30, K.dim);
  return canvas;
}
