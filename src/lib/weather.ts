// 마음 날씨. 아이콘은 SVG path 문자열 하나로 두고, 화면(SVG)과 카드(Canvas Path2D)에서 같이 쓴다.
// 순서를 바꾸면 저장된 일기의 날씨가 바뀌니, 새 날씨는 끝에만 추가한다.

export type WeatherId = "sun" | "cloud" | "rain" | "storm" | "rainbow";

export type Weather = {
  id: WeatherId;
  label: string; // 마음 말
  path: string; // 24x24 기준 선 그림
};

export const WEATHERS: Weather[] = [
  {
    id: "sun",
    label: "좋았어",
    path: "M12 7.2a4.8 4.8 0 1 0 0.01 0Z M12 1.8v2.6 M12 19.6v2.6 M1.8 12h2.6 M19.6 12h2.6 M4.8 4.8l1.8 1.8 M17.4 17.4l1.8 1.8 M4.8 19.2l1.8-1.8 M17.4 6.6l1.8-1.8",
  },
  {
    id: "cloud",
    label: "그저 그래",
    path: "M6.5 18.5h11a4 4 0 0 0 .6-7.95A5.6 5.6 0 0 0 7.3 9.1 4.7 4.7 0 0 0 6.5 18.5Z",
  },
  {
    id: "rain",
    label: "울적해",
    path: "M6.5 14h11a3.6 3.6 0 0 0 .5-7.15A5.2 5.2 0 0 0 7.9 5.6 4.2 4.2 0 0 0 6.5 14Z M8 17l-1 3 M12.2 17l-1 3 M16.4 17l-1 3",
  },
  {
    id: "storm",
    label: "속상해",
    path: "M6.5 13h11a3.6 3.6 0 0 0 .5-7.15A5.2 5.2 0 0 0 7.9 4.6 4.2 4.2 0 0 0 6.5 13Z M12.8 13.5l-2.6 4.2h3.4l-2.4 4.3",
  },
  {
    id: "rainbow",
    label: "설렜어",
    path: "M2.5 17.5a9.5 9.5 0 0 1 19 0 M5.6 17.5a6.4 6.4 0 0 1 12.8 0 M8.7 17.5a3.3 3.3 0 0 1 6.6 0",
  },
];

export function weatherById(id: WeatherId | null | undefined): Weather | undefined {
  return WEATHERS.find((w) => w.id === id);
}
