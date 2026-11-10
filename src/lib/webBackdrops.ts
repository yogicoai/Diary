// 넓은 화면(PC, 760px 이상) 일기장 뒤 배경 그림 목록 (16:9).
// 그림은 public/web-bg/<id>.webp + public/web-bg/thumb/<id>.webp(240×135).
// 고른 id 를 이 기기 localStorage chamjal.webBg 에 저장하니 id 는 바꾸거나 지우지 말고, 새 그림은 끝에 붙인다
// (scripts/webbg-import.mjs 가 docs/넓은화면-배경-프롬프트.md 의 이름·묶음으로 붙인다).

export type WebBackdrop = { id: string; name: string; group: string };

/** 설정 화면에서 묶어 보이는 순서 */
export const WEB_BACKDROP_GROUPS = ["종이·낙서", "책상 위", "동네·나들이", "계절·날씨"];

export const WEB_BACKDROPS: WebBackdrop[] = [
  { id: "doodle", name: "크라프트 낙서", group: "종이·낙서" },
  { id: "town", name: "크레파스 동네", group: "동네·나들이" },
  { id: "desk", name: "교실 책상", group: "책상 위" },
  { id: "pc-notebook", name: "줄공책 낙서", group: "종이·낙서" },
  { id: "pc-origami", name: "색종이 접기", group: "종이·낙서" },
  { id: "pc-rainbow", name: "무지개 하늘", group: "종이·낙서" },
  { id: "pc-crayons", name: "크레파스 낙서장", group: "종이·낙서" },
  { id: "pc-art-desk", name: "미술 시간 책상", group: "책상 위" },
  { id: "pc-pencil-case", name: "필통 책상", group: "책상 위" },
  { id: "pc-summer-desk", name: "여름방학 숙제", group: "책상 위" },
  { id: "pc-snacks", name: "학교 앞 군것질", group: "책상 위" },
  { id: "pc-school", name: "학교 운동장", group: "동네·나들이" },
  { id: "pc-alley", name: "90년대 골목", group: "동네·나들이" },
  { id: "pc-grandma", name: "할머니 시골집", group: "동네·나들이" },
  { id: "pc-amusement", name: "놀이공원", group: "동네·나들이" },
  { id: "pc-beach", name: "여름 바닷가", group: "동네·나들이" },
  { id: "pc-spring", name: "봄 벚꽃", group: "계절·날씨" },
  { id: "pc-autumn", name: "가을 감나무", group: "계절·날씨" },
  { id: "pc-snow", name: "눈 오는 마을", group: "계절·날씨" },
  { id: "pc-rain", name: "비 오는 날", group: "계절·날씨" },
  { id: "pc-night", name: "별 헤는 밤", group: "계절·날씨" },
  { id: "pc-christmas", name: "크리스마스", group: "계절·날씨" },
];

export function webBackdropById(id: string | null | undefined): WebBackdrop | undefined {
  return WEB_BACKDROPS.find((b) => b.id === id);
}

export const webBackdropSrc = (id: string) => `/web-bg/${id}.webp`;
export const webBackdropThumb = (id: string) => `/web-bg/thumb/${id}.webp`;
