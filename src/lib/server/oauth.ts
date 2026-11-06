import type { NextRequest } from "next/server";

/** 로그인 뒤 돌아갈 주소: 이 사이트 안의 경로만 */
export function safeNext(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/me";
  return raw.slice(0, 200);
}

/** 구글에 등록한 리디렉션 주소의 앞부분 (AUTH_URL 로 고정할 수 있다) */
export function authOrigin(req: NextRequest): string {
  return (process.env.AUTH_URL || req.nextUrl.origin).replace(/\/$/, "");
}
