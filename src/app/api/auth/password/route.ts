// 아이디로 들어가기 — 교무실 선생님(fe·yogico)만. 일반 사용자는 구글로만 들어온다 (11-09 사용자).
// 막는 것: 다른 사이트에서 보내기, 한 곳에서 10분에 10번 넘게, 한 아이디 5번 틀리면 15분 잠금.

import { NextResponse, type NextRequest } from "next/server";
import { cols } from "@/lib/server/db";
import { assertRate, assertSameOrigin, clientIp, handle, HttpError, readJson } from "@/lib/server/http";
import { verifyPassword } from "@/lib/server/password";
import { setSession } from "@/lib/server/session";
import { staffOfLoginId } from "@/lib/staff";

const MAX_FAILS = 5;
const LOCK_MS = 15 * 60_000;
const WRONG = "아이디나 비밀번호가 맞지 않아요";

export async function POST(req: NextRequest) {
  return handle(async () => {
    assertSameOrigin(req);
    assertRate(`pw:${clientIp(req)}`, 10, 10 * 60_000);
    const body = await readJson<{ id?: unknown; password?: unknown }>(req);
    const loginId = String(body.id ?? "").trim().toLowerCase();
    const pw = String(body.password ?? "");
    if (!/^[a-z0-9][a-z0-9_.-]{1,19}$/.test(loginId) || !staffOfLoginId(loginId) || !pw || pw.length > 200) {
      await verifyPassword(pw.slice(0, 200), undefined);
      throw new HttpError(401, "wrong", WRONG);
    }

    const { users } = await cols();
    const u = await users.findOne({ googleSub: `id:${loginId}` });
    if (u?.lockedUntil && u.lockedUntil.getTime() > Date.now()) {
      const min = Math.ceil((u.lockedUntil.getTime() - Date.now()) / 60_000);
      throw new HttpError(429, "locked", `비밀번호를 여러 번 틀려서 잠깐 잠겼어요. ${min}분 뒤에 다시 해 주세요`);
    }
    const ok = await verifyPassword(pw, u?.passHash);
    if (!u || !ok) {
      if (u) {
        const after = await users.findOneAndUpdate({ _id: u._id }, { $inc: { loginFails: 1 } }, { returnDocument: "after" });
        if ((after?.loginFails ?? 0) >= MAX_FAILS) {
          await users.updateOne({ _id: u._id }, { $set: { loginFails: 0, lockedUntil: new Date(Date.now() + LOCK_MS) } });
        }
      }
      throw new HttpError(401, "wrong", WRONG);
    }
    if (u.banned) throw new HttpError(403, "banned", "이 아이디는 지금 쓸 수 없어요");

    await users.updateOne({ _id: u._id }, { $set: { loginFails: 0, lastSeenAt: new Date() }, $unset: { lockedUntil: "" } });
    const res = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
    await setSession(res, u._id.toHexString());
    return res;
  });
}
