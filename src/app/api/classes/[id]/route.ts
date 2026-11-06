// 반 하나: 반 정보 + 친구 이름표 + 반에 보낸 일기(GET) / 반 나가기(DELETE)

import type { NextRequest } from "next/server";
import { cols } from "@/lib/server/db";
import { memberClass, ownersOf } from "@/lib/server/find";
import { assertSameOrigin, handle, json } from "@/lib/server/http";
import { classItem, classToClient } from "@/lib/server/serialize";
import { requireUser } from "@/lib/server/session";
import { nameTag } from "@/lib/social";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const user = await requireUser(req);
    const c = await memberClass((await params).id, user);
    const { diaries, users, reactions } = await cols();
    const [members, feed] = await Promise.all([
      users.find({ _id: { $in: c.memberIds } }, { projection: { nickname: 1, entryYear: 1, classNo: 1 } }).toArray(),
      diaries.find({ classIds: c._id }).sort({ createdAt: -1 }).limit(40).toArray(),
    ]);
    const owners = await ownersOf(feed);
    const mine = await reactions
      .find({ userId: user._id, diaryId: { $in: feed.map((d) => d._id) } }, { projection: { diaryId: 1, kind: 1 } })
      .toArray();
    const mineBy = new Map<string, string[]>();
    for (const r of mine) {
      const k = r.diaryId.toHexString();
      mineBy.set(k, [...(mineBy.get(k) ?? []), r.kind]);
    }
    return json({
      class: classToClient(c, user._id.toHexString()),
      members: members.map((m) => ({ id: m._id.toHexString(), nameTag: nameTag(m) })),
      feed: feed.map((d) => ({
        ...classItem(d, owners.get(d.userId.toHexString()) ?? null),
        mine: d.userId.equals(user._id),
        myReactions: mineBy.get(d._id.toHexString()) ?? [],
      })),
    });
  });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    assertSameOrigin(req);
    const user = await requireUser(req);
    const c = await memberClass((await params).id, user);
    const { classes, diaries } = await cols();
    const rest = c.memberIds.filter((m) => !m.equals(user._id));
    if (rest.length === 0) {
      await classes.deleteOne({ _id: c._id });
      await diaries.updateMany({ classIds: c._id }, { $pull: { classIds: c._id } });
    } else {
      await classes.updateOne(
        { _id: c._id },
        { $pull: { memberIds: user._id }, ...(c.ownerId.equals(user._id) ? { $set: { ownerId: rest[0] } } : {}) },
      );
      await diaries.updateMany({ userId: user._id, classIds: c._id }, { $pull: { classIds: c._id } });
    }
    return json({ ok: true });
  });
}
