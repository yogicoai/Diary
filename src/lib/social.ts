// 화면과 서버가 같이 쓰는 참여 기능 정의 (도장·스티커, 신고 사유, 오늘의 숙제).
// 순서 고정 목록: id 를 바꾸거나 지우지 말고 끝에 추가.

export type ReactionKind = "cham" | "best" | "cheer" | "star" | "heart" | "smile";

export const REACTIONS: { kind: ReactionKind; label: string; type: "stamp" | "sticker" }[] = [
  { kind: "cham", label: "참 잘했어요", type: "stamp" },
  { kind: "best", label: "최고예요", type: "stamp" },
  { kind: "cheer", label: "힘내요", type: "stamp" },
  { kind: "star", label: "별", type: "sticker" },
  { kind: "heart", label: "하트", type: "sticker" },
  { kind: "smile", label: "웃음", type: "sticker" },
];

export const REACTION_KINDS = REACTIONS.map((r) => r.kind);

export const REPORT_REASONS = ["개인정보가 보여요", "욕설·혐오 표현", "야하거나 폭력적이에요", "광고·도배", "기타"];

/** 신고가 이만큼 모이면 자동으로 숨긴다 */
export const AUTO_HIDE_REPORTS = 3;

// 오늘의 숙제: 날마다 하나씩 돌아간다 (어린 시절 추억 + 요즘 일상)
export const TOPICS = [
  "오늘 제일 맛있었던 것",
  "어릴 때 장래희망",
  "요즘 나를 웃게 하는 것",
  "오늘 고마웠던 사람",
  "어릴 때 살던 동네",
  "지금 제일 가고 싶은 곳",
  "오늘의 나에게 상을 준다면",
  "학교 앞 문방구에서 사던 것",
  "요즘 자주 듣는 노래",
  "오늘 입은 옷",
  "이번 주말에 하고 싶은 일",
  "어릴 때 제일 좋아하던 놀이",
  "오늘 본 하늘",
  "최근에 산 것 중 제일 잘 산 것",
  "어릴 때 무서웠던 것",
  "요즘 나의 작은 행복",
  "오늘 들은 좋은 말",
  "제일 좋아하는 계절",
  "급식에서 제일 좋아하던 메뉴",
  "오늘 한 일 중 제일 잘한 일",
  "어릴 때 키우고 싶던 동물",
  "요즘 걱정 하나",
  "오늘의 간식",
  "나만의 스트레스 푸는 법",
  "첫 월급으로 한 일",
  "어릴 때 받은 최고의 선물",
  "요즘 푹 빠진 것",
  "내일의 나에게 한마디",
  "오늘 걸은 길",
  "운동회 날의 기억",
  "제일 오래된 친구",
  "비 오는 날 하고 싶은 것",
  "나를 닮은 동물",
  "올해 제일 기억에 남는 날",
  "소풍 가면 꼭 챙기던 것",
  "방학 숙제 중 제일 싫었던 것",
  "지금 내 책상 위",
  "10년 뒤의 나",
];

/** 날짜 키(YYYY-MM-DD) → 그날의 숙제 */
export function topicOf(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const days = Math.floor(Date.UTC(y, m - 1, d) / 86400000);
  return TOPICS[((days % TOPICS.length) + TOPICS.length) % TOPICS.length];
}

/** 이름표 한 줄: "1995년 입학 3반 하늘이" */
export function nameTag(u: { nickname: string; entryYear: number | null; classNo: number }): string {
  return `${u.entryYear ? `${u.entryYear}년 입학 ` : ""}${u.classNo}반 ${u.nickname}`;
}
