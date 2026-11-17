// 결과 공유 카드(1080x1350) 이미지 만들기
import { drawScene, SCENE_W, SCENE_H } from './pixel.js';
import { label, student } from './game.js';

const CARD_W = 1080;
const CARD_H = 1350;

const K = {
  board: '#1f332c',
  paper: '#eef0ea',
  ink: '#1b1f1d',
  muted: '#6d7a72',
  omr: '#d23a5c',
  omrSoft: '#f3d3db',
  line: '#c9cfc6',
};

function wrapLines(ctx, text, maxWidth) {
  const lines = [];
  let line = '';
  for (const ch of text) {
    const next = line + ch;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = ch === ' ' ? '' : ch;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export function renderCard(state) {
  const canvas = document.createElement('canvas');
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext('2d');
  const r = state.result;
  const serif = '"Nanum Myeongjo", "Noto Serif KR", serif';
  const sans = '"IBM Plex Sans KR", "Apple SD Gothic Neo", sans-serif';

  ctx.fillStyle = K.board;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // 종이
  const px = 60, py = 60, pw = CARD_W - 120, ph = CARD_H - 120;
  ctx.fillStyle = K.paper;
  ctx.fillRect(px, py, pw, ph);
  ctx.fillStyle = K.omr;
  ctx.fillRect(px, py, pw, 14);

  ctx.fillStyle = K.muted;
  ctx.font = `600 30px ${sans}`;
  ctx.textBaseline = 'top';
  ctx.fillText(`시험실 ${state.room} · 감독 보고서`, px + 56, py + 56);

  // 도트 장면
  const scene = document.createElement('canvas');
  scene.width = SCENE_W;
  scene.height = SCENE_H;
  drawScene(scene.getContext('2d'), state, { t: 1000, reduceMotion: true });
  ctx.imageSmoothingEnabled = false;
  const sw = SCENE_W * 4;
  const sh = SCENE_H * 4;
  ctx.drawImage(scene, px + (pw - sw) / 2, py + 110, sw, sh);

  // 등급
  let y = py + 110 + sh + 50;
  ctx.fillStyle = K.ink;
  ctx.font = `800 150px ${serif}`;
  ctx.fillText(String(r.grade), px + 56, y);
  const gw = ctx.measureText(String(r.grade)).width;
  ctx.font = `800 60px ${serif}`;
  ctx.fillStyle = K.ink;
  ctx.fillText('등급', px + 56 + gw + 14, y + 72);
  ctx.fillStyle = K.omr;
  ctx.font = `700 46px ${sans}`;
  ctx.fillText(r.title, px + 56, y + 150);

  y += 220;
  ctx.fillStyle = K.line;
  ctx.fillRect(px + 56, y, pw - 112, 2);
  y += 28;
  ctx.fillStyle = K.ink;
  ctx.font = `500 34px ${sans}`;
  const stats = r.total === 0
    ? `부정행위자 없음 · 잘못 지목 ${r.falseCount}명 · 민원 ${state.complaints}건`
    : `적발 ${r.caught}/${r.total} · 잘못 지목 ${r.falseCount}명 · 민원 ${state.complaints}건`;
  ctx.fillText(stats, px + 56, y);

  // 명대사
  y += 76;
  ctx.fillStyle = K.muted;
  ctx.font = `600 28px ${sans}`;
  ctx.fillText('오늘의 명대사', px + 56, y);
  y += 46;
  ctx.fillStyle = K.ink;
  ctx.font = `700 38px ${serif}`;
  const quote = r.quote ? `“${r.quote.text}”` : '“……” (아무와도 말하지 않았다)';
  wrapLines(ctx, quote, pw - 112).slice(0, 2).forEach((line) => {
    ctx.fillText(line, px + 56, y);
    y += 56;
  });
  if (r.quote) {
    ctx.fillStyle = K.muted;
    ctx.font = `500 30px ${sans}`;
    ctx.fillText(`— ${label(student(state, r.quote.seat))} 수험생`, px + 56, y + 4);
  }

  // 하단
  ctx.fillStyle = K.omrSoft;
  ctx.fillRect(px, py + ph - 110, pw, 110);
  ctx.fillStyle = K.ink;
  ctx.font = `700 34px ${sans}`;
  ctx.fillText('수능 감독관', px + 56, py + ph - 76);
  ctx.fillStyle = K.muted;
  ctx.font = `500 28px ${sans}`;
  const tail = `같은 시험실 도전: 시험실 번호 ${state.room}`;
  ctx.fillText(tail, px + pw - 56 - ctx.measureText(tail).width, py + ph - 72);

  return canvas;
}
