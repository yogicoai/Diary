// 선생님 답장 기본값 (Claude 를 못 부를 때). 재치 한 스푼 + 따뜻하게, 이야기에 맞는 칭찬 스티커.
// 11-09 사용자: "선생님이 오늘 이야기에 유머러스하게 답하고, 맞는 칭찬 스티커를 다양하게" = 재미의 핵심.

import type { WeatherId } from "./weather";

type Topic = { id: string; words: string[]; lines: string[]; stickers: string[] };

const TOPICS: Topic[] = [
  {
    id: "food",
    words: ["먹", "밥", "떡볶이", "라면", "치킨", "피자", "커피", "빵", "케이크", "맛있", "배불", "고기", "술", "맥주", "간식", "디저트"],
    lines: [
      "이 일기, 읽기만 해도 배가 고파요. 선생님 몫은 없나요?",
      "맛있는 걸 먹은 날은 그걸로 100점이에요.",
      "숟가락 들고 일기 읽는 선생님이 여기 있어요.",
    ],
    stickers: ["yum", "laugh", "hundred"],
  },
  {
    id: "work",
    words: ["회사", "출근", "퇴근", "야근", "회의", "상사", "팀장", "업무", "보고서", "마감", "월요일", "출장", "알바"],
    lines: [
      "어른 숙제가 제일 어렵지요. 오늘도 끝까지 해냈네요.",
      "월요일을 이긴 어른, 오늘의 영웅이에요.",
      "퇴근길 발걸음에 박수를 보냅니다. 짝짝짝!",
    ],
    stickers: ["thanks", "brave", "bravo"],
  },
  {
    id: "tired",
    words: ["피곤", "지쳤", "힘들", "졸려", "잠", "아팠", "아프", "감기", "병원", "몸살", "두통"],
    lines: [
      "오늘 숙제는 딱 하나, 일찍 자기예요. 검사할 거예요!",
      "힘든 날 일기까지 쓰다니, 선생님이 감동했어요.",
      "이불이 많이 기다렸대요. 얼른 가 보세요.",
    ],
    stickers: ["rest", "cheer", "proud"],
  },
  {
    id: "friend",
    words: ["친구", "동기", "동창", "만났", "수다", "약속", "모임"],
    lines: [
      "수다 떠느라 시간 가는 줄 몰랐죠? 선생님도 끼워 줘요.",
      "좋은 친구는 보물이에요. 오늘 보물찾기 성공!",
    ],
    stickers: ["laugh", "sweet", "best"],
  },
  {
    id: "family",
    words: ["엄마", "아빠", "부모", "가족", "동생", "언니", "오빠", "누나", "형", "아이", "딸", "아들", "남편", "아내", "할머니", "할아버지"],
    lines: [
      "가족 얘기가 나오는 일기는 늘 따뜻해서 손이 녹아요.",
      "오늘 효도 점수 100점 드릴게요.",
    ],
    stickers: ["sweet", "cozy", "hundred"],
  },
  {
    id: "love",
    words: ["데이트", "남친", "여친", "애인", "좋아하", "설레", "고백", "연애"],
    lines: ["선생님까지 얼굴이 빨개졌어요. 다음 일기도 기대할게요.", "두근두근 소리가 원고지 밖까지 들려요."],
    stickers: ["envy", "dream", "sweet"],
  },
  {
    id: "move",
    words: ["운동", "산책", "헬스", "요가", "달리", "걸었", "등산", "자전거", "수영", "뛰"],
    lines: ["오늘 체육 시간 1등은 바로 당신이에요.", "다리는 아파도 마음은 가벼워졌죠? 아주 잘했어요."],
    stickers: ["cool", "brave", "best"],
  },
  {
    id: "trip",
    words: ["여행", "바다", "비행기", "기차", "놀러", "캠핑", "호텔", "휴가"],
    lines: ["선생님도 가방 싸서 따라가고 싶어요. 부러워요!", "멀리 다녀온 만큼 일기도 한 뼘 자랐네요."],
    stickers: ["envy", "dream", "cool"],
  },
  {
    id: "money",
    words: ["월급", "적금", "카드값", "택배", "샀", "쇼핑", "지름"],
    lines: ["택배 상자 뜯는 소리가 여기까지 들려요. 오늘은 봐줄게요.", "통장도 마음도 든든한 하루였길 바라요."],
    stickers: ["laugh", "envy", "proud"],
  },
  {
    id: "home",
    words: ["집", "이불", "청소", "빨래", "요리", "넷플", "영화", "드라마", "쉬었", "주말"],
    lines: ["집에서 뒹굴기 대회가 있다면 오늘 금메달이에요.", "쉬는 것도 숙제예요. 오늘 숙제 완벽하게 했네요."],
    stickers: ["cozy", "rest", "hundred"],
  },
];

const BY_WEATHER: Record<WeatherId, { lines: string[]; stickers: string[] }> = {
  sun: { lines: ["오늘 웃은 얼굴, 일기장에 다 묻어 있어요.", "기분 좋은 하루, 선생님이 도장 두 번 찍고 싶어요."], stickers: ["best", "laugh"] },
  cloud: { lines: ["별일 없는 날이 사실 제일 귀한 날이에요.", "그저 그런 날도 일기를 쓴 당신은 그저 그렇지 않아요."], stickers: ["proud", "cozy"] },
  rain: { lines: ["울적한 마음, 여기다 다 내려놓고 가요. 선생님이 맡아 둘게요.", "오늘은 따뜻한 거 한 잔 하고 일찍 쉬어요."], stickers: ["cheer", "rest"] },
  storm: { lines: ["속상한 마음 꾹 참지 말고 여기 써요. 잘 썼어요.", "그런 날도 있어요. 내일은 갤 거예요."], stickers: ["cheer", "brave"] },
  rainbow: { lines: ["설레는 일이 있었군요. 선생님도 궁금해서 잠이 안 와요.", "두근거림은 오래 기억해 둬요."], stickers: ["dream", "envy"] },
};

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function teacherReply(text: string, weather: WeatherId | null, seed = ""): { line: string; stickers: string[] } {
  const t = text.replace(/\s+/g, "");
  const key = hash(t + (weather ?? "") + seed);
  const topic = TOPICS.find((tp) => tp.words.some((w) => t.includes(w)));
  // 비·천둥 날은 웃기기보다 마음을 먼저 받아 준다
  if (weather === "rain" || weather === "storm") {
    const w = BY_WEATHER[weather];
    return { line: w.lines[key % w.lines.length], stickers: [w.stickers[0], ...(topic ? [topic.stickers[0]] : [w.stickers[1]])].filter((v, i, a) => a.indexOf(v) === i) };
  }
  if (topic) {
    const n = 1 + (key % 2); // 스티커 2~3개
    return { line: topic.lines[key % topic.lines.length], stickers: topic.stickers.slice(0, n + 1) };
  }
  const w = BY_WEATHER[weather ?? "sun"];
  return { line: w.lines[key % w.lines.length], stickers: w.stickers };
}

/** 예전 호출 호환: 한 줄만 */
export function teacherLine(text: string, weather: WeatherId | null, seed = ""): string {
  return teacherReply(text, weather, seed).line;
}
