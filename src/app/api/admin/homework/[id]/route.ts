// 교무실: 보여 주기로 낸 숙제 검사 — approve(보이기) / hide(내리기)

import type { NextRequest } from "next/server";
import { adminJson, logAction, requireStaff } from "@/lib/server/admin";
import { cols } from "@/lib/server/db";
import { oid } from "@/lib/server/find";
import { assertSameOrigin, handle, HttpError, readJson } from "@/lib/server/http";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    assertSameOrigin(req);
    const { user: me } = await requireStaff(req);
    const { action } = await readJson<{ action?: string }>(req);
    const { homework } = await cols();
    const h = await homework.findOne({ _id: oid((await params).id) });
    if (!h) throw new HttpError(404, "not_found", "없는 숙제예요");
    if (action === "approve") {
      await homework.updateOne({ _id: h._id }, { $set: { status: "visible" }, $unset: { note: "" } });
      await logAction(me, "approve", h._id, `숙제 ${h.date} ${h.mission}`);
    } else if (action === "hide") {
      await homework.updateOne({ _id: h._id }, { $set: { status: "hidden", note: "선생님이 내렸어요" } });
      await logAction(me, "hide", h._id, `숙제 ${h.date} ${h.mission}`);
    } else throw new HttpError(400, "action");
    return adminJson({ ok: true });
  });
}
