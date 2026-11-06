// 관리자: 확인 대기·숨김·신고된 게시물 목록 (ADMIN_EMAILS, 개발 중엔 개발용 로그인)

import type { NextRequest } from "next/server";
import { cols } from "@/lib/server/db";
import { ownersOf } from "@/lib/server/find";
import { handle, HttpError, json } from "@/lib/server/http";
import { boardItem } from "@/lib/server/serialize";
import { currentUser, isAdmin } from "@/lib/server/session";

export async function GET(req: NextRequest) {
  return handle(async () => {
    const me = await currentUser(req);
    if (!isAdmin(me)) throw new HttpError(403, "admin", "선생님만 볼 수 있어요");
    const { diaries, reports } = await cols();
    const list = await diaries
      .find({ $or: [{ "board.status": { $in: ["pending", "hidden"] } }, { "board.reports": { $gt: 0 } }] })
      .sort({ "board.at": -1 })
      .limit(100)
      .toArray();
    const owners = await ownersOf(list);
    const reps = await reports.find({ diaryId: { $in: list.map((d) => d._id) } }).toArray();
    return json({
      items: list.map((d) => ({
        ...boardItem(d, owners.get(d.userId.toHexString()) ?? null),
        body: d.body,
        status: d.board?.status,
        checked: d.board?.checked ?? false,
        note: d.board?.note ?? null,
        reports: reps.filter((r) => r.diaryId.equals(d._id)).map((r) => r.reason),
      })),
    });
  });
}
