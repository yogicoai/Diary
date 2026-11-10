// 개발용 로그인: 이름만으로 들어간다. 개발(DEV_LOGIN=1, 운영 아님) 또는 베타 서버(BETA=1)에서만 (lib/server/beta.ts).
// 베타 서버에선 화면에 "이름만 적고 시작하기"로 보인다 — 같은 이름을 적으면 같은 일기장이 열린다 (구글 로그인 전까지).

import { NextResponse, type NextRequest } from "next/server";
import { devLoginOn } from "@/lib/server/beta";
import { safeNext } from "@/lib/server/oauth";
import { setSession, upsertUser } from "@/lib/server/session";

export async function GET(req: NextRequest) {
  if (!devLoginOn()) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const next = safeNext(req.nextUrl.searchParams.get("next"));
  const typed = (req.nextUrl.searchParams.get("name") || "").replace(/[^\p{L}\p{N}]/gu, "").slice(0, 8);
  // 베타 서버(운영): 이름은 2자 이상, '데모…'(예제 친구 계정)로는 못 들어간다. 화면에서도 막지만 주소로 바로 와도
  if (process.env.NODE_ENV === "production" && (typed.length < 2 || typed.startsWith("데모"))) {
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(next)}`, req.url));
  }
  const name = typed || "시험";
  const user = await upsertUser(`dev:${name}`, `${encodeURIComponent(name)}@dev.local`, name);
  const res = NextResponse.redirect(new URL(next, req.url));
  await setSession(res, user._id.toHexString());
  return res;
}
