// 칭찬 스티커 자랑 (11-10 사용자: "숙제 스티커는 월별로, 이걸로 친구방에 자랑하기도"):
// 이 반에 이번 달 칭찬 스티커판을 걸기(POST) / 내리기(DELETE). 스티커는 반 화면을 볼 때 숙제에서 세서 늘 지금 판 그대로 보인다.
// 숙제 내용(미션·한 줄·사진)은 안 보이고 스티커만.

import type { NextRequest } from "next/server";
import { cols } from "@/lib/server/db";
import { memberClass } from "@/lib/server/find";
import { assertRate, assertSameOrigin, handle, HttpError, json } from "@/lib/server/http";
import { requireUser } from "@/lib/server/session";
import { kstToday } from "@/lib/social";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    assertSameOrigin(req);
    const user = await requireUser(req);
    assertRate(`brag:${user._id}`, 30, 60 * 60 * 1000);
    const c = await memberClass((await params).id, user);
    const month = kstToday().slice(0, 7);
    const { homework, brags } = await cols();
    const n = await homework.countDocuments({ userId: user._id, date: { $gte: `${month}-01`, $lte: `${month}-31` } });
    if (!n) throw new HttpError(400, "empty", "이번 달엔 아직 스티커가 없어요. 오늘의 숙제부터 해 볼까요?");
    await brags.updateOne({ classId: c._id, userId: user._id, month }, { $set: { at: new Date() } }, { upsert: true });
    return json({ ok: true, month, count: n });
  });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    assertSameOrigin(req);
    const user = await requireUser(req);
    const c = await memberClass((await params).id, user);
    const { brags } = await cols();
    await brags.deleteOne({ classId: c._id, userId: user._id, month: kstToday().slice(0, 7) });
    return json({ ok: true });
  });
}
