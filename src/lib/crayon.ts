// 크레파스 질감.
// 종이 결(grain) 하나를 모든 색이 같이 쓴다. 같은 자리가 늘 비어서 진짜 종이에 칠한 것처럼 보인다.

export const CRAYONS = [
  { id: "black", name: "검정", hex: "#2b2622" },
  { id: "red", name: "빨강", hex: "#e0453a" },
  { id: "orange", name: "주황", hex: "#f28a2e" },
  { id: "yellow", name: "노랑", hex: "#f6c945" },
  { id: "green", name: "초록", hex: "#4fa35b" },
  { id: "sky", name: "하늘", hex: "#5aa9e6" },
  { id: "blue", name: "파랑", hex: "#2f5fb3" },
  { id: "pink", name: "분홍", hex: "#f08fb0" },
  { id: "brown", name: "갈색", hex: "#8a5a3b" },
  { id: "skin", name: "살구", hex: "#f6c7a1" },
] as const;

export type Point = { x: number; y: number }; // 0~1 정규화 좌표
export type Stroke = { color: string; size: number; points: Point[]; erase?: boolean };

const GRAIN_SIZE = 96;
let grainAlpha: Uint8ClampedArray | null = null;

// 결정적 난수 (같은 결이 매번 나오게)
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function getGrain(): Uint8ClampedArray {
  if (grainAlpha) return grainAlpha;
  const rand = mulberry32(20261106);
  const a = new Uint8ClampedArray(GRAIN_SIZE * GRAIN_SIZE);
  for (let y = 0; y < GRAIN_SIZE; y++) {
    for (let x = 0; x < GRAIN_SIZE; x++) {
      // 가로로 살짝 긴 결 + 점 모양 빈틈
      const n = rand();
      const streak = Math.sin((x * 0.9 + y * 0.15) * 0.7) * 0.08;
      const v = n + streak;
      a[y * GRAIN_SIZE + x] = v < 0.16 ? 0 : v < 0.32 ? 110 : v < 0.6 ? 205 : 245;
    }
  }
  grainAlpha = a;
  return a;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

const patternCache = new WeakMap<CanvasRenderingContext2D, Map<string, CanvasPattern>>();

export function crayonPattern(ctx: CanvasRenderingContext2D, hex: string, scale = 1): CanvasPattern {
  let byCtx = patternCache.get(ctx);
  if (!byCtx) {
    byCtx = new Map();
    patternCache.set(ctx, byCtx);
  }
  const key = `${hex}@${scale}`;
  const hit = byCtx.get(key);
  if (hit) return hit;

  const grain = getGrain();
  const [r, g, b] = hexToRgb(hex);
  const base = document.createElement("canvas");
  base.width = GRAIN_SIZE;
  base.height = GRAIN_SIZE;
  const bctx = base.getContext("2d")!;
  const img = bctx.createImageData(GRAIN_SIZE, GRAIN_SIZE);
  for (let i = 0; i < grain.length; i++) {
    img.data[i * 4] = r;
    img.data[i * 4 + 1] = g;
    img.data[i * 4 + 2] = b;
    img.data[i * 4 + 3] = grain[i];
  }
  bctx.putImageData(img, 0, 0);

  let tile: HTMLCanvasElement = base;
  if (scale !== 1) {
    const s = Math.max(1, Math.round(GRAIN_SIZE * scale));
    tile = document.createElement("canvas");
    tile.width = s;
    tile.height = s;
    const tctx = tile.getContext("2d")!;
    tctx.imageSmoothingEnabled = true;
    tctx.drawImage(base, 0, 0, s, s);
  }
  const p = ctx.createPattern(tile, "repeat")!;
  byCtx.set(key, p);
  return p;
}

/** 한 획을 크레파스로 그린다. w,h = 그릴 영역 픽셀 크기, unit = 굵기 기준(영역 너비 / 기준폭) */
export function drawStroke(
  ctx: CanvasRenderingContext2D,
  stroke: Stroke,
  w: number,
  h: number,
  grainScale = 1,
) {
  const pts = stroke.points;
  if (pts.length === 0) return;
  const width = stroke.size * w;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (stroke.erase) {
    ctx.globalCompositeOperation = "destination-out";
    ctx.strokeStyle = "rgba(0,0,0,1)";
  } else {
    ctx.strokeStyle = crayonPattern(ctx, stroke.color, grainScale);
  }

  // 굵은 한 번 + 살짝 비킨 얇은 두 번 = 가장자리가 거칠어진다
  const passes = stroke.erase
    ? [{ lw: width * 1.4, dx: 0, dy: 0 }]
    : [
        { lw: width, dx: 0, dy: 0 },
        { lw: width * 0.55, dx: width * 0.18, dy: -width * 0.12 },
        { lw: width * 0.45, dx: -width * 0.15, dy: width * 0.14 },
      ];

  for (const pass of passes) {
    ctx.lineWidth = Math.max(1, pass.lw);
    ctx.beginPath();
    const first = pts[0];
    ctx.moveTo(first.x * w + pass.dx, first.y * h + pass.dy);
    if (pts.length === 1) {
      ctx.lineTo(first.x * w + pass.dx + 0.1, first.y * h + pass.dy + 0.1);
    } else {
      for (let i = 1; i < pts.length - 1; i++) {
        const p = pts[i];
        const n = pts[i + 1];
        const mx = ((p.x + n.x) / 2) * w;
        const my = ((p.y + n.y) / 2) * h;
        ctx.quadraticCurveTo(p.x * w + pass.dx, p.y * h + pass.dy, mx + pass.dx, my + pass.dy);
      }
      const last = pts[pts.length - 1];
      ctx.lineTo(last.x * w + pass.dx, last.y * h + pass.dy);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/** 정규화된 획 목록을 원하는 크기의 새 캔버스로 다시 그린다 (카드·썸네일용) */
export function renderStrokes(strokes: Stroke[], width: number, height: number, grainScale = 1): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  const ctx = c.getContext("2d")!;
  for (const s of strokes) drawStroke(ctx, s, width, height, grainScale);
  return c;
}
