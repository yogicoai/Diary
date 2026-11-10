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

/* 어른이 초등학교 (11-10 사용자): 나이 두 자리가 학년·반 — 38살이면 3학년 8반, 번호는 없다.
 * 가입하면 이름과 생년월일을 받는다 (11-10 사용자: "가입 후에 생년월일과 이름, 생일엔 선생님이 축하").
 * 학년·반은 올해 나이(올해 - 태어난 해) → **해마다 1월 1일에 다 같이 진급** (11-10 사용자: "매년 지나면 학년이 오르는 거, 1월 1일날").
 * 만 나이는 법으로 정한 '만 14살' 확인과 'N번째 생일'에만 쓴다. 생년월일은 본인과 이름표 계산에만 쓰고 남에겐 학년·반만 보인다.
 * birthYear 는 생년월일의 해(동갑 친구 찾기). 생년월일 없이 나이만 적던 잠깐 동안의 사람은 birthYear 로 계산한다. */
export const SCHOOL = "어른이 초등학교";
export const AGE_MIN = 14; // 만 나이 (개인정보 보호법: 만 14세 미만은 보호자 동의가 필요해서 받지 않는다)
export const AGE_MAX = 99;
/** 만 14살 미만일 때 birthProblem 이 돌려주는 말 (이 말로 알아보고 가입 정보 지우기를 묻는다) */
export const TOO_YOUNG = `만 ${AGE_MIN}살부터 가입할 수 있어요`;

/** 지금 한국 날짜 YYYY-MM-DD */
export function kstToday(now = Date.now()): string {
  return new Date(now + 9 * 3600_000).toISOString().slice(0, 10);
}

/** 만 나이 (생일이 지나면 한 살 더) — 만 14살 확인·'N번째 생일'에만 */
export function ageFromBirth(birth: string, today = kstToday()): number {
  const [by, bm, bd] = birth.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  return ty - by - (tm < bm || (tm === bm && td < bd) ? 1 : 0);
}

/** 이름표 나이 = 올해 나이 (올해 - 태어난 해). 1월 1일에 다 같이 한 살 → 학년·반 진급 */
export function ageOf(u: { birth?: string | null; birthYear?: number | null }, today = kstToday()): number | null {
  const born = u.birth ? Number(u.birth.slice(0, 4)) : u.birthYear;
  return born ? Number(today.slice(0, 4)) - born : null;
}

/** 그날이 생일인가 (2월 29일생은 평년엔 2월 28일에) */
export function isBirthday(birth: string | null | undefined, day = kstToday()): boolean {
  if (!birth) return false;
  const md = birth.slice(5);
  if (md === day.slice(5)) return true;
  const y = Number(day.slice(0, 4));
  const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  return md === "02-29" && !leap && day.slice(5) === "02-28";
}

/** 그해의 생일 날짜 YYYY-MM-DD (2월 29일생은 평년엔 2월 28일) */
export function birthdayIn(birth: string, year: number): string {
  const md = birth.slice(5);
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  return `${year}-${md === "02-29" && !leap ? "02-28" : md}`;
}

/** 생년월일 확인: 진짜 있는 날짜인지, 만 14~99살인지. 괜찮으면 null, 만 14살 미만이면 TOO_YOUNG */
export function birthProblem(birth: string, today = kstToday()): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birth)) return "생년월일을 다시 적어 주세요";
  const [y, m, d] = birth.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return "달력에 없는 날짜예요";
  const age = ageFromBirth(birth, today);
  if (age < 0) return "생년월일을 다시 확인해 주세요"; // 아직 안 온 날
  if (age < AGE_MIN) return TOO_YOUNG;
  if (age > AGE_MAX) return "생년월일을 다시 확인해 주세요";
  return null;
}

/** 나이 → 학년·반 (38 → 3학년 8반) */
export function gradeClass(age: number | null | undefined): { grade: number; ban: number } | null {
  if (!age || age < 10) return null;
  return { grade: Math.floor(age / 10), ban: age % 10 };
}

/** "3학년 8반" (나이를 모르면 빈 글) */
export function gradeText(age: number | null | undefined): string {
  const g = gradeClass(age);
  return g ? `${g.grade}학년 ${g.ban}반` : "";
}

/** 게시판·우리 반에 보이는 이름표: "3학년 8반 길동" (생년월일을 안 적었으면 이름만) */
export function nameTag(u: { nickname: string; birth?: string | null; birthYear?: number | null }): string {
  const g = gradeText(ageOf(u));
  return g ? `${g} ${u.nickname}` : u.nickname;
}
