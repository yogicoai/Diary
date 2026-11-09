// 게시판 처리: approve(보이기, 신고 지움) / hide(내리기)

import type { NextRequest } from "next/server";
import { adminJson, logAction, requireStaff } from "@/lib/server/admin";
import { cols } from "@/lib/server/db";
import { diaryById } from "@/lib/server/find";
import { assertSameOrigin, handle, HttpError, readJson } from "@/lib/server/http";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    assertSameOrigin(req);
    const { user: me } = await requireStaff(req);
    const { action } = await readJson<{ action?: string }>(req);
    const d = await diaryById((await params).id);
    if (!d.board) throw new HttpError(404, "not_found", "게시판에 없는 일기예요");
    const { diaries, reports } = await cols();
    if (action === "approve") {
      await diaries.updateOne({ _id: d._id }, { $set: { "board.status": "visible", "board.reports": 0 }, $unset: { "board.note": "" } });
      await reports.deleteMany({ diaryId: d._id });
      await logAction(me, "approve", d._id, d.title);
    } else if (action === "hide") {
      await diaries.updateOne(
        { _id: d._id },
        { $set: { "board.status": "hidden", "board.note": "게시판 약속에 맞지 않아 선생님이 내렸어요" } },
      );
      await logAction(me, "hide", d._id, d.title);
    } else throw new HttpError(400, "action");
    return adminJson({ ok: true });
  });
}
