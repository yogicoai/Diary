// 일기 한 편 펼쳐 보기 (운영자). 남에게 보여 준 일기만: 게시판·반에 낸 것.
// 혼자 쓴 일기는 { private: true, 날짜 } 만 돌려준다.

import type { NextRequest } from "next/server";
import { adminJson, bodyVisible, canOpen, requireStaff } from "@/lib/server/admin";
import { cols } from "@/lib/server/db";
import { diaryById, oid } from "@/lib/server/find";
import { handle } from "@/lib/server/http";
import { nameTag } from "@/lib/social";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    await requireStaff(req);
    const d = await diaryById((await params).id);
    const { users, classes, notes, reports } = await cols();
    const owner = await users.findOne({ _id: d.userId }, { projection: { nickname: 1, entryYear: 1, classNo: 1 } });
    const who = { id: d.userId.toHexString(), nameTag: owner ? nameTag(owner) : "전학 간 친구" };
    if (!canOpen(d)) return adminJson({ private: true, id: d._id.toHexString(), date: d.date, createdAt: d.createdAt.getTime(), owner: who });

    const [cls, nl, reps] = await Promise.all([
      classes.find({ _id: { $in: d.classIds } }, { projection: { name: 1 } }).toArray(),
      d.classIds.length ? notes.find({ diaryId: d._id }).sort({ at: 1 }).limit(50).toArray() : Promise.resolve([]),
      reports.find({ diaryId: d._id }).toArray(),
    ]);
    const authors = await users
      .find({ _id: { $in: [...new Set(nl.map((n) => n.userId.toHexString()))].map(oid) } }, { projection: { nickname: 1, entryYear: 1, classNo: 1 } })
      .toArray();

    return adminJson({
      private: false,
      id: d._id.toHexString(),
      owner: who,
      date: d.date,
      createdAt: d.createdAt.getTime(),
      weather: d.weather,
      title: d.title,
      body: bodyVisible(d) ? d.body : "",
      bodyHidden: !bodyVisible(d) && !!d.body,
      secret: d.secret,
      late: !!d.late,
      teacher: d.teacher,
      teacherBy: d.teacherBy,
      stickers: d.stickers ?? [],
      strokes: d.strokes,
      bg: d.bg,
      board: d.board
        ? { status: d.board.status, mode: d.board.mode, cardUrl: d.board.cardUrl, checked: d.board.checked, note: d.board.note ?? null }
        : null,
      classes: cls.map((c) => ({ id: c._id.toHexString(), name: c.name })),
      reactions: d.reactions ?? {},
      notes: nl.map((n) => {
        const a = authors.find((u) => u._id.equals(n.userId));
        return { id: n._id.toHexString(), by: a ? nameTag(a) : "전학 간 친구", text: n.text, at: n.at.getTime() };
      }),
      reports: reps.map((r) => r.reason),
    });
  });
}
