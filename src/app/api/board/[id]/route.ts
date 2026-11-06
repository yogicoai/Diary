// 게시판 일기 하나 (+ 내가 찍은 도장, 내 일기인지)

import type { NextRequest } from "next/server";
import { cols } from "@/lib/server/db";
import { diaryById, ownersOf } from "@/lib/server/find";
import { handle, HttpError, json } from "@/lib/server/http";
import { boardItem } from "@/lib/server/serialize";
import { currentUser, isAdmin } from "@/lib/server/session";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const d = await diaryById((await params).id);
    const me = await currentUser(req);
    const mine = !!me && d.userId.equals(me._id);
    if (!d.board || (d.board.status !== "visible" && !mine && !isAdmin(me))) {
      throw new HttpError(404, "not_found", "게시판에서 내려간 일기예요");
    }
    const owners = await ownersOf([d]);
    let myReactions: string[] = [];
    if (me) {
      const { reactions } = await cols();
      myReactions = (await reactions.find({ diaryId: d._id, userId: me._id }).toArray()).map((r) => r.kind);
    }
    return json({
      item: boardItem(d, owners.get(d.userId.toHexString()) ?? null),
      status: d.board.status,
      note: d.board.note ?? null,
      mine,
      myReactions,
      loggedIn: !!me,
    });
  });
}
