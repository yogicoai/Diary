// 반 숙제 내기 (반장만): 오늘(한국 시간) 이 반의 주제 한 줄

import type { NextRequest } from "next/server";
import { kstKey } from "@/lib/server/awards";
import { cols } from "@/lib/server/db";
import { memberClass } from "@/lib/server/find";
import { assertRate, assertSameOrigin, handle, HttpError, json, readJson } from "@/lib/server/http";
import { requireUser } from "@/lib/server/session";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    assertSameOrigin(req);
    const user = await requireUser(req);
    assertRate(`homework:${user._id}`, 20, 60 * 60 * 1000);
    const c = await memberClass((await params).id, user);
    if (!c.ownerId.equals(user._id)) throw new HttpError(403, "owner", "반 숙제는 반장만 낼 수 있어요");
    const { text } = await readJson<{ text: string }>(req);
    const clean = String(text ?? "").trim().replace(/\s+/g, " ").slice(0, 30);
    const { classes } = await cols();
    if (!clean) {
      await classes.updateOne({ _id: c._id }, { $unset: { homework: "" } });
      return json({ homework: null });
    }
    await classes.updateOne({ _id: c._id }, { $set: { homework: { date: kstKey(), text: clean } } });
    return json({ homework: clean });
  });
}
