// 베타 둘러보기 로그인 (BETA=1 일 때만, lib/server/beta.ts): 예제 일기장(fe = 3학년 8반 길동)을 '읽기만' 하는 세션.
// 처음 온 사람은 화면(lib/me.tsx)이 한 번 저절로 부르고, 로그인 화면의 '예제 일기장 둘러보기'도 이걸 부른다.
// 이 세션은 쓰기 API 가 모두 막히고(requireUser) 교무실 권한도 없다(staffRole).

import { NextResponse, type NextRequest } from "next/server";
import { betaOn, DEMO_SUB } from "@/lib/server/beta";
import { cols } from "@/lib/server/db";
import { assertRate, assertSameOrigin, clientIp, handle, HttpError } from "@/lib/server/http";
import { setSession } from "@/lib/server/session";

export async function POST(req: NextRequest) {
  return handle(async () => {
    assertSameOrigin(req);
    if (!betaOn()) throw new HttpError(404, "not_found", "둘러보기는 베타 기간에만 돼요");
    assertRate(`demo:${clientIp(req)}`, 30, 60 * 60 * 1000);
    const { users } = await cols();
    const demo = await users.findOne({ googleSub: DEMO_SUB, demoBackup: { $exists: true } }, { projection: { _id: 1, banned: 1 } });
    if (!demo || demo.banned) throw new HttpError(404, "no_demo", "예제 일기장이 아직 없어요");
    const res = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
    await setSession(res, demo._id.toHexString(), { demo: true });
    return res;
  });
}
