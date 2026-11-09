// 숙제 검사 공통: 받을 스티커 고르기 · 숙제 상장 · 화면으로 보낼 모양

import type { ObjectId } from "mongodb";
import { cols, type AwardDoc, type HomeworkDoc } from "./db";

// 숙제 스티커는 어떤 숙제에도 어울리는 칭찬만 (일기 내용에 맞춰 고르는 스티커와 달리)
const HOMEWORK_STICKERS = ["best", "great", "cool", "thanks", "proud", "hundred", "bravo", "laugh"];

/** 숙제 스티커: 사람·날짜마다 정해진 한 장 (다시 내도 같은 스티커) — 여러 가지를 모으는 재미 */
export function homeworkSticker(userId: ObjectId, date: string): string {
  const s = userId.toHexString() + date;
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return HOMEWORK_STICKERS[(h >>> 0) % HOMEWORK_STICKERS.length];
}

const MILESTONES: { n: number; kind: AwardDoc["kind"]; label: string }[] = [
  { n: 10, kind: "homework10", label: "숙제 잘하는 어른이 상" },
  { n: 30, kind: "homework30", label: "숙제왕 상" },
  { n: 100, kind: "homework100", label: "백 번 숙제 대장 상" },
];

/** 숙제를 n번 채우면 상장 (사람마다 한 번씩) */
export async function grantHomework(userId: ObjectId, count: number): Promise<AwardDoc[]> {
  const { awards } = await cols();
  const out: AwardDoc[] = [];
  for (const m of MILESTONES) {
    if (count < m.n) continue;
    const doc = { userId, kind: m.kind, key: m.kind, label: m.label, detail: `오늘의 숙제를 ${m.n}번이나 해냈어요`, at: new Date() };
    const res = await awards.updateOne({ userId, key: m.kind }, { $setOnInsert: doc }, { upsert: true });
    if (res.upsertedId) out.push({ _id: res.upsertedId, ...doc });
  }
  return out;
}

export function homeworkToClient(h: HomeworkDoc, nameTag?: string) {
  return {
    id: h._id.toHexString(),
    date: h.date,
    mission: h.mission,
    text: h.text,
    photoUrl: h.photoUrl,
    thumbUrl: h.thumbUrl,
    sticker: h.sticker,
    share: h.share,
    status: h.status,
    at: h.at.getTime(),
    ...(nameTag ? { nameTag } : {}),
  };
}
