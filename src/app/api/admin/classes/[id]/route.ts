// 반 하나: 반장·친구들(이 반에 낸 일기 수)·반에 낸 일기·짝꿍 한마디·반 숙제

import type { NextRequest } from "next/server";
import type { ObjectId } from "mongodb";
import { adminJson, bodyVisible, loginKind, reactionTotal, requireStaff, USER_SAFE } from "@/lib/server/admin";
import { cols } from "@/lib/server/db";
import { oid } from "@/lib/server/find";
import { handle, HttpError } from "@/lib/server/http";
import { nameTag } from "@/lib/social";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    await requireStaff(req);
    const { classes, users, diaries, notes } = await cols();
    const c = await classes.findOne({ _id: oid((await params).id) });
    if (!c) throw new HttpError(404, "not_found", "없는 반이에요");

    const [members, perMember, list] = await Promise.all([
      users.find({ _id: { $in: c.memberIds } }, { projection: USER_SAFE }).toArray(),
      diaries
        .aggregate<{ _id: ObjectId; n: number; last: Date }>([
          { $match: { classIds: c._id } },
          { $group: { _id: "$userId", n: { $sum: 1 }, last: { $max: "$createdAt" } } },
        ])
        .toArray(),
      diaries.find({ classIds: c._id }, { projection: { strokes: 0 } }).sort({ createdAt: -1 }).limit(60).toArray(),
    ]);

    // 반 일기 주인 (반을 나간 사람 일기도 남아 있을 수 있다)
    const ownerIds = [...new Set(list.map((d) => d.userId.toHexString()))].map(oid);
    const owners = await users.find({ _id: { $in: ownerIds } }, { projection: { nickname: 1, entryYear: 1, classNo: 1 } }).toArray();
    const tagOf = (id: ObjectId) => {
      const o = owners.find((u) => u._id.equals(id)) ?? members.find((u) => u._id.equals(id));
      return o ? nameTag(o) : "전학 간 친구";
    };
    const nl = await notes.find({ diaryId: { $in: list.map((d) => d._id) } }).sort({ at: -1 }).limit(40).toArray();
    const noteAuthors = await users
      .find({ _id: { $in: [...new Set(nl.map((n) => n.userId.toHexString()))].map(oid) } }, { projection: { nickname: 1, entryYear: 1, classNo: 1 } })
      .toArray();

    return adminJson({
      class: {
        id: c._id.toHexString(),
        name: c.name,
        code: c.code,
        createdAt: c.createdAt.getTime(),
        homework: c.homework ?? null,
        ownerId: c.ownerId.toHexString(),
      },
      members: members
        .map((u) => {
          const p = perMember.find((a) => a._id.equals(u._id));
          return {
            id: u._id.toHexString(),
            nameTag: nameTag(u),
            login: loginKind(u),
            owner: u._id.equals(c.ownerId),
            banned: !!u.banned,
            diaries: p?.n ?? 0,
            lastDiaryAt: p?.last?.getTime() ?? null,
            lastSeenAt: u.lastSeenAt.getTime(),
          };
        })
        .sort((a, b) => Number(b.owner) - Number(a.owner) || b.diaries - a.diaries),
      diaries: list.map((d) => ({
        id: d._id.toHexString(),
        userId: d.userId.toHexString(),
        nameTag: tagOf(d.userId),
        date: d.date,
        createdAt: d.createdAt.getTime(),
        title: d.title,
        body: bodyVisible(d) ? d.body.slice(0, 80) : "",
        secret: d.secret,
        reactions: reactionTotal(d.reactions),
        notes: nl.filter((n) => n.diaryId.equals(d._id)).length,
      })),
      notes: nl.map((n) => {
        const a = noteAuthors.find((u) => u._id.equals(n.userId));
        return { id: n._id.toHexString(), diaryId: n.diaryId.toHexString(), by: a ? nameTag(a) : "전학 간 친구", text: n.text, at: n.at.getTime() };
      }),
    });
  });
}
