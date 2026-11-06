// 일기장 종류 = 테마. 색은 globals.css 의 [data-theme] 에 있다.
// 나중에 "일기장 표지 팩"으로 팔 수 있게 목록으로 둔다.

export type ThemeId = "stationery" | "drawing" | "vacation";

export const THEMES: { id: ThemeId; name: string; note: string; swatch: [string, string, string] }[] = [
  { id: "stationery", name: "문구점 일기장", note: "누런 종이, 갈색 칸", swatch: ["#e9dcc0", "#fffaf0", "#8c7059"] },
  { id: "drawing", name: "하얀 도화지", note: "새하얀 종이, 파란 칸", swatch: ["#f1efe9", "#ffffff", "#4f86d9"] },
  { id: "vacation", name: "방학 숙제", note: "민트 표지, 초록 원고지", swatch: ["#d5e8dc", "#fbfbf3", "#3e9b6e"] },
];

export function applyTheme(id: ThemeId) {
  document.documentElement.dataset.theme = id;
  try {
    localStorage.setItem("chamjal.theme", id);
  } catch {
    /* 저장 못 해도 지금 화면엔 적용 */
  }
  const meta = document.querySelector('meta[name="theme-color"]');
  const desk = getComputedStyle(document.documentElement).getPropertyValue("--desk").trim();
  if (meta && desk) meta.setAttribute("content", desk);
}
