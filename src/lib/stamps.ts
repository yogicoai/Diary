// 선생님 도장 (11-09 사용자: "참 잘했어요도 있지만 도장을 그때그때 다양하게, 글을 분석해서").
// 선생님(Claude)이 일기를 읽고 하나 고른다. 못 부르면 기본 답장(lib/teacher.ts)이 이야기 갈래로 고른다.
// 저장된 일기·공유 링크가 id 로 찾으니 id 를 바꾸거나 지우지 말고 새 도장은 끝에 추가한다. 모르는 id 는 "참 잘했어요".
// 모양은 100×100 칸(가운데 50,50) 안의 SVG path — 화면(StampSvg)과 카드(Canvas Path2D)가 같이 쓴다.

export type StampId = "cham" | "great" | "best" | "cheer" | "thanks" | "brave" | "cool" | "envy";
type Shape = "circle" | "double" | "scallop" | "square";
type Motif = "star" | "heart";

export type Stamp = {
  id: StampId;
  label: string; // 읽어 주는 이름
  lines: [string] | [string, string]; // 도장 글자 (두 줄이면 위가 크게)
  shape: Shape;
  motif?: Motif; // 글자 위 작은 그림
  meaning: string; // 선생님(Claude)이 고를 때 보는 설명
};

export const STAMPS: Stamp[] = [
  { id: "cham", label: "참 잘했어요", lines: ["참", "잘했어요"], shape: "circle", meaning: "기본 도장. 평범하지만 성실하게 써 온 날" },
  { id: "great", label: "아주 잘했어요", lines: ["아주", "잘했어요"], shape: "double", meaning: "정성껏 길게 쓰거나 그림을 열심히 그린 날, 뿌듯한 일을 해낸 날" },
  { id: "best", label: "최고예요", lines: ["최고예요"], shape: "scallop", motif: "star", meaning: "자랑할 일, 좋은 소식, 신나고 행복한 하루" },
  { id: "cheer", label: "힘내요", lines: ["힘내요"], shape: "circle", motif: "heart", meaning: "속상하거나 슬프거나 지치고 아픈 날" },
  { id: "thanks", label: "수고했어요", lines: ["수고", "했어요"], shape: "square", meaning: "일·공부·집안일·야근을 끝까지 해낸 날" },
  { id: "brave", label: "용감해요", lines: ["용감", "해요"], shape: "double", meaning: "무섭거나 귀찮은 일을 이겨 낸 날, 처음 해 본 도전" },
  { id: "cool", label: "멋져요", lines: ["멋져요"], shape: "scallop", meaning: "멋진 선택, 남을 도운 일, 새로운 시도" },
  { id: "envy", label: "부러워요", lines: ["부러워요"], shape: "circle", meaning: "여행·맛집·늦잠·쉬는 날처럼 선생님이 부러운 날" },
];

export const STAMP_IDS = STAMPS.map((s) => s.id) as [StampId, ...StampId[]];

export function stampById(id?: string | null): Stamp {
  return STAMPS.find((s) => s.id === id) ?? STAMPS[0];
}

export function cleanStamp(id: unknown): StampId {
  return STAMPS.some((s) => s.id === id) ? (id as StampId) : "cham";
}

/* ── 모양 (100×100) ── */
const circle = (r: number) => `M${50 - r} 50a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;

function scallop(r: number, n = 16): string {
  const pt = (a: number, rr: number) => `${(50 + rr * Math.cos(a)).toFixed(2)} ${(50 + rr * Math.sin(a)).toFixed(2)}`;
  let d = `M${pt(0, r * 0.93)}`;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2;
    const a1 = ((i + 1) / n) * Math.PI * 2;
    d += `Q${pt((a0 + a1) / 2, r * 1.07)} ${pt(a1, r * 0.93)}`;
  }
  return `${d}Z`;
}

const square = (x: number, r: number) => `M${x + r} ${x}H${100 - x - r}Q${100 - x} ${x} ${100 - x} ${x + r}V${100 - x - r}Q${100 - x} ${100 - x} ${100 - x - r} ${100 - x}H${x + r}Q${x} ${100 - x} ${x} ${100 - x - r}V${x + r}Q${x} ${x} ${x + r} ${x}Z`;

const OUTLINE: Record<Shape, { d: string; w: number }[]> = {
  circle: [
    { d: circle(45), w: 5 },
    { d: circle(38), w: 1.6 },
  ],
  double: [
    { d: circle(45), w: 4.5 },
    { d: circle(39), w: 3 },
  ],
  scallop: [
    { d: scallop(45), w: 4 },
    { d: circle(35), w: 1.6 },
  ],
  square: [
    { d: square(7, 7), w: 5 },
    { d: square(14, 4), w: 1.6 },
  ],
};

function star(cx: number, cy: number, R: number): string {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const rr = i % 2 ? R * 0.45 : R;
    const a = ((-90 + i * 36) * Math.PI) / 180;
    return `${(cx + rr * Math.cos(a)).toFixed(2)} ${(cy + rr * Math.sin(a)).toFixed(2)}`;
  });
  return `M${pts.join("L")}Z`;
}

const heart = (cx: number, cy: number, s: number) =>
  `M${cx} ${cy + 0.9 * s}C${cx - 1.25 * s} ${cy + 0.05 * s} ${cx - 0.85 * s} ${cy - 0.95 * s} ${cx} ${cy - 0.35 * s}C${cx + 0.85 * s} ${cy - 0.95 * s} ${cx + 1.25 * s} ${cy + 0.05 * s} ${cx} ${cy + 0.9 * s}Z`;

const MOTIF: Record<Motif, string> = { star: star(50, 31, 9), heart: heart(50, 31, 8.5) };

export type StampDraw = {
  outline: { d: string; w: number }[];
  motif: string | null;
  text: { t: string; y: number; size: number }[];
};

/** 도장 하나를 그릴 재료: 테두리 선들 · 작은 그림 · 글자 줄 (y 는 글자 바닥선) */
export function stampDraw(id?: string | null): StampDraw {
  const s = stampById(id);
  let text: StampDraw["text"];
  if (s.lines.length === 2) {
    const [a, b] = s.lines;
    text = [
      { t: a, y: 49, size: a.length === 1 ? 30 : 24 },
      { t: b, y: 70, size: b.length >= 4 ? 16 : b.length === 3 ? 17 : 18 },
    ];
  } else {
    const [a] = s.lines;
    text = [{ t: a, y: s.motif ? 64 : 59, size: a.length >= 4 ? 19 : 24 }];
  }
  return { outline: OUTLINE[s.shape], motif: s.motif ? MOTIF[s.motif] : null, text };
}
