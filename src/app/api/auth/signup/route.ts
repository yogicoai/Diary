// 기본 로그인 가입: 아이디 + 비밀번호로 만들고 바로 들어간다 (구글 로그인 아래 "가입하기").
// - 선생님 아이디(fe·yogico)는 실제 서버에서 STAFF_SIGNUP_CODE 가 맞아야 만들 수 있다 (남이 먼저 가져가지 못하게).
//   개발 서버에서는 코드 없이 된다.
// - 한 곳에서 1시간에 5번까지. 이메일이 없어서 비밀번호를 잊으면 스스로 찾을 수 없다 (화면에서 안내).

import { MongoServerError } from "mongodb";
import { NextResponse, type NextRequest } from "next/server";
import { cols, type UserDoc } from "@/lib/server/db";
import { assertRate, assertSameOrigin, clientIp, handle, HttpError, readJson } from "@/lib/server/http";
import { hashPassword, passwordProblem } from "@/lib/server/password";
import { setSession } from "@/lib/server/session";
import { BLOCKED_IDS, LOGIN_ID, staffOfLoginId } from "@/lib/staff";

export async function POST(req: NextRequest) {
  return handle(async () => {
    assertSameOrigin(req);
    const body = await readJson<{ id?: unknown; password?: unknown; code?: unknown }>(req);
    const loginId = String(body.id ?? "").trim().toLowerCase();
    const pw = String(body.password ?? "");
    if (!LOGIN_ID.test(loginId)) throw new HttpError(400, "id", "아이디는 영문 소문자로 시작해서 소문자·숫자 2~20자로 만들어 주세요");
    if (BLOCKED_IDS.includes(loginId)) throw new HttpError(400, "taken", "쓸 수 없는 아이디예요. 다른 아이디로 해 주세요");
    const problem = passwordProblem(pw, loginId);
    if (problem) throw new HttpError(400, "weak", problem);

    // 선생님 아이디: 실제 서버에서는 가입 코드가 있어야
    if (staffOfLoginId(loginId) && process.env.NODE_ENV === "production") {
      const code = process.env.STAFF_SIGNUP_CODE;
      if (!code || String(body.code ?? "") !== code) {
        throw new HttpError(403, "need_code", "선생님 아이디예요. 선생님 가입 코드를 넣어 주세요");
      }
    }
    assertRate(`signup:${clientIp(req)}`, 5, 60 * 60_000);

    const { users } = await cols();
    const now = new Date();
    const nick = loginId.replace(/[^a-z0-9]/g, "").slice(0, 8);
    const doc: Omit<UserDoc, "_id"> = {
      googleSub: `id:${loginId}`,
      loginId,
      email: "",
      nickname: nick.length >= 2 ? nick : "어른이",
      entryYear: null,
      classNo: 1 + Math.floor(Math.random() * 9),
      createdAt: now,
      lastSeenAt: now,
      passHash: await hashPassword(pw),
      loginFails: 0,
    };
    let id;
    try {
      id = (await users.insertOne(doc as never)).insertedId;
    } catch (e) {
      if (e instanceof MongoServerError && e.code === 11000) throw new HttpError(409, "taken", "이미 있는 아이디예요. 다른 아이디로 해 주세요");
      throw e;
    }
    const res = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
    await setSession(res, id.toHexString());
    return res;
  });
}
