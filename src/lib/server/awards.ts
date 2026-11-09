// 상장: 개근상(7·30·100일 연속) + 이번 주 참 잘한 일기(게시판 도장·스티커 많이 받은 1~3등).
// 날짜는 한국 시간 기준.

import type { ObjectId } from "mongodb";
import { cols, type AwardDoc } from "./db";

const DAY = 86400000;
const KST = 9 * 3600000;

export function kstKey(d = new Date()): string {
  return new Date(d.getTime() + KST).toISOString().slice(0, 10);
}

function addDays(key: string, n: number): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) + n * DAY).toISOString().slice(0, 10);
}

/** 오늘(또는 아직 안 썼으면 어제)까지 끊기지 않고 쓴 날 수 */
export function streakOf(dates: Set<string>, today = kstKey()): { streak: number; start: string | null } {
  let cur = dates.has(today) ? today : addDays(today, -1);
  if (!dates.has(cur)) return { streak: 0, start: null };
  let streak = 0;
  let start = cur;
  while (dates.has(cur)) {
    streak++;
    start = cur;
    cur = addDays(cur, -1);
  }
  return { streak, start };
}

const STREAKS: { days: number; kind: AwardDoc["kind"]; label: string }[] = [
  { days: 7, kind: "streak7", label: "일주일 개근상" },
  { days: 30, kind: "streak30", label: "한 달 개근상" },
  { days: 100, kind: "streak100", label: "백일 개근상" },
];

/** 일기를 저장할 때 불러서 새로 받은 개근상을 돌려준다 */
export async function grantStreak(userId: ObjectId): Promise<AwardDoc[]> {
  const { diaries, awards } = await cols();
  const dates = new Set((await diaries.distinct("date", { userId, late: { $ne: true } })) as string[]);
  const { streak, start } = streakOf(dates);
  const granted: AwardDoc[] = [];
  for (const s of STREAKS) {
    if (streak < s.days || !start) continue;
    const key = `${s.kind}:${start}`;
    const doc = {
      userId,
      kind: s.kind,
      key,
      label: s.label,
      detail: `${s.days}일 동안 하루도 빠짐없이 그림일기를 썼어요`,
      at: new Date(),
    };
    const res = await awards.updateOne({ userId, key }, { $setOnInsert: doc }, { upsert: true });
    if (res.upsertedId) granted.push({ _id: res.upsertedId, ...doc });
  }
  return granted;
}

/** 한국 시간 월요일 0시 */
function mondayOf(d: Date): Date {
  const k = new Date(d.getTime() + KST);
  const dow = (k.getUTCDay() + 6) % 7; // 월=0
  const mon = Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate() - dow);
  return new Date(mon - KST);
}

/** 지난주(월~일) 참 잘한 일기 1~3등. 처음 부를 때 계산해서 남긴다 */
export async function weeklyWinners(): Promise<{ week: string; awards: AwardDoc[] }> {
  const { diaries, awards } = await cols();
  const thisMonday = mondayOf(new Date());
  const start = new Date(thisMonday.getTime() - 7 * DAY);
  const week = kstKey(start);
  const key = `weekly:${week}`;

  const saved = await awards.find({ kind: "weekly", key }).sort({ rank: 1 }).toArray();
  if (saved.length) return { week, awards: saved };

  const top = await diaries
    .aggregate<{ _id: ObjectId; userId: ObjectId; title: string; total: number }>([
      { $match: { "board.status": "visible", "board.at": { $gte: start, $lt: thisMonday } } },
      {
        $project: {
          userId: 1,
          title: 1,
          total: {
            $add: [
              { $ifNull: ["$reactions.cham", 0] },
              { $ifNull: ["$reactions.best", 0] },
              { $ifNull: ["$reactions.cheer", 0] },
              { $ifNull: ["$reactions.star", 0] },
              { $ifNull: ["$reactions.heart", 0] },
              { $ifNull: ["$reactions.smile", 0] },
            ],
          },
        },
      },
      { $match: { total: { $gte: 1 } } },
      { $sort: { total: -1, _id: 1 } },
      { $limit: 3 },
    ])
    .toArray();

  const out: AwardDoc[] = [];
  for (const [i, t] of top.entries()) {
    const doc = {
      userId: t.userId,
      kind: "weekly" as const,
      key,
      rank: i + 1,
      diaryId: t._id,
      label: `이번 주 참 잘한 일기 ${i + 1}등`,
      detail: `「${t.title || "제목 없는 날"}」로 친구들 도장을 ${t.total}개 받았어요`,
      at: new Date(),
    };
    const res = await awards.updateOne({ userId: t.userId, key }, { $setOnInsert: doc }, { upsert: true });
    if (res.upsertedId) out.push({ _id: res.upsertedId, ...doc });
  }
  return { week, awards: out.length ? out : await awards.find({ kind: "weekly", key }).sort({ rank: 1 }).toArray() };
}
