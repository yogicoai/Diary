// 구글 로그인 돌아오기: code → id_token 확인 → 회원 만들기/찾기 → 세션 쿠키

import { createRemoteJWKSet, jwtVerify } from "jose";
import { NextResponse, type NextRequest } from "next/server";
import { authOrigin, safeNext } from "@/lib/server/oauth";
import { setSession, upsertUser } from "@/lib/server/session";

const GOOGLE_JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

function fail(req: NextRequest, code: string) {
  return NextResponse.redirect(new URL(`/login?error=${code}`, authOrigin(req)));
}

export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return fail(req, "no_google");

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  let saved: { state?: string; next?: string } = {};
  try {
    saved = JSON.parse(req.cookies.get("cj_oauth")?.value ?? "{}");
  } catch {
    /* 쿠키가 깨졌으면 아래에서 실패 처리 */
  }
  if (!code || !state || state !== saved.state) return fail(req, "state");

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${authOrigin(req)}/api/auth/google/callback`,
        grant_type: "authorization_code",
      }),
    });
    if (!tokenRes.ok) return fail(req, "token");
    const { id_token } = (await tokenRes.json()) as { id_token?: string };
    if (!id_token) return fail(req, "token");

    const { payload } = await jwtVerify(id_token, GOOGLE_JWKS, {
      issuer: ["https://accounts.google.com", "accounts.google.com"],
      audience: clientId,
    });
    if (!payload.sub || typeof payload.email !== "string" || payload.email_verified === false) return fail(req, "email");

    const user = await upsertUser(`google:${payload.sub}`, payload.email, String(payload.name ?? ""));
    const res = NextResponse.redirect(new URL(safeNext(saved.next), authOrigin(req)));
    await setSession(res, user._id.toHexString());
    res.cookies.set("cj_oauth", "", { path: "/", maxAge: 0 });
    return res;
  } catch (e) {
    console.error("[google]", e instanceof Error ? e.message : e);
    return fail(req, "server");
  }
}
