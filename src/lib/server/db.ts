// Mongo 연결과 컬렉션 모양. DB 이름 기본값 chamjal.
// 개발 중에는 `npm run dev:mem` 이 임시 Mongo 를 띄워 MONGODB_URI 를 넣어 준다.

import { MongoClient, type Db, type ObjectId } from "mongodb";
import type { ReactionKind } from "@/lib/social";
import type { Stroke } from "@/lib/crayon";

export class NoDbError extends Error {
  constructor() {
    super("MONGODB_URI 가 없어요");
  }
}

export type UserDoc = {
  _id: ObjectId;
  googleSub: string; // 개발용 로그인은 "dev:이름"
  email: string;
  nickname: string;
  birth?: string | null; // 생년월일 YYYY-MM-DD (11-10 사용자: 가입 뒤 받기) → 만 나이 = 어른이 초등학교 학년·반, 생일 축하. 남에겐 학년·반만 보인다
  birthYear?: number | null; // 생년월일의 해 (동갑 친구 찾기·교무 일지). 생년월일 전에 나이만 적던 사람은 그해 - 나이
  entryYear?: number | null; // 예전 이름표 (초등학교 입학 연도) — 11-10 부터 안 씀
  classNo?: number; // 예전 이름표 (반) — 11-10 부터 안 씀
  kid?: "girl" | "boy"; // 가입할 때 고른 나 — 일기를 이 아이 목소리로 읽어 준다 (11-09 사용자)
  createdAt: Date;
  lastSeenAt: Date;
  banned?: boolean;
  // 아이디로 들어오는 계정 (기본 로그인 가입 · scripts/account.mjs). googleSub 는 "id:아이디". fe·yogico 는 교무실 선생님
  loginId?: string;
  passHash?: string;
  loginFails?: number;
  lockedUntil?: Date;
  // 예제 데이터 (scripts/demo.mjs, 출시 전에 remove): 예제 친구는 demo, fe 는 '길동'으로 바꾸기 전 이름표를 demoBackup 에
  demo?: boolean;
  demoBackup?: { nickname: string; birth: string | null; birthYear: number | null };
};

// 오늘의 숙제(어른이 미션) 검사: 사진 한 장이나 한 줄로 낸 인증. 한 사람 하루 하나 (일기와 따로).
export type HomeworkDoc = {
  _id: ObjectId;
  userId: ObjectId;
  date: string; // 숙제 날짜 (한국 시각 YYYY-MM-DD)
  mission: string; // 그때 숙제 글 (선생님이 나중에 바꿔도 그대로)
  text: string; // 한 줄 인증 (없으면 "")
  photoUrl: string | null;
  thumbUrl: string | null;
  sticker: string; // 받은 숙제 스티커 (lib/stickers.ts) — 칭찬 스티커판에 모인다
  share: boolean; // 게시판 '오늘의 숙제'에 보여 주기
  status: "visible" | "pending" | "hidden"; // 보여 주기 검사 결과 (안 보여 주면 늘 visible)
  checked: boolean; // AI 검사를 거쳤나
  note?: string; // 숨긴 이유
  at: Date; // 처음 낸 시각
  updatedAt: Date;
};

// 선생님(운영자)이 날짜별로 미리 걸어 둔 오늘의 숙제. 없는 날은 lib/topics.ts 의 요일 숙제가 나간다.
export type TopicDoc = { _id: ObjectId; date: string; text: string; note?: string; by: string; at: Date };

// 관리자 페이지에서 한 일 (정지·게시판 처리). 개발자 계정 대시보드에서만 보인다.
export type AdminLogDoc = {
  _id: ObjectId;
  at: Date;
  by: ObjectId;
  byName: string;
  action: "ban" | "unban" | "approve" | "hide" | "topic" | "untopic";
  target: string; // 회원 id 또는 일기 id
  note?: string;
};

export type BoardState = {
  status: "visible" | "pending" | "hidden";
  mode: "drawing" | "full"; // 그림만 / 글까지
  at: Date;
  cardUrl: string;
  thumbUrl: string;
  reports: number;
  checked: boolean; // AI 검사를 거쳤나
  note?: string; // 숨김·대기 이유
};

export type DiaryDoc = {
  _id: ObjectId;
  userId: ObjectId;
  clientId: string; // 기기에서 만든 id (중복 저장 막기)
  date: string;
  weather: string | null;
  title: string;
  body: string;
  strokes: Stroke[];
  bg: string | null;
  teacher: string;
  teacherBy: "ai" | "rule";
  stickers?: string[];
  late?: boolean; // 밀린 숙제 — 개근상 계산에서 뺀다
  care?: boolean; // 예전 일기에만 남은 값 — 11-10 부터 서버에 안 둔다 (위험 신호는 건강 관련 민감정보가 될 수 있어 이 기기에만)
  secret: boolean;
  topic: string | null; // 오늘의 숙제로 쓴 날짜 키 (YYYY-MM-DD)
  topicText?: string | null; // 그때 숙제 글 (선생님이 나중에 숙제를 바꿔도 이 일기의 숙제는 그대로)
  stamp?: string; // 선생님 도장 (lib/stamps.ts)
  createdAt: Date;
  updatedAt: Date;
  board?: BoardState;
  classIds: ObjectId[];
  reactions: Partial<Record<ReactionKind, number>>;
};

export type ReactionDoc = { _id: ObjectId; diaryId: ObjectId; userId: ObjectId; kind: ReactionKind; at: Date };
export type ReportDoc = { _id: ObjectId; diaryId: ObjectId; userId: ObjectId; reason: string; at: Date };
export type ClassDoc = {
  _id: ObjectId;
  name: string;
  code: string; // 초대 코드
  ownerId: ObjectId;
  memberIds: ObjectId[];
  createdAt: Date;
  homework?: { date: string; text: string }; // 반 숙제 (반장이 그날 낸 주제)
};
// 짝꿍 한마디: 반 친구 일기에 남기는 빨간 색연필 한 줄 (반 친구끼리만 보인다)
export type NoteDoc = { _id: ObjectId; diaryId: ObjectId; userId: ObjectId; text: string; at: Date };
// 지운 일기의 기기 id (일기 지우기): 늦게 도착한 올리기(동기화)가 지운 일기를 되살리지 못하게 한다. 내용은 없다.
export type GoneDiaryDoc = { _id: ObjectId; userId: ObjectId; clientId: string; at: Date };
// 칭찬 스티커 자랑 (11-10 사용자: "이걸로 친구방에 자랑하기"): 이 반에 그달 스티커판을 보여 주겠다는 표시만. 스티커는 볼 때 숙제에서 센다
export type BragDoc = { _id: ObjectId; classId: ObjectId; userId: ObjectId; month: string; at: Date };
export type AwardDoc = {
  _id: ObjectId;
  userId: ObjectId;
  kind: "streak7" | "streak30" | "streak100" | "weekly" | "homework10" | "homework30" | "homework100" | "birthday";
  key: string; // 사람마다 한 번만 (예: streak7:2026-11-01, weekly:2026-W45)
  rank?: number; // 주간 1~3등
  diaryId?: ObjectId;
  label: string; // 상장 이름
  detail: string; // 상장 본문 한 줄
  at: Date;
};

const g = globalThis as unknown as { _cjMongo?: Promise<MongoClient>; _cjIdx?: Promise<void> };

export async function getDb(): Promise<Db> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new NoDbError();
  g._cjMongo ??= new MongoClient(uri, { maxPoolSize: 5 }).connect();
  const client = await g._cjMongo;
  const db = client.db(process.env.MONGODB_DB || "chamjal");
  g._cjIdx ??= ensureIndexes(db).catch((e) => {
    g._cjIdx = undefined;
    throw e;
  });
  await g._cjIdx;
  return db;
}

export async function cols() {
  const db = await getDb();
  return {
    users: db.collection<UserDoc>("users"),
    diaries: db.collection<DiaryDoc>("diaries"),
    reactions: db.collection<ReactionDoc>("reactions"),
    reports: db.collection<ReportDoc>("reports"),
    classes: db.collection<ClassDoc>("classes"),
    awards: db.collection<AwardDoc>("awards"),
    notes: db.collection<NoteDoc>("notes"),
    adminlog: db.collection<AdminLogDoc>("adminlog"),
    topics: db.collection<TopicDoc>("topics"),
    homework: db.collection<HomeworkDoc>("homework"),
    goneDiaries: db.collection<GoneDiaryDoc>("goneDiaries"),
    brags: db.collection<BragDoc>("brags"),
  };
}

async function ensureIndexes(db: Db) {
  await Promise.all([
    db.collection("users").createIndex({ googleSub: 1 }, { unique: true }),
    db.collection("diaries").createIndex({ userId: 1, clientId: 1 }, { unique: true }),
    db.collection("diaries").createIndex({ "board.status": 1, "board.at": -1 }),
    db.collection("diaries").createIndex({ topic: 1, "board.at": -1 }),
    db.collection("diaries").createIndex({ classIds: 1, createdAt: -1 }),
    db.collection("reactions").createIndex({ diaryId: 1, userId: 1, kind: 1 }, { unique: true }),
    db.collection("reports").createIndex({ diaryId: 1, userId: 1 }, { unique: true }),
    db.collection("classes").createIndex({ code: 1 }, { unique: true }),
    db.collection("classes").createIndex({ memberIds: 1 }),
    db.collection("awards").createIndex({ userId: 1, key: 1 }, { unique: true }),
    db.collection("awards").createIndex({ kind: 1, key: 1 }),
    db.collection("notes").createIndex({ diaryId: 1, at: 1 }),
    db.collection("adminlog").createIndex({ at: -1 }),
    db.collection("topics").createIndex({ date: 1 }, { unique: true }),
    db.collection("homework").createIndex({ userId: 1, date: 1 }, { unique: true }),
    db.collection("homework").createIndex({ date: 1, share: 1, status: 1, at: -1 }),
    db.collection("goneDiaries").createIndex({ userId: 1, clientId: 1 }, { unique: true }),
    db.collection("brags").createIndex({ classId: 1, month: 1, userId: 1 }, { unique: true }),
  ]);
}
