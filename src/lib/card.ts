// 공유 카드 (1080×1920, 인스타 스토리 비율)를 캔버스로 그린다.
// 글꼴과 색은 지금 화면의 CSS 변수에서 읽어서, 고른 일기장 테마가 그대로 카드에 나온다.

import { bgById, bgSrc, loadImage } from "./backgrounds";
import { crayonPattern, renderStrokes } from "./crayon";
import { COLS, ROWS, layoutCells } from "./manuscript";
import { koreanDate } from "./date";
import { WEATHERS } from "./weather";
import type { Diary } from "./store";

export const CARD_W = 1080;
export const CARD_H = 1920;

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function fontFamily(varName: string, fallback: string) {
  // next/font 변수는 body 쪽에 걸려 있으니 body에서 읽는다
  const v = getComputedStyle(document.body).getPropertyValue(varName).trim();
  return v || fallback;
}

export async function renderCard(d: Diary): Promise<HTMLCanvasElement> {
  const kid = fontFamily("--font-kid", "cursive");
  const pen = fontFamily("--font-pen", "cursive");
  const ui = fontFamily("--font-ui", "sans-serif");
  const color = {
    desk: cssVar("--desk") || "#efe6d2",
    paper: cssVar("--paper") || "#fffdf6",
    ink: cssVar("--ink") || "#2b2622",
    line: cssVar("--line") || "#8c7b6b",
    red: cssVar("--red") || "#d2402f",
  };

  const allText = d.title + d.body + koreanDate(d.date) + d.teacher + "참잘했어요날씨제목어른이그림일기";
  try {
    await Promise.all([
      document.fonts.load(`64px ${kid}`, allText),
      document.fonts.load(`700 64px ${kid}`, allText),
      document.fonts.load(`64px ${pen}`, allText),
      document.fonts.load(`32px ${ui}`, allText),
    ]);
  } catch {
    /* 글꼴을 못 불러도 기본 글꼴로 그린다 */
  }

  const c = document.createElement("canvas");
  c.width = CARD_W;
  c.height = CARD_H;
  const ctx = c.getContext("2d")!;

  // 책상
  ctx.fillStyle = color.desk;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // 일기장 한 쪽
  const px = 60,
    py = 100,
    pw = 960,
    ph = 1700;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.12)";
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 10;
  ctx.fillStyle = color.paper;
  ctx.fillRect(px, py, pw, ph);
  ctx.restore();
  ctx.strokeStyle = color.ink;
  ctx.lineWidth = 5;
  ctx.strokeRect(px, py, pw, ph);

  const x0 = px + 36;
  const cw = pw - 72;
  let y = py + 40;

  // 날짜
  ctx.fillStyle = color.ink;
  ctx.textBaseline = "middle";
  ctx.font = `700 46px ${kid}`;
  ctx.fillText(koreanDate(d.date), x0, y + 40);

  // 날씨
  const iconSize = 46;
  const gap = 58;
  const iconsW = gap * WEATHERS.length - (gap - iconSize);
  let ix = x0 + cw - iconsW;
  ctx.font = `30px ${ui}`;
  ctx.fillStyle = color.line;
  ctx.textAlign = "right";
  ctx.fillText("날씨", ix - 34, y + 40);
  ctx.textAlign = "left";
  for (const w of WEATHERS) {
    ctx.save();
    ctx.translate(ix, y + 40 - iconSize / 2);
    ctx.scale(iconSize / 24, iconSize / 24);
    ctx.strokeStyle = color.ink;
    ctx.lineWidth = 1.6;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke(new Path2D(w.path));
    ctx.restore();
    if (w.id === d.weather) {
      ctx.save();
      ctx.strokeStyle = crayonPattern(ctx, color.red);
      ctx.lineWidth = 7;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.ellipse(ix + iconSize / 2, y + 40, iconSize * 0.78, iconSize * 0.68, -0.15, 0.2, Math.PI * 2 + 0.45);
      ctx.stroke();
      ctx.restore();
    }
    ix += gap;
  }

  y += 100;
  ctx.strokeStyle = color.ink;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x0, y);
  ctx.lineTo(x0 + cw, y);
  ctx.stroke();

  // 그림칸
  y += 24;
  const dh = Math.round(cw * 0.75);
  ctx.lineWidth = 3;
  const bgItem = bgById(d.bg);
  if (bgItem) {
    try {
      const img = await loadImage(bgSrc(bgItem.id));
      // 4:3 칸에 꽉 차게
      const s = Math.max(cw / img.width, dh / img.height);
      const sw = cw / s,
        sh = dh / s;
      ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x0, y, cw, dh);
    } catch {
      /* 배경을 못 불러도 그림은 그린다 */
    }
  }
  ctx.strokeRect(x0, y, cw, dh);
  if (d.strokes.length) {
    const art = renderStrokes(d.strokes, cw, dh, 2.2);
    ctx.drawImage(art, x0, y);
  }
  y += dh + 24;

  // 제목
  ctx.fillStyle = color.line;
  ctx.font = `32px ${ui}`;
  ctx.fillText("제목", x0, y + 40);
  ctx.fillStyle = color.ink;
  ctx.font = `700 54px ${kid}`;
  ctx.fillText(d.title || "", x0 + 90, y + 40, cw - 100);
  ctx.strokeStyle = color.line;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x0 + 80, y + 76);
  ctx.lineTo(x0 + cw, y + 76);
  ctx.stroke();
  y += 100;

  // 원고지
  const cell = cw / COLS;
  ctx.strokeStyle = color.line;
  ctx.lineWidth = 2;
  for (let r = 0; r <= ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(x0, y + r * cell);
    ctx.lineTo(x0 + cw, y + r * cell);
    ctx.stroke();
  }
  for (let col = 0; col <= COLS; col++) {
    ctx.beginPath();
    ctx.moveTo(x0 + col * cell, y);
    ctx.lineTo(x0 + col * cell, y + ROWS * cell);
    ctx.stroke();
  }
  const cells = layoutCells(d.body);
  ctx.fillStyle = color.ink;
  ctx.font = `700 ${Math.round(cell * 0.66)}px ${kid}`;
  ctx.textAlign = "center";
  cells.forEach((ch, i) => {
    if (!ch) return;
    const r = Math.floor(i / COLS);
    const col = i % COLS;
    ctx.fillText(ch, x0 + col * cell + cell / 2, y + r * cell + cell / 2 + 3);
  });
  ctx.textAlign = "left";

  // 비밀 일기: 글씨 위를 크레파스로 박박 칠한다
  if (d.secret) {
    const usedRows = Math.max(1, Math.ceil(cells.length / COLS));
    ctx.save();
    ctx.strokeStyle = crayonPattern(ctx, color.ink, 2);
    ctx.lineWidth = cell * 0.5;
    ctx.lineCap = "round";
    for (let r = 0; r < usedRows; r++) {
      const cy = y + r * cell + cell / 2;
      ctx.beginPath();
      ctx.moveTo(x0 + 10, cy - cell * 0.18);
      for (let k = 0; k < 14; k++) {
        const xx = x0 + 10 + (k + 1) * ((cw - 20) / 14);
        ctx.lineTo(xx, cy + (k % 2 ? -1 : 1) * cell * 0.2);
      }
      ctx.stroke();
    }
    ctx.restore();
  }
  y += ROWS * cell + 30;

  // 선생님 한 줄
  ctx.save();
  ctx.translate(x0 + 10, y + 50);
  ctx.rotate(-0.025);
  ctx.fillStyle = color.red;
  ctx.font = `66px ${pen}`;
  ctx.fillText(d.teacher, 0, 0, cw - 250);
  ctx.restore();

  // 도장
  drawStamp(ctx, px + pw - 120, py + ph - 125, 108, color.red, kid);

  // 바닥 글씨
  ctx.fillStyle = color.ink;
  ctx.globalAlpha = 0.45;
  ctx.font = `30px ${ui}`;
  ctx.textAlign = "center";
  ctx.fillText("참 잘했어요 · 어른이 그림일기", CARD_W / 2, CARD_H - 60);
  ctx.globalAlpha = 1;
  ctx.textAlign = "left";

  return c;
}

export function drawStamp(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  red: string,
  kidFont: string,
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.24);
  // 도장은 크레파스보다 진하게: 단색 + 살짝 비침
  ctx.globalAlpha = 0.86;
  ctx.strokeStyle = red;
  ctx.fillStyle = red;
  ctx.lineWidth = r * 0.08;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = r * 0.03;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.84, 0, Math.PI * 2);
  ctx.stroke();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `700 ${Math.round(r * 0.62)}px ${kidFont}`;
  ctx.fillText("참", 0, -r * 0.26);
  ctx.font = `700 ${Math.round(r * 0.34)}px ${kidFont}`;
  ctx.fillText("잘했어요", 0, r * 0.32);
  ctx.restore();
}

export function canvasToBlob(c: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    c.toBlob((b) => (b ? resolve(b) : reject(new Error("이미지를 만들지 못했어요"))), "image/png"),
  );
}
