// 아이디 계정 비밀번호 바꾸기 (지금 비밀번호를 한 번 더 확인한다)

import type { NextRequest } from "next/server";
import { cols } from "@/lib/server/db";
import { assertRate, assertSameOrigin, handle, HttpError, json, readJson } from "@/lib/server/http";
import { hashPassword, passwordProblem, verifyPassword } from "@/lib/server/password";
import { requireUser } from "@/lib/server/session";

export async function POST(req: NextRequest) {
  return handle(async () => {
    assertSameOrigin(req);
    const me = await requireUser(req);
    if (!me.loginId || !me.passHash) throw new HttpError(400, "not_id", "아이디로 만든 계정만 비밀번호를 바꿀 수 있어요");
    assertRate(`pwchange:${me._id.toHexString()}`, 5, 10 * 60_000);
    const body = await readJson<{ current?: unknown; next?: unknown }>(req);
    const current = String(body.current ?? "");
    const next = String(body.next ?? "");
    if (!(await verifyPassword(current, me.passHash))) throw new HttpError(401, "wrong", "지금 비밀번호가 맞지 않아요");
    const problem = passwordProblem(next, me.loginId);
    if (problem) throw new HttpError(400, "weak", problem);
    if (next === current) throw new HttpError(400, "same", "지금과 다른 비밀번호로 해 주세요");
    const { users } = await cols();
    await users.updateOne({ _id: me._id }, { $set: { passHash: await hashPassword(next), loginFails: 0 } });
    return json({ ok: true });
  });
}
