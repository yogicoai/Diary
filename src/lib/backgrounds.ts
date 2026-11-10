// 그림칸 크레파스 배경. 그림은 public/bg/<id>.webp (scripts/gpt-bg.mjs 로 만든다)
// 저장된 일기와 공유 링크가 id 로 참조하니, id 를 바꾸거나 지우지 말고 새 배경은 끝에 추가한다.
// "직접 그리기" = 배경 없음(null) = 흰 종이.

// pack: 팩 이름 (기본 / 추억 / 일상 / 계절 / 나들이) — 나중에 팩으로 팔 수 있게
export type Background = { id: string; name: string; pack?: string };

// 화풍: 원본 사이트 크레파스 (11-06 시안 A, 원본 그림을 참고 그림으로). 장면 설명은 scripts/bg-scenes.json
export const BACKGROUNDS: Background[] = [
  { id: "office", name: "회사 책상", pack: "일상" },
  { id: "cafe", name: "카페 창가", pack: "일상" },
  { id: "snack-bar", name: "분식집", pack: "일상" },
  { id: "living-room", name: "우리 집 거실", pack: "일상" },
  { id: "bedroom", name: "이불 속", pack: "일상" },
  { id: "park", name: "공원 벤치", pack: "나들이" },
  { id: "beach", name: "바닷가", pack: "나들이" },
  { id: "rainy-street", name: "비 오는 거리", pack: "계절" },
  { id: "night-sky", name: "밤하늘", pack: "계절" },
  { id: "schoolyard", name: "학교 운동장", pack: "추억" },
  { id: "classroom", name: "교실", pack: "추억" },
  { id: "snow-day", name: "눈 오는 날", pack: "계절" },
  { id: "christmas", name: "크리스마스", pack: "계절" },
  { id: "stationery-shop", name: "학교 앞 문방구", pack: "추억" },
  { id: "playground-swing", name: "놀이터 그네", pack: "추억" },
  { id: "sports-day", name: "운동회 날", pack: "추억" },
  { id: "picnic", name: "소풍 가는 날", pack: "추억" },
  { id: "shoe-locker", name: "학교 신발장", pack: "추억" },
  { id: "grandma-house", name: "할머니 집 마루", pack: "추억" },
  { id: "summer-valley", name: "계곡 물놀이", pack: "추억" },
  { id: "home-table", name: "우리 집 밥상", pack: "일상" },
  { id: "store-parasol", name: "편의점 앞 파라솔", pack: "일상" },
  { id: "alley", name: "동네 골목길", pack: "일상" },
  { id: "sunny-balcony", name: "햇살 베란다", pack: "일상" },
  { id: "library", name: "도서관 창가", pack: "일상" },
  { id: "movie-night", name: "이불 속 영화", pack: "일상" },
  { id: "cherry-blossom", name: "벚꽃길", pack: "계절" },
  { id: "autumn-leaves", name: "단풍길", pack: "계절" },
  { id: "full-moon", name: "보름달 밤", pack: "계절" },
  { id: "birthday", name: "생일 파티", pack: "계절" },
  { id: "rainy-window", name: "비 오는 창가", pack: "계절" },
  { id: "sled-hill", name: "눈썰매 언덕", pack: "계절" },
  { id: "amusement-park", name: "놀이공원", pack: "나들이" },
  { id: "camping", name: "캠핑 밤", pack: "나들이" },
  { id: "train-window", name: "기차 창밖", pack: "나들이" },
  { id: "mountain-top", name: "산 정상", pack: "나들이" },
  { id: "flower-field", name: "꽃밭", pack: "나들이" },
];

/** 상황별로 고르기 (11-09 사용자: "상황에 맞는 배경을 고르게"). 배경이 하나라도 있는 묶음만 칩으로 보인다 */
export const BG_PACKS: { id: string; name: string }[] = [
  { id: "추억", name: "학교 추억" },
  { id: "일상", name: "일상" },
  { id: "계절", name: "계절·날씨" },
  { id: "나들이", name: "나들이" },
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

/** 새 일기의 첫 배경 = 직접 그리기(흰 종이) (11-10 사용자: "처음엔 직접 그리기 쪽으로"). 배경 그림은 골라서 깐다.
 *  나 → 기본 설정에서 처음 배경을 고른 사람은 그것 (lib/prefs.ts preferredBg) */
export function defaultBg(): string | null {
  return null;
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`배경을 못 불러왔어요: ${src}`));
    img.src = src;
  });
}
