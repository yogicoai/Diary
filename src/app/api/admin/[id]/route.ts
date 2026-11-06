// 관리자 처리: approve(게시판에 보이기, 신고 지움) / hide(내리기)

import type { NextRequest } from "next/server";
import { cols } from "@/lib/server/db";
import { diaryById } from "@/lib/server/find";
import { assertSameOrigin, handle, HttpError, json, readJson } from "@/lib/server/http";
import { currentUser, isAdmin } from "@/lib/server/session";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    assertSameOrigin(req);
    const me = await currentUser(req);
    if (!isAdmin(me)) throw new HttpError(403, "admin");
    const { action } = await readJson<{ action: "approve" | "hide" }>(req);
    const d = await diaryById((await params).id);
    if (!d.board) throw new HttpError(404, "not_found");
    const { diaries, reports } = await cols();
    if (action === "approve") {
      await diaries.updateOne(
        { _id: d._id },
        { $set: { "board.status": "visible", "board.reports": 0 }, $unset: { "board.note": "" } },
      );
      await reports.deleteMany({ diaryId: d._id });
    } else if (action === "hide") {
      await diaries.updateOne(
        { _id: d._id },
        { $set: { "board.status": "hidden", "board.note": "게시판 약속에 맞지 않아 선생님이 내렸어요" } },
      );
    } else throw new HttpError(400, "action");
    return json({ ok: true });
  });
}
