// 관리자: 오늘의 숙제 (선생님이 날짜별로 숙제 걸기)
//  GET    앞으로 3주 숙제(누가 정했나) + 지난 30일 숙제별 인증 수 + 반응 좋은 숙제 + 보여 주기 인증(검사)
//  POST   { date, text, note } 그날 숙제 걸기 (오늘부터 1년 안)
//  DELETE ?date=  건 숙제 되돌리기 (요일 숙제로)

import type { NextRequest } from "next/server";
import { adminJson, logAction, requireStaff } from "@/lib/server/admin";
import { kstKey } from "@/lib/server/awards";
import { cols } from "@/lib/server/db";
import { assertSameOrigin, handle, HttpError, readJson } from "@/lib/server/http";
import { DATE_KEY, resolveTopics } from "@/lib/server/topics";
import { weekdayOf } from "@/lib/topics";
import { homeworkToClient } from "@/lib/server/homework";
import { nameTag } from "@/lib/social";

const DAY = 86400000;
function addDays(key: string, n: number): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) + n * DAY).toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  return handle(async () => {
    await requireStaff(req);
    const today = kstKey();
    const ahead = Array.from({ length: 21 }, (_, i) => addDays(today, i));
    const back = Array.from({ length: 30 }, (_, i) => addDays(today, -1 - i));
    const { homework, users } = await cols();
    const [upcoming, past, counts, recent] = await Promise.all([
      resolveTopics(ahead),
      resolveTopics(back),
      homework
        .aggregate<{ _id: string; n: number; board: number; texts: (string | null)[] }>([
          { $match: { date: { $in: [today, ...back] } } },
          {
            $group: {
              _id: "$date",
              n: { $sum: 1 },
              board: { $sum: { $cond: [{ $and: ["$share", { $eq: ["$status", "visible"] }] }, 1, 0] } },
              texts: { $push: "$mission" },
            },
          },
        ])
        .toArray(),
      homework.find({ share: true }).sort({ updatedAt: -1 }).limit(30).toArray(),
    ]);
    const owners = await users
      .find({ _id: { $in: recent.map((h) => h.userId) } }, { projection: { nickname: 1, birthYear: 1 } })
      .toArray();
    const tagOf = (id: (typeof recent)[number]["userId"]) => {
      const o = owners.find((u) => u._id.equals(id));
      return o ? nameTag(o) : "전학 간 친구";
    };
    const count = (date: string) => counts.find((c) => c._id === date);
    /** 그날 실제로 낸 숙제 글 (선생님이 나중에 바꿨어도 낸 사람들이 본 글) */
    const writtenText = (date: string, fallback: string) => {
      const texts = (count(date)?.texts ?? []).filter((t): t is string => !!t);
      if (!texts.length) return fallback;
      const tally = new Map<string, number>();
      for (const t of texts) tally.set(t, (tally.get(t) ?? 0) + 1);
      return [...tally.entries()].sort((a, b) => b[1] - a[1])[0][0];
    };

    const pastRows = back.map((date) => {
      const t = past.get(date)!;
      const c = count(date);
      return { date, weekday: weekdayOf(date), text: writtenText(date, t.text), kind: t.kind, written: c?.n ?? 0, board: c?.board ?? 0 };
    });
    return adminJson({
      today,
      todayWritten: count(today)?.n ?? 0,
      upcoming: ahead.map((date) => ({ ...upcoming.get(date)!, weekday: weekdayOf(date) })),
      past: pastRows,
      best: [...pastRows].filter((r) => r.written > 0).sort((a, b) => b.written - a.written || b.board - a.board).slice(0, 5),
      shared: recent.map((h) => ({ ...homeworkToClient(h, tagOf(h.userId)), userId: h.userId.toHexString(), checked: h.checked })),
    });
  });
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    assertSameOrigin(req);
    const { user } = await requireStaff(req);
    const body = await readJson<{ date?: unknown; text?: unknown; note?: unknown }>(req);
    const date = String(body.date ?? "");
    const text = String(body.text ?? "").replace(/\s+/g, " ").trim();
    const note = String(body.note ?? "").replace(/\s+/g, " ").trim();
    const today = kstKey();
    if (!DATE_KEY.test(date) || date < today || date > addDays(today, 366)) throw new HttpError(400, "date", "오늘부터 1년 안의 날짜를 골라 주세요");
    if (text.length < 2 || text.length > 24) throw new HttpError(400, "text", "숙제는 2~24자로 써 주세요 (숙제 칸에서 안 잘리게 14자 안쪽이 좋아요)");
    if (note.length > 40) throw new HttpError(400, "note", "선생님 한마디는 40자까지예요");
    const { topics } = await cols();
    await topics.updateOne(
      { date },
      { $set: { text, by: user.loginId ?? user.nickname, at: new Date(), ...(note ? { note } : {}) }, ...(note ? {} : { $unset: { note: "" } }) },
      { upsert: true },
    );
    await logAction(user, "topic", date, `${date} ${text}`);
    return adminJson({ ok: true });
  });
}

export async function DELETE(req: NextRequest) {
  return handle(async () => {
    assertSameOrigin(req);
    const { user } = await requireStaff(req);
    const date = req.nextUrl.searchParams.get("date") ?? "";
    if (!DATE_KEY.test(date)) throw new HttpError(400, "date");
    const { topics } = await cols();
    const r = await topics.deleteOne({ date });
    if (r.deletedCount) await logAction(user, "untopic", date, `${date} 요일 숙제로 되돌림`);
    return adminJson({ ok: true });
  });
}
