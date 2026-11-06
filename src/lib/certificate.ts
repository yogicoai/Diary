// 상장 그림 (1080×1350, 인스타 4:5). 옛날 학교 상장 모양 + 참 잘했어요 도장.

import { drawStamp } from "./card";

function cssVar(el: HTMLElement, name: string, fallback: string) {
  return getComputedStyle(el).getPropertyValue(name).trim() || fallback;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const lines: string[] = [];
  let cur = "";
  for (const word of text.split(" ")) {
    const next = cur ? `${cur} ${word}` : word;
    if (ctx.measureText(next).width > maxW && cur) {
      lines.push(cur);
      cur = word;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines;
}

export async function renderCertificate(a: { label: string; detail: string; nameTag: string; at: number }) {
  const kid = cssVar(document.body, "--font-kid", "cursive");
  const ui = cssVar(document.body, "--font-ui", "sans-serif");
  const red = cssVar(document.documentElement, "--red", "#d63d2f");
  try {
    await Promise.all([
      document.fonts.load(`700 80px ${kid}`, a.label + "상장"),
      document.fonts.load(`40px ${ui}`, a.detail + a.nameTag + "위 어린이는 그래서 이 상장을 줍니다 참잘했어요그림일기선생님"),
    ]);
  } catch {
    /* 기본 글꼴로 */
  }

  const W = 1080,
    H = 1350;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;

  ctx.fillStyle = "#fffcf2";
  ctx.fillRect(0, 0, W, H);
  // 테두리: 굵은 금빛 + 가는 갈색 + 모서리 꽃잎
  ctx.strokeStyle = "#c9a14a";
  ctx.lineWidth = 18;
  ctx.strokeRect(48, 48, W - 96, H - 96);
  ctx.strokeStyle = "#8a6a3b";
  ctx.lineWidth = 3;
  ctx.strokeRect(76, 76, W - 152, H - 152);
  ctx.fillStyle = "#c9a14a";
  for (const [x, y] of [
    [76, 76],
    [W - 76, 76],
    [76, H - 76],
    [W - 76, H - 76],
  ]) {
    for (let k = 0; k < 4; k++) {
      ctx.beginPath();
      ctx.ellipse(x, y, 22, 9, (k * Math.PI) / 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.textAlign = "center";
  ctx.fillStyle = "#2f2620";
  ctx.font = `700 132px ${kid}`;
  ctx.fillText("상   장", W / 2, 290);

  ctx.font = `700 64px ${kid}`;
  ctx.fillStyle = red;
  ctx.fillText(a.label, W / 2, 430);

  ctx.fillStyle = "#2f2620";
  ctx.font = `44px ${ui}`;
  ctx.fillText(a.nameTag, W / 2, 540);

  ctx.font = `40px ${ui}`;
  const body = `위 어린이는 ${a.detail}. 그 마음이 참 예뻐서 이 상장을 줍니다.`;
  wrap(ctx, body, W - 300).forEach((ln, i) => ctx.fillText(ln, W / 2, 680 + i * 66));

  const d = new Date(a.at);
  ctx.font = `38px ${ui}`;
  ctx.fillText(`${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`, W / 2, 1010);
  ctx.font = `700 50px ${kid}`;
  ctx.fillText("참 잘했어요 그림일기 선생님", W / 2 - 40, 1120);
  drawStamp(ctx, W / 2 + 330, 1100, 92, red, kid);

  return c;
}
