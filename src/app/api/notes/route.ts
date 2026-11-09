// 짝꿍 한마디: 반 친구 일기에 빨간 색연필 한 줄 남기기(POST {diaryId, text}) / 내 한마디 지우기(DELETE ?id=)
// 그 일기가 보내진 반의 친구(와 일기 주인)만 남길 수 있다. 공개 게시판에는 열지 않는다.

import type { NextRequest } from "next/server";
import { cols } from "@/lib/server/db";
import { diaryById, oid } from "@/lib/server/find";
import { assertRate, assertSameOrigin, handle, HttpError, json, readJson } from "@/lib/server/http";
import { requireUser } from "@/lib/server/session";
import { nameTag } from "@/lib/social";

export async function POST(req: NextRequest) {
  return handle(async () => {
    assertSameOrigin(req);
    const user = await requireUser(req);
    assertRate(`note:${user._id}`, 60, 10 * 60 * 1000);
    const { diaryId, text } = await readJson<{ diaryId: string; text: string }>(req);
    const clean = String(text ?? "").trim().replace(/\s+/g, " ").slice(0, 40);
    if (!clean) throw new HttpError(400, "empty", "한마디를 써 주세요");
    const d = await diaryById(diaryId);
    const { classes, notes } = await cols();
    const mine = d.userId.equals(user._id);
    const together =
      d.classIds.length > 0 && !!(await classes.findOne({ _id: { $in: d.classIds }, memberIds: user._id }, { projection: { _id: 1 } }));
    if (!mine && !together) throw new HttpError(403, "not_member", "같은 반 친구 일기에만 남길 수 있어요");
    if ((await notes.countDocuments({ diaryId: d._id })) >= 50) throw new HttpError(400, "full", "한마디가 꽉 찼어요");
    const doc = { diaryId: d._id, userId: user._id, text: clean, at: new Date() };
    const res = await notes.insertOne(doc as never);
    return json({ note: { id: res.insertedId.toHexString(), who: nameTag(user), text: clean, mine: true } });
  });
}

export async function DELETE(req: NextRequest) {
  return handle(async () => {
    assertSameOrigin(req);
    const user = await requireUser(req);
    const id = oid(req.nextUrl.searchParams.get("id") ?? "");
    const { notes } = await cols();
    const r = await notes.deleteOne({ _id: id, userId: user._id });
    if (!r.deletedCount) throw new HttpError(404, "not_found", "지울 한마디가 없어요");
    return json({ ok: true });
  });
}
