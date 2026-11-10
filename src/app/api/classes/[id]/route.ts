// 반 하나: 반 정보 + 출석부(오늘 반에 일기 낸 친구) + 반 숙제 + 이번 달 칭찬 스티커 자랑 + 반에 보낸 일기와 짝꿍 한마디(GET) / 반 나가기(DELETE)

import type { NextRequest } from "next/server";
import { kstKey } from "@/lib/server/awards";
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
    const today = kstKey();
    const { diaries, users, reactions, notes, brags, homework } = await cols();
    const [members, feed, todays] = await Promise.all([
      users.find({ _id: { $in: c.memberIds } }, { projection: { nickname: 1, birth: 1, birthYear: 1 } }).toArray(),
      diaries.find({ classIds: c._id }).sort({ createdAt: -1 }).limit(40).toArray(),
      // 출석부: 오늘 이 반에 일기를 낸 사람 (혼자 쓴 일기는 드러나지 않는다)
      diaries.distinct("userId", { classIds: c._id, date: today }),
    ]);
    const handedIn = new Set(todays.map((id) => id.toHexString()));
    const owners = await ownersOf(feed);
    const ids = feed.map((d) => d._id);
    const [mine, allNotes] = await Promise.all([
      reactions.find({ userId: user._id, diaryId: { $in: ids } }, { projection: { diaryId: 1, kind: 1 } }).toArray(),
      notes.find({ diaryId: { $in: ids } }).sort({ at: 1 }).limit(400).toArray(),
    ]);
    const mineBy = new Map<string, string[]>();
    for (const r of mine) {
      const k = r.diaryId.toHexString();
      mineBy.set(k, [...(mineBy.get(k) ?? []), r.kind]);
    }
    const memberTag = new Map(members.map((m) => [m._id.toHexString(), nameTag(m)]));
    // 이번 달 칭찬 스티커 자랑: 자랑한 반 친구의 이번 달 스티커 (숙제 내용은 빼고 스티커만, 많이 모은 순)
    const month = today.slice(0, 7);
    const bragged = (await brags.find({ classId: c._id, month }).toArray()).filter((b) => memberTag.has(b.userId.toHexString()));
    const hw = bragged.length
      ? await homework
          .find({ userId: { $in: bragged.map((b) => b.userId) }, date: { $gte: `${month}-01`, $lte: `${month}-31` } }, { projection: { userId: 1, date: 1, sticker: 1 } })
          .sort({ date: 1 })
          .toArray()
      : [];
    const bragList = bragged
      .map((b) => {
        const mine = hw.filter((h) => h.userId.equals(b.userId));
        return { nameTag: memberTag.get(b.userId.toHexString()) ?? "", stickers: mine.map((h) => h.sticker), mine: b.userId.equals(user._id) };
      })
      .filter((b) => b.stickers.length)
      .sort((a, b) => b.stickers.length - a.stickers.length);
    const notesBy = new Map<string, { id: string; who: string; text: string; mine: boolean }[]>();
    for (const n of allNotes) {
      const k = n.diaryId.toHexString();
      notesBy.set(k, [
        ...(notesBy.get(k) ?? []),
        { id: n._id.toHexString(), who: memberTag.get(n.userId.toHexString()) ?? "전학 간 친구", text: n.text, mine: n.userId.equals(user._id) },
      ]);
    }
    return json({
      today,
      class: classToClient(c, user._id.toHexString()),
      homework: c.homework?.date === today ? c.homework.text : null,
      month,
      brags: bragList,
      members: members
        .map((m) => ({ id: m._id.toHexString(), nameTag: nameTag(m), handedIn: handedIn.has(m._id.toHexString()), me: m._id.equals(user._id) }))
        .sort((a, b) => Number(b.handedIn) - Number(a.handedIn)),
      feed: feed.map((d) => ({
        ...classItem(d, owners.get(d.userId.toHexString()) ?? null),
        mine: d.userId.equals(user._id),
        myReactions: mineBy.get(d._id.toHexString()) ?? [],
        notes: notesBy.get(d._id.toHexString()) ?? [],
      })),
    });
  });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    assertSameOrigin(req);
    const user = await requireUser(req);
    const c = await memberClass((await params).id, user);
    const { classes, diaries, brags } = await cols();
    const rest = c.memberIds.filter((m) => !m.equals(user._id));
    await brags.deleteMany(rest.length === 0 ? { classId: c._id } : { classId: c._id, userId: user._id }); // 나가면 그 반 스티커 자랑도 내린다
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
