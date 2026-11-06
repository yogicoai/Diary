// API 공통: JSON 응답, 같은 사이트 확인, 간단한 횟수 제한, 오류 → 상태 코드

import { NextResponse, type NextRequest } from "next/server";
import { NoDbError } from "./db";

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message?: string,
  ) {
    super(message ?? code);
  }
}

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

/** 다른 사이트에서 쓰기 요청을 보내는 것 막기 */
export function assertSameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!origin) return;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (host && new URL(origin).host !== host) throw new HttpError(403, "origin");
}

// 서버 인스턴스마다 따로 세는 가벼운 제한 (정식 출시 땐 저장소 기반으로)
const hits = new Map<string, number[]>();
export function assertRate(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const list = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(key, list);
  if (list.length > limit) throw new HttpError(429, "too_many", "잠깐 쉬었다가 다시 해 주세요");
}

export function clientIp(req: NextRequest) {
  return (req.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim();
}

/** 라우트 본문을 감싸서 오류를 상태 코드로 바꾼다 */
export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.code, message: e.message }, e.status);
    if (e instanceof NoDbError) return json({ error: "no_db", message: "서버 저장소가 아직 연결되지 않았어요" }, 503);
    console.error("[api]", e);
    return json({ error: "server", message: "잠시 문제가 생겼어요" }, 500);
  }
}

export async function readJson<T>(req: NextRequest): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new HttpError(400, "bad_json");
  }
}
