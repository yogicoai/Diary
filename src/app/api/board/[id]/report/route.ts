// 신고: 사람마다 한 번. 쌓이면 자동으로 숨기고 관리자 확인 목록으로.

import type { NextRequest } from "next/server";
import { MongoServerError } from "mongodb";
import { cols } from "@/lib/server/db";
import { diaryById } from "@/lib/server/find";
import { assertRate, assertSameOrigin, handle, HttpError, json, readJson } from "@/lib/server/http";
import { requireUser } from "@/lib/server/session";
import { AUTO_HIDE_REPORTS, REPORT_REASONS } from "@/lib/social";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    assertSameOrigin(req);
    const user = await requireUser(req);
    assertRate(`report:${user._id}`, 20, 60 * 60 * 1000);
    const { reason } = await readJson<{ reason: string }>(req);
    if (!REPORT_REASONS.includes(reason)) throw new HttpError(400, "reason");

    const d = await diaryById((await params).id);
    if (!d.board) throw new HttpError(404, "not_found");
    if (d.userId.equals(user._id)) throw new HttpError(400, "own");
    const { diaries, reports } = await cols();
    try {
      await reports.insertOne({ diaryId: d._id, userId: user._id, reason, at: new Date() } as never);
    } catch (e) {
      if (e instanceof MongoServerError && e.code === 11000) return json({ ok: true, already: true });
      throw e;
    }
    const updated = await diaries.findOneAndUpdate(
      { _id: d._id },
      { $inc: { "board.reports": 1 } },
      { returnDocument: "after", projection: { board: 1 } },
    );
    if (updated?.board && updated.board.reports >= AUTO_HIDE_REPORTS && updated.board.status === "visible") {
      await diaries.updateOne(
        { _id: d._id },
        { $set: { "board.status": "hidden", "board.note": "신고가 쌓여 잠시 내렸어요. 선생님이 확인할게요" } },
      );
    }
    return json({ ok: true });
  });
}
