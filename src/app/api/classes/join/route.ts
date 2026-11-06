// 초대 코드로 반 들어가기 (POST {code}). 한 반 30명까지.

import type { NextRequest } from "next/server";
import { cols } from "@/lib/server/db";
import { assertRate, assertSameOrigin, handle, HttpError, json, readJson } from "@/lib/server/http";
import { classToClient } from "@/lib/server/serialize";
import { requireUser } from "@/lib/server/session";

const MAX_MEMBERS = 30;

export async function POST(req: NextRequest) {
  return handle(async () => {
    assertSameOrigin(req);
    const user = await requireUser(req);
    assertRate(`join:${user._id}`, 20, 60 * 60 * 1000);
    const { code } = await readJson<{ code: string }>(req);
    const clean = String(code ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    const { classes } = await cols();
    const c = await classes.findOne({ code: clean });
    if (!c) throw new HttpError(404, "not_found", "초대 코드를 다시 확인해 주세요");
    if (!c.memberIds.some((m) => m.equals(user._id))) {
      if (c.memberIds.length >= MAX_MEMBERS) throw new HttpError(400, "full", "이 반은 자리가 꽉 찼어요");
      await classes.updateOne({ _id: c._id }, { $addToSet: { memberIds: user._id } });
      c.memberIds.push(user._id);
    }
    return json({ class: classToClient(c, user._id.toHexString()) });
  });
}
