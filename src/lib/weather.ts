// 그날 진짜 날씨 (11-09 사용자: "나의 기분 날씨가 아니라 진짜 그날 날씨"). 어릴 때 그림일기처럼 날씨에 동그라미.
// 아이콘은 SVG path 문자열 하나로 두고, 화면(SVG)과 카드(Canvas Path2D)에서 같이 쓴다.
// 저장된 일기·공유 링크가 id 로 찾으니 id 를 바꾸거나 지우지 말고 새 날씨는 끝에만 추가한다.
// 고르는 순서는 PICK 이 정한다. 무지개(rainbow)는 마음 날씨 시절 것이라 새 일기에선 안 고르고, 예전 일기에서만 보인다.

export type WeatherId = "sun" | "cloud" | "rain" | "storm" | "rainbow" | "partly" | "snow";

export type Weather = {
  id: WeatherId;
  label: string; // 날씨 이름 (동그라미 옆·카드·읽어 주기)
  path: string; // 24x24 기준 선 그림
};

const CLOUD_SMALL = "M4.9 20.4h8.2a3 3 0 0 0 .45-5.96A4.2 4.2 0 0 0 5.5 13.3 3.5 3.5 0 0 0 4.9 20.4Z";
const CLOUD_TOP = "M6.5 14h11a3.6 3.6 0 0 0 .5-7.15A5.2 5.2 0 0 0 7.9 5.6 4.2 4.2 0 0 0 6.5 14Z";

export const WEATHERS: Weather[] = [
  {
    id: "sun",
    label: "맑음",
    path: "M12 7.2a4.8 4.8 0 1 0 0.01 0Z M12 1.8v2.6 M12 19.6v2.6 M1.8 12h2.6 M19.6 12h2.6 M4.8 4.8l1.8 1.8 M17.4 17.4l1.8 1.8 M4.8 19.2l1.8-1.8 M17.4 6.6l1.8-1.8",
  },
  {
    id: "cloud",
    label: "흐림",
    path: "M6.5 18.5h11a4 4 0 0 0 .6-7.95A5.6 5.6 0 0 0 7.3 9.1 4.7 4.7 0 0 0 6.5 18.5Z",
  },
  {
    id: "rain",
    label: "비",
    path: `${CLOUD_TOP} M8 17l-1 3 M12.2 17l-1 3 M16.4 17l-1 3`,
  },
  {
    id: "storm",
    label: "천둥 번개",
    path: "M6.5 13h11a3.6 3.6 0 0 0 .5-7.15A5.2 5.2 0 0 0 7.9 4.6 4.2 4.2 0 0 0 6.5 13Z M12.8 13.5l-2.6 4.2h3.4l-2.4 4.3",
  },
  {
    id: "rainbow",
    label: "무지개",
    path: "M2.5 17.5a9.5 9.5 0 0 1 19 0 M5.6 17.5a6.4 6.4 0 0 1 12.8 0 M8.7 17.5a3.3 3.3 0 0 1 6.6 0",
  },
  {
    id: "partly",
    label: "구름 조금",
    path: `M17 4a3 3 0 1 0 0.01 0Z M17 0.9v1.4 M22.1 7h-1.4 M20.6 3.4l-1 1 M13.4 3.4l1 1 M20.6 10.6l-1-1 ${CLOUD_SMALL}`,
  },
  {
    id: "snow",
    label: "눈",
    path: `${CLOUD_TOP} M8 17.6a1 1 0 1 0 0.01 0Z M12 19.6a1 1 0 1 0 0.01 0Z M16 17.6a1 1 0 1 0 0.01 0Z`,
  },
];

/** 새 일기에서 고르는 날씨와 그 순서 */
const PICK: WeatherId[] = ["sun", "partly", "cloud", "rain", "snow", "storm"];

export function weatherById(id: WeatherId | string | null | undefined): Weather | undefined {
  return WEATHERS.find((w) => w.id === id);
}

/** 보여 줄 날씨 칸: 고르는 6개 + (예전 일기가 무지개면 무지개도) */
export function weatherChoices(current?: WeatherId | string | null): Weather[] {
  const list = PICK.map((id) => weatherById(id)!);
  const cur = weatherById(current);
  return cur && !PICK.includes(cur.id) ? [...list, cur] : list;
}
