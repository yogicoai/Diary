// 그림칸 미리보기 (배경 + 크레파스 획) → 캔버스. 게시판 미리보기·우리 반 피드에 쓴다.

import { bgById, bgSrc, loadImage } from "./backgrounds";
import { renderStrokes, type Stroke } from "./crayon";

export async function renderThumb(d: { strokes: Stroke[]; bg?: string | null }, w = 480, h = 360) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  const paper = getComputedStyle(document.documentElement).getPropertyValue("--paper").trim() || "#fffaf0";
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, w, h);
  const b = bgById(d.bg);
  if (b) {
    try {
      const img = await loadImage(bgSrc(b.id));
      const s = Math.max(w / img.width, h / img.height);
      const sw = w / s,
        sh = h / s;
      ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, 0, 0, w, h);
    } catch {
      /* 배경 없이 */
    }
  }
  if (d.strokes.length) ctx.drawImage(renderStrokes(d.strokes, w, h, w / 900), 0, 0);
  return c;
}

export function canvasBlob(c: HTMLCanvasElement, type = "image/webp", quality = 0.86): Promise<Blob> {
  return new Promise((resolve, reject) =>
    c.toBlob((b) => (b ? resolve(b) : reject(new Error("그림을 만들지 못했어요"))), type, quality),
  );
}
