// 공유 카드 (1080×1920, 인스타 스토리 비율)를 캔버스로 그린다.
// 글꼴과 색은 지금 화면의 CSS 변수에서 읽어서, 고른 일기장 테마가 그대로 카드에 나온다.

import { bgImage, loadImage } from "./backgrounds";
import { crayonPattern, renderStrokes } from "./crayon";
import { drawSticker, STICKERS } from "./stickers";
import { stampDraw } from "./stamps";
import { COLS, ROWS, layoutCells, rowSpans } from "./manuscript";
import { koreanDate } from "./date";
import { weatherChoices } from "./weather";
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

  const allText =
    d.title + d.body + koreanDate(d.date) + d.teacher + "참잘했어요날씨제목어른이그림일기" + STICKERS.map((s) => s.text).join("");
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
  const skies = weatherChoices(d.weather);
  const iconSize = 42;
  const gap = 52;
  const iconsW = gap * skies.length - (gap - iconSize);
  let ix = x0 + cw - iconsW;
  ctx.font = `30px ${ui}`;
  ctx.fillStyle = color.line;
  ctx.textAlign = "right";
  ctx.fillText("날씨", ix - 34, y + 40);
  ctx.textAlign = "left";
  for (const w of skies) {
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
      ctx.ellipse(ix + iconSize / 2, y + 40, iconSize * 0.7, iconSize * 0.62, -0.15, 0.2, Math.PI * 2 + 0.45);
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
  const bgUrl = bgImage(d.bg); // 고른 배경 또는 AI 그림 (같은 사이트 주소라 캔버스에 그릴 수 있다)
  if (bgUrl) {
    try {
      const img = await loadImage(bgUrl);
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
  // 칭찬 스티커가 붙을 오른쪽은 비운다
  ctx.fillText(d.title || "", x0 + 90, y + 40, d.stickers?.length ? cw - 120 - Math.min(3, d.stickers.length) * 125 : cw - 100);
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
  // 비밀 일기·게시판 '그림만 붙이기': 글씨는 아예 쓰지 않는다 (11-10: 덧칠 사이로 글자가 비쳐 보이던 것 — 글이 새지 않게)
  if (!d.secret) {
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
  } else if (d.body.trim()) {
    // 글이 있던 줄만 크레파스로 박박 칠한 자국 (연한 회색, 촘촘한 지그재그) + 빨간 펜 "쉿, 글은 비밀이에요"
    ctx.save();
    ctx.strokeStyle = crayonPattern(ctx, color.ink, 2);
    ctx.globalAlpha = 0.42;
    ctx.lineWidth = cell * 0.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const step = cell * 0.34;
    rowSpans(d.body).forEach((n, r) => {
      if (!n) return;
      const cy = y + r * cell + cell / 2;
      const right = x0 + Math.max(2, n) * cell - 14;
      ctx.beginPath();
      ctx.moveTo(x0 + 14, cy);
      let up = true;
      for (let xx = x0 + 14; xx < right; xx += step, up = !up) ctx.lineTo(Math.min(right, xx + step), cy + (up ? -1 : 1) * cell * 0.24);
      ctx.stroke();
    });
    ctx.restore();
    ctx.save();
    const label = "쉿, 글은 비밀이에요";
    ctx.font = `${Math.round(cell * 0.72)}px ${pen}`;
    const lw = ctx.measureText(label).width + cell * 0.8;
    const ly = y + Math.min(ROWS, Math.max(1, rowSpans(d.body).filter(Boolean).length)) * cell * 0.5;
    ctx.fillStyle = color.paper;
    ctx.globalAlpha = 0.92;
    ctx.beginPath();
    ctx.roundRect(x0 + (cw - lw) / 2, ly - cell * 0.5, lw, cell, cell * 0.3);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = color.red;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.translate(x0 + cw / 2, ly);
    ctx.rotate(-0.03);
    ctx.fillText(label, 0, 2);
    ctx.restore();
  }
  // 선생님 빨간 물결 밑줄 (검사한 흔적)
  if (!d.secret) {
    ctx.save();
    ctx.strokeStyle = color.red;
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    rowSpans(d.body).forEach((n, r) => {
      if (!n) return;
      const ly = y + (r + 1) * cell - 7;
      ctx.beginPath();
      ctx.moveTo(x0 + 6, ly);
      for (let xx = x0 + 6; xx < x0 + n * cell - 6; xx += 22) {
        ctx.quadraticCurveTo(xx + 5.5, ly - 6, xx + 11, ly);
        ctx.quadraticCurveTo(xx + 16.5, ly + 6, xx + 22, ly);
      }
      ctx.stroke();
    });
    ctx.restore();
  }
  const gridTop = y;
  y += ROWS * cell + 30;

  // 선생님 한 줄
  ctx.save();
  ctx.translate(x0 + 10, y + 50);
  ctx.rotate(-0.025);
  ctx.fillStyle = color.red;
  // 도장 자리를 비우고 띄어쓰기 단위로 줄바꿈. 세 줄을 넘으면 글씨를 줄인다
  const maxW = cw - 250;
  const wrap = (px: number) => {
    ctx.font = `${px}px ${pen}`;
    const out: string[] = [""];
    for (const w of d.teacher.split(" ")) {
      const cur = out[out.length - 1];
      const next = cur ? `${cur} ${w}` : w;
      if (ctx.measureText(next).width > maxW && cur) out.push(w);
      else out[out.length - 1] = next;
    }
    return out;
  };
  let size = 64;
  let lines = wrap(size);
  while (lines.length > 3 && size > 44) lines = wrap((size -= 4));
  const lh = size * 1.08;
  lines.forEach((ln, i) => ctx.fillText(ln, 0, i * lh - (lines.length - 1) * lh * 0.45, maxW));
  ctx.restore();

  // 선생님 칭찬 스티커: 원고지 오른쪽 위 귀퉁이에
  const spots = [
    [x0 + cw - 40, gridTop - 78, 0.2],
    [x0 + cw - 165, gridTop - 94, -0.17],
    [x0 + cw - 290, gridTop - 80, 0.1],
  ];
  (d.stickers ?? []).slice(0, 3).forEach((id, i) => drawSticker(ctx, id, spots[i][0], spots[i][1], 150, spots[i][2], kid));

  // 도장
  drawStamp(ctx, px + pw - 120, py + ph - 125, 108, color.red, kid, d.stamp);

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
  stamp?: string | null,
) {
  const g = stampDraw(stamp);
  const k = r / 45; // 도장 모양은 100×100 칸, 바깥 동그라미 반지름 45
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.24);
  ctx.scale(k, k);
  ctx.translate(-50, -50);
  // 도장은 크레파스보다 진하게: 단색 + 살짝 비침
  ctx.globalAlpha = 0.86;
  ctx.strokeStyle = red;
  ctx.fillStyle = red;
  ctx.lineJoin = "round";
  for (const p of g.outline) {
    ctx.lineWidth = p.w;
    ctx.stroke(new Path2D(p.d));
  }
  if (g.motif) ctx.fill(new Path2D(g.motif));
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  for (const t of g.text) {
    ctx.font = `700 ${t.size}px ${kidFont}`;
    ctx.fillText(t.t, 50, t.y);
  }
  ctx.restore();
}

export function canvasToBlob(c: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    c.toBlob((b) => (b ? resolve(b) : reject(new Error("이미지를 만들지 못했어요"))), "image/png"),
  );
}
