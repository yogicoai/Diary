// 그림칸 크레파스 배경. 그림은 public/bg/<id>.webp (scripts/gpt-bg.mjs 로 만든다)
// 저장된 일기와 공유 링크가 id 로 참조하니, id 를 바꾸거나 지우지 말고 새 배경은 끝에 추가한다.
// "직접 그리기" = 배경 없음(null) = 흰 종이.

// pack: 팩 이름 (기본 / 추억 / 일상 / 계절 / 나들이) — 나중에 팩으로 팔 수 있게
export type Background = { id: string; name: string; pack?: string };

// 화풍: 원본 사이트 크레파스 (11-06 시안 A, 원본 그림을 참고 그림으로). 장면 설명은 scripts/bg-scenes.json
export const BACKGROUNDS: Background[] = [
  { id: "office", name: "회사 책상" },
  { id: "cafe", name: "카페 창가" },
  { id: "snack-bar", name: "분식집" },
  { id: "living-room", name: "우리 집 거실" },
  { id: "bedroom", name: "이불 속" },
  { id: "park", name: "공원 벤치" },
  { id: "beach", name: "바닷가" },
  { id: "rainy-street", name: "비 오는 거리" },
  { id: "night-sky", name: "밤하늘" },
  { id: "schoolyard", name: "학교 운동장" },
  { id: "classroom", name: "교실" },
  { id: "snow-day", name: "눈 오는 날" },
  { id: "christmas", name: "크리스마스" },
];

export function bgSrc(id: string): string {
  return `/bg/${id}.webp`;
}

export function bgThumb(id: string): string {
  return `/bg/thumb/${id}.webp`;
}

export function bgById(id: string | null | undefined): Background | undefined {
  if (!id) return undefined;
  return BACKGROUNDS.find((b) => b.id === id);
}

/** 새 일기의 첫 배경 (배경이 하나도 없으면 직접 그리기) */
export function defaultBg(): string | null {
  return BACKGROUNDS[0]?.id ?? null;
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`배경을 못 불러왔어요: ${src}`));
    img.src = src;
  });
}
