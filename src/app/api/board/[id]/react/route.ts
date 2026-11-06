// 친구 일기에 도장·스티커 찍기 (한 번 더 누르면 떼기).
// 게시판에 붙은 일기이거나, 같은 반에 보낸 일기만. 내 일기에는 못 찍는다.

import type { NextRequest } from "next/server";
import { MongoServerError } from "mongodb";
import { cols } from "@/lib/server/db";
import { diaryById } from "@/lib/server/find";
import { assertRate, assertSameOrigin, handle, HttpError, json, readJson } from "@/lib/server/http";
import { requireUser } from "@/lib/server/session";
import { REACTION_KINDS, type ReactionKind } from "@/lib/social";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    assertSameOrigin(req);
    const user = await requireUser(req);
    assertRate(`react:${user._id}`, 120, 10 * 60 * 1000);
    const { kind } = await readJson<{ kind: ReactionKind }>(req);
    if (!REACTION_KINDS.includes(kind)) throw new HttpError(400, "kind");

    const d = await diaryById((await params).id);
    if (d.userId.equals(user._id)) throw new HttpError(400, "own", "내 일기에는 도장을 찍을 수 없어요");
    const { classes, diaries, reactions } = await cols();
    const onBoard = d.board?.status === "visible";
    const inMyClass =
      !onBoard &&
      d.classIds.length > 0 &&
      !!(await classes.findOne({ _id: { $in: d.classIds }, memberIds: user._id }, { projection: { _id: 1 } }));
    if (!onBoard && !inMyClass) throw new HttpError(403, "hidden", "볼 수 없는 일기예요");

    let delta = 1;
    try {
      await reactions.insertOne({ diaryId: d._id, userId: user._id, kind, at: new Date() } as never);
    } catch (e) {
      if (!(e instanceof MongoServerError && e.code === 11000)) throw e;
      await reactions.deleteOne({ diaryId: d._id, userId: user._id, kind });
      delta = -1;
    }
    const updated = await diaries.findOneAndUpdate(
      { _id: d._id },
      { $inc: { [`reactions.${kind}`]: delta } },
      { returnDocument: "after", projection: { reactions: 1 } },
    );
    const mine = (await reactions.find({ diaryId: d._id, userId: user._id }).toArray()).map((r) => r.kind);
    return json({ reactions: updated?.reactions ?? {}, mine });
  });
}
