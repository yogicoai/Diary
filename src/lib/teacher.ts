// 선생님 한 줄 (무료, 규칙 기반).
// 나중에 유료 "선생님 긴 답장"은 AI로 바꿀 수 있게 함수 하나로 둔다.

import type { WeatherId } from "./weather";

type Topic = { id: string; words: string[]; lines: string[] };

const TOPICS: Topic[] = [
  {
    id: "work",
    words: ["회사", "출근", "퇴근", "야근", "회의", "상사", "팀장", "업무", "일이", "보고서", "마감", "월요일", "출장"],
    lines: [
      "오늘도 끝까지 버틴 거, 선생님은 다 알아요.",
      "어른 숙제가 제일 어렵지요. 그래도 해냈네요.",
      "퇴근길 발걸음까지 칭찬해요.",
    ],
  },
  {
    id: "food",
    words: ["먹", "밥", "떡볶이", "라면", "치킨", "피자", "커피", "빵", "케이크", "맛있", "배불", "고기", "술", "맥주"],
    lines: [
      "배부르면 마음도 든든해요.",
      "맛있는 걸 먹은 날은 그걸로 충분해요.",
      "꼭꼭 씹어 먹었지요? 아주 잘했어요.",
    ],
  },
  {
    id: "friend",
    words: ["친구", "동기", "동창", "만났", "수다", "약속", "모임"],
    lines: [
      "좋은 친구가 곁에 있다니, 부러운걸요.",
      "실컷 웃은 날은 오래 기억에 남아요.",
      "친구랑 사이좋게 지냈네요. 참 잘했어요.",
    ],
  },
  {
    id: "family",
    words: ["엄마", "아빠", "부모", "가족", "동생", "언니", "오빠", "누나", "형", "아이", "딸", "아들", "남편", "아내", "할머니", "할아버지"],
    lines: [
      "가족 얘기가 나오는 일기는 늘 따뜻해요.",
      "오늘 가족한테 한 말, 아주 예뻤을 거예요.",
      "집에 가면 꼭 안아 주세요.",
    ],
  },
  {
    id: "tired",
    words: ["피곤", "지쳤", "힘들", "졸려", "잠", "아팠", "아프", "감기", "병원", "몸살"],
    lines: [
      "오늘은 일찍 자는 게 숙제예요.",
      "힘든 날 일기까지 쓰다니, 대단해요.",
      "푹 쉬는 것도 잘하는 거예요.",
    ],
  },
  {
    id: "love",
    words: ["데이트", "남친", "여친", "애인", "좋아하", "설레", "고백", "연애"],
    lines: [
      "선생님도 덩달아 설레네요.",
      "두근두근한 마음, 오래오래 간직해요.",
    ],
  },
  {
    id: "move",
    words: ["운동", "산책", "헬스", "요가", "달리", "걸었", "등산", "자전거", "수영"],
    lines: [
      "몸을 움직인 날은 마음도 가벼워요.",
      "튼튼한 어른이 되어 가고 있네요.",
    ],
  },
  {
    id: "trip",
    words: ["여행", "바다", "산", "비행기", "기차", "놀러", "캠핑", "호텔"],
    lines: [
      "멀리 다녀온 만큼 마음이 넓어졌겠네요.",
      "좋은 곳에 다녀왔군요. 사진보다 일기가 오래가요.",
    ],
  },
  {
    id: "money",
    words: ["월급", "돈", "적금", "카드값", "택배", "샀", "쇼핑", "지름"],
    lines: [
      "갖고 싶던 걸 샀다니, 오늘은 봐줄게요.",
      "아껴 쓴 것도 잘 쓴 것도 다 칭찬해요.",
    ],
  },
];

const BY_WEATHER: Record<WeatherId, string[]> = {
  sun: ["오늘처럼 웃는 날이 많으면 좋겠어요.", "기분 좋은 하루, 일기로 남겨서 다행이에요."],
  cloud: ["그저 그런 날도 소중한 하루예요.", "별일 없는 날이 제일 고마운 날이에요."],
  rain: ["울적한 날엔 일기가 우산이 돼 줄 거예요.", "오늘 마음, 여기다 다 내려놓고 가요."],
  storm: ["속상한 마음 꾹 참지 말고 여기 써요.", "그런 날도 있어요. 내일은 갤 거예요."],
  rainbow: ["설레는 일이 있었군요. 선생님도 궁금해요.", "두근거림은 오래 기억해 둬요."],
};

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function teacherLine(text: string, weather: WeatherId | null, seed = ""): string {
  const t = text.replace(/\s+/g, "");
  const key = hash(t + (weather ?? "") + seed);
  const topic = TOPICS.find((tp) => tp.words.some((w) => t.includes(w)));
  // 비·천둥 날은 주제보다 마음을 먼저 받아 준다
  if (weather && (weather === "rain" || weather === "storm")) {
    const pool = BY_WEATHER[weather];
    return pool[key % pool.length];
  }
  if (topic) return topic.lines[key % topic.lines.length];
  const pool = BY_WEATHER[weather ?? "sun"];
  return pool[key % pool.length];
}
