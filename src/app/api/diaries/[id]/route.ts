// 내 일기 하나: 우리 반에 보내기(PATCH classIds) / 지우기(DELETE)

import type { NextRequest } from "next/server";
import { cols } from "@/lib/server/db";
import { myDiary, oid } from "@/lib/server/find";
import { assertSameOrigin, handle, HttpError, json, readJson } from "@/lib/server/http";
import { removeMyDiary } from "@/lib/server/removeDiary";
import { diaryToClient } from "@/lib/server/serialize";
import { requireUser } from "@/lib/server/session";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    assertSameOrigin(req);
    const user = await requireUser(req);
    const d = await myDiary((await params).id, user);
    const body = await readJson<{ classIds?: string[] }>(req);
    if (!Array.isArray(body.classIds) || body.classIds.length > 20) throw new HttpError(400, "classIds");

    const { classes, diaries } = await cols();
    const wanted = body.classIds.map(oid);
    const mine = await classes.find({ _id: { $in: wanted }, memberIds: user._id }, { projection: { _id: 1 } }).toArray();
    const updated = await diaries.findOneAndUpdate(
      { _id: d._id },
      { $set: { classIds: mine.map((c) => c._id), updatedAt: new Date() } },
      { returnDocument: "after" },
    );
    if (!updated) throw new HttpError(404, "not_found");
    return json({ diary: diaryToClient(updated) });
  });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    assertSameOrigin(req);
    const user = await requireUser(req);
    const d = await myDiary((await params).id, user);
    await removeMyDiary(user._id, d.clientId, d);
    return json({ ok: true, deleted: true });
  });
}
