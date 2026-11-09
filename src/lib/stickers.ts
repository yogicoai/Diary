// 선생님 칭찬 스티커 (11-09 사용자: 선생님이 재치 있는 답장 + 이야기에 맞는 칭찬 스티커를 다양하게 → 재미의 핵심)
// 화면(SVG)과 카드(Canvas Path2D)가 같은 모양을 쓴다. 저장된 일기가 id 로 참조하니 id 를 바꾸지 말고 끝에 추가.

export type StickerShape = "star" | "burst" | "heart" | "circle" | "ribbon" | "flower" | "cloud";

export type PraiseSticker = {
  id: string;
  text: string;
  meaning: string; // Claude 가 고를 때 보는 설명
  shape: StickerShape;
  fill: string;
  stroke: string;
  ink: string; // 글씨 색
};

export const STICKERS: PraiseSticker[] = [
  { id: "best", text: "최고예요", meaning: "정말 잘한 일, 자랑할 만한 하루", shape: "star", fill: "#f6c945", stroke: "#c99a1d", ink: "#6b3f00" },
  { id: "great", text: "훌륭해요", meaning: "어른스럽게 해낸 일, 책임감", shape: "ribbon", fill: "#5aa9e6", stroke: "#2f5fb3", ink: "#ffffff" },
  { id: "cool", text: "멋져요", meaning: "새로운 도전, 멋진 선택", shape: "burst", fill: "#f28a2e", stroke: "#b35a12", ink: "#ffffff" },
  { id: "cheer", text: "힘내요", meaning: "속상하거나 힘든 날 응원", shape: "heart", fill: "#f08fb0", stroke: "#c8577c", ink: "#ffffff" },
  { id: "thanks", text: "수고했어요", meaning: "일·공부·집안일을 끝까지 한 날", shape: "circle", fill: "#4fa35b", stroke: "#2f6b38", ink: "#ffffff" },
  { id: "yum", text: "맛있었겠다", meaning: "맛있는 걸 먹은 날", shape: "circle", fill: "#e0453a", stroke: "#a1281f", ink: "#ffffff" },
  { id: "envy", text: "부럽다", meaning: "여행·쉬는 날·좋은 일, 선생님이 부러운 날", shape: "cloud", fill: "#b39ddb", stroke: "#7e57c2", ink: "#ffffff" },
  { id: "brave", text: "용감해요", meaning: "무서운 일·귀찮은 일을 이겨 낸 날", shape: "burst", fill: "#e0453a", stroke: "#a1281f", ink: "#ffffff" },
  { id: "rest", text: "푹 쉬어요", meaning: "피곤한 날, 아픈 날, 잠이 필요한 날", shape: "circle", fill: "#3d4f8f", stroke: "#26335f", ink: "#ffe08a" },
  { id: "sweet", text: "다정해요", meaning: "가족·친구·연인을 챙긴 날", shape: "flower", fill: "#f8b4c8", stroke: "#c8577c", ink: "#8a2c4a" },
  { id: "proud", text: "기특해요", meaning: "작은 일이라도 스스로 해낸 날", shape: "flower", fill: "#ffd166", stroke: "#c99a1d", ink: "#6b3f00" },
  { id: "laugh", text: "웃음 만점", meaning: "웃긴 일, 즐거운 일이 있던 날", shape: "circle", fill: "#ffd166", stroke: "#c99a1d", ink: "#6b3f00" },
  { id: "hundred", text: "100점", meaning: "완벽했던 하루, 장난스럽게 만점 주고 싶은 날", shape: "circle", fill: "#ffffff", stroke: "#e0453a", ink: "#e0453a" },
  { id: "bravo", text: "짝짝짝", meaning: "축하할 일, 해낸 일", shape: "burst", fill: "#4fa35b", stroke: "#2f6b38", ink: "#ffffff" },
  { id: "dream", text: "꿈 많은 날", meaning: "설레는 계획, 꿈, 상상", shape: "cloud", fill: "#9fd3f5", stroke: "#2f5fb3", ink: "#1f3f7a" },
  { id: "cozy", text: "포근해요", meaning: "따뜻하고 편안한 하루, 집콕", shape: "heart", fill: "#f6c7a1", stroke: "#8a5a3b", ink: "#6b3a1f" },
];

export const STICKER_IDS = STICKERS.map((s) => s.id);
export const stickerById = (id: string) => STICKERS.find((s) => s.id === id);

/** 받은 목록을 정리: 아는 것만, 겹치지 않게, 1~3개 */
export function cleanStickers(ids: unknown, fallback: string[] = ["best"]): string[] {
  const out = Array.isArray(ids) ? [...new Set(ids.filter((x): x is string => typeof x === "string" && STICKER_IDS.includes(x)))] : [];
  return (out.length ? out : fallback).slice(0, 3);
}

// ---- 모양 (100×100 칸) ----
function star(points: number, outer: number, inner: number, cx = 50, cy = 52): string {
  let d = "";
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 ? inner : outer;
    const a = (Math.PI * i) / points - Math.PI / 2;
    d += `${i ? "L" : "M"}${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)} `;
  }
  return d + "Z";
}
const circle = (cx: number, cy: number, r: number) => `M${cx - r} ${cy} a${r} ${r} 0 1 0 ${r * 2} 0 a${r} ${r} 0 1 0 ${-r * 2} 0 Z`;

const PATHS: Record<StickerShape, { body: string; extra?: string }> = {
  star: { body: star(5, 48, 24) },
  burst: { body: star(14, 48, 39, 50, 50) },
  heart: { body: "M50 90 C 22 70 5 52 8 32 C 11 14 33 8 50 26 C 67 8 89 14 92 32 C 95 52 78 70 50 90 Z" },
  circle: { body: circle(50, 50, 45) },
  ribbon: {
    body: circle(50, 42, 38),
    extra: "M30 70 L22 98 L36 90 L44 99 L50 76 Z M70 70 L78 98 L64 90 L56 99 L50 76 Z",
  },
  flower: {
    body: [0, 1, 2, 3, 4, 5].map((k) => circle(50 + 28 * Math.cos((k * Math.PI) / 3), 50 + 28 * Math.sin((k * Math.PI) / 3), 21)).join(" "),
    extra: circle(50, 50, 27),
  },
  cloud: { body: "M22 78 C 6 78 4 56 20 52 C 16 34 38 26 48 38 C 54 22 80 24 80 44 C 96 44 98 70 82 76 C 76 82 30 82 22 78 Z" },
};

export function stickerPaths(shape: StickerShape) {
  return PATHS[shape];
}

/** 스티커 글씨 줄: 띄어쓰기가 있으면 거기서, 다섯 글자 이상이면 반으로 */
export function stickerLines(text: string): string[] {
  if (text.includes(" ")) return text.split(" ");
  const chars = [...text];
  if (chars.length >= 5) {
    const h = Math.ceil(chars.length / 2);
    return [chars.slice(0, h).join(""), chars.slice(h).join("")];
  }
  return [text];
}

export function stickerFontSize(text: string): number {
  if (stickerLines(text).length > 1) {
    const longest = Math.max(...stickerLines(text).map((l) => [...l].length));
    return longest <= 2 ? 27 : longest === 3 ? 24 : 20;
  }
  const n = [...text.replace(/\s/g, "")].length;
  return n <= 2 ? 30 : n === 3 ? 25 : n === 4 ? 21 : 17;
}

/** 카드(캔버스)에 스티커 하나: (x,y) 가운데, size px, rot 라디안 */
export function drawSticker(ctx: CanvasRenderingContext2D, id: string, x: number, y: number, size: number, rot: number, font: string) {
  const s = stickerById(id);
  if (!s) return;
  const p = PATHS[s.shape];
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(size / 100, size / 100);
  ctx.translate(-50, -50);
  ctx.shadowColor = "rgba(0,0,0,0.18)";
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 3;
  // 스티커 흰 테두리 (뜯어 붙인 느낌)
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 9;
  const body = new Path2D(p.body);
  const extra = p.extra ? new Path2D(p.extra) : null;
  if (extra) ctx.stroke(extra);
  ctx.stroke(body);
  ctx.shadowColor = "transparent";
  ctx.fillStyle = s.fill;
  ctx.strokeStyle = s.stroke;
  ctx.lineWidth = 3;
  if (extra && s.shape === "ribbon") {
    ctx.fill(extra);
    ctx.stroke(extra);
  }
  ctx.fill(body);
  ctx.stroke(body);
  if (extra && s.shape === "flower") {
    ctx.fillStyle = "#fffdf6";
    ctx.fill(extra);
  }
  ctx.fillStyle = s.ink;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `700 ${stickerFontSize(s.text)}px ${font}`;
  const lines = stickerLines(s.text);
  const cy = s.shape === "ribbon" ? 44 : s.shape === "cloud" ? 60 : 52;
  const lh = stickerFontSize(s.text) * 1.05;
  lines.forEach((ln, i) => ctx.fillText(ln, 50, cy + (i - (lines.length - 1) / 2) * lh));
  ctx.restore();
}
