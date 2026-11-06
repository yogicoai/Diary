// 개발용 로그인 (운영에서는 꺼짐): DEV_LOGIN=1 일 때만, 이름만으로 들어간다

import { NextResponse, type NextRequest } from "next/server";
import { safeNext } from "@/lib/server/oauth";
import { setSession, upsertUser } from "@/lib/server/session";

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production" || process.env.DEV_LOGIN !== "1") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const name = (req.nextUrl.searchParams.get("name") || "시험").replace(/[^\p{L}\p{N}]/gu, "").slice(0, 8) || "시험";
  const user = await upsertUser(`dev:${name}`, `${encodeURIComponent(name)}@dev.local`, name);
  const res = NextResponse.redirect(new URL(safeNext(req.nextUrl.searchParams.get("next")), req.url));
  await setSession(res, user._id.toHexString());
  return res;
}
