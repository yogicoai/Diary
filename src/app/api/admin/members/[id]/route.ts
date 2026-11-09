// 회원 한 명: 이름표·반·일기(볼 수 있는 만큼)·짝꿍 한마디·상장·신고 / 정지하기·정지 풀기

import type { NextRequest } from "next/server";
import { adminJson, diaryRow, logAction, personBrief, requireStaff, USER_SAFE } from "@/lib/server/admin";
import { cols } from "@/lib/server/db";
import { oid } from "@/lib/server/find";
import { assertSameOrigin, handle, HttpError, readJson } from "@/lib/server/http";
import { nameTag } from "@/lib/social";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    await requireStaff(req);
    const id = oid((await params).id);
    const { users, diaries, classes, awards, reports, reactions, notes } = await cols();
    const u = await users.findOne({ _id: id }, { projection: USER_SAFE });
    if (!u) throw new HttpError(404, "not_found", "없는 회원이에요");

    const [list, cls, aw, given, reportsMade, myNotes] = await Promise.all([
      diaries.find({ userId: u._id }, { projection: { strokes: 0, body: 0 } }).sort({ date: -1, createdAt: -1 }).limit(300).toArray(),
      classes.find({ memberIds: u._id }).toArray(),
      awards.find({ userId: u._id }).sort({ at: -1 }).limit(30).toArray(),
      reactions.countDocuments({ userId: u._id }),
      reports.countDocuments({ userId: u._id }),
      notes.find({ userId: u._id }).sort({ at: -1 }).limit(10).toArray(),
    ]);

    // 일기에 붙은 반 이름 (이 사람이 나간 반도 있을 수 있어서 따로 찾는다)
    const classIds = [...new Set(list.flatMap((d) => d.classIds.map((c) => c.toHexString())))];
    const allCls = await classes.find({ _id: { $in: classIds.map(oid) } }, { projection: { name: 1 } }).toArray();
    const names = new Map(allCls.map((c) => [c._id.toHexString(), c.name]));
    const reportsOn = await reports.countDocuments({ diaryId: { $in: list.map((d) => d._id) } });

    return adminJson({
      person: { ...personBrief(u), entryYear: u.entryYear, classNo: u.classNo },
      counts: {
        diaries: list.length,
        board: list.filter((d) => d.board?.status === "visible").length,
        classShared: list.filter((d) => d.classIds.length > 0).length,
        alone: list.filter((d) => !d.board && d.classIds.length === 0).length,
        stampsGot: list.reduce((a, d) => a + Object.values(d.reactions ?? {}).reduce<number>((x, y) => x + (y ?? 0), 0), 0),
        stampsGiven: given,
        reportsOn,
        reportsMade,
      },
      classes: cls.map((c) => ({
        id: c._id.toHexString(),
        name: c.name,
        owner: c.ownerId.equals(u._id),
        members: c.memberIds.length,
        code: c.code,
      })),
      diaries: list.map((d) => diaryRow(d, names)),
      awards: aw.map((a) => ({ id: a._id.toHexString(), label: a.label, detail: a.detail, at: a.at.getTime() })),
      notes: myNotes.map((n) => ({ id: n._id.toHexString(), diaryId: n.diaryId.toHexString(), text: n.text, at: n.at.getTime() })),
    });
  });
}

/** 정지하기(게시판에 보이던 일기도 내린다) · 정지 풀기 */
export async function POST(req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    assertSameOrigin(req);
    const { user: me } = await requireStaff(req);
    const id = oid((await params).id);
    const { action } = await readJson<{ action?: string }>(req);
    const { users, diaries } = await cols();
    const u = await users.findOne({ _id: id }, { projection: USER_SAFE });
    if (!u) throw new HttpError(404, "not_found", "없는 회원이에요");
    if (u.staff || u._id.equals(me._id)) throw new HttpError(400, "staff", "운영자 계정은 정지할 수 없어요");

    if (action === "ban") {
      await users.updateOne({ _id: u._id }, { $set: { banned: true } });
      const r = await diaries.updateMany(
        { userId: u._id, "board.status": "visible" },
        { $set: { "board.status": "hidden", "board.note": "운영자가 내렸어요" } },
      );
      await logAction(me, "ban", u._id, `${nameTag(u)} · 게시판 ${r.modifiedCount}장 내림`);
      return adminJson({ ok: true, hidden: r.modifiedCount });
    }
    if (action === "unban") {
      await users.updateOne({ _id: u._id }, { $unset: { banned: "" } });
      await logAction(me, "unban", u._id, nameTag(u));
      return adminJson({ ok: true });
    }
    throw new HttpError(400, "action");
  });
}
