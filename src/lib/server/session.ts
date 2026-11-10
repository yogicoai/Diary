// 로그인 세션: 서명한 JWT 를 httpOnly 쿠키에 (AUTH_SECRET 필요)

import { SignJWT, jwtVerify } from "jose";
import { ObjectId } from "mongodb";
import type { NextRequest, NextResponse } from "next/server";
import { betaOn, DEMO_READONLY } from "./beta";
import { cols, type UserDoc } from "./db";
import { HttpError } from "./http";
import { staffOfLoginId, type StaffRole } from "@/lib/staff";

export type { StaffRole };

/** 로그인한 사람. demoView = 베타 둘러보기 세션(예제 일기장을 읽기만) — 세션에만 붙고 DB 에는 저장하지 않는다 */
export type SessionUser = UserDoc & { demoView?: true };

export const SESSION_COOKIE = "cj_session";
const MAX_AGE = 60 * 60 * 24 * 60; // 60일

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) throw new HttpError(503, "no_auth_secret", "AUTH_SECRET 이 없어요");
  return new TextEncoder().encode(s);
}

/** opts.demo = 베타 둘러보기 세션 (api/auth/demo) */
export async function setSession(res: NextResponse, userId: string, opts: { demo?: boolean } = {}) {
  const token = await new SignJWT(opts.demo ? { uid: userId, demo: true } : { uid: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export function clearSession(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

async function readSession(req: NextRequest): Promise<{ uid: string; demo: boolean } | null> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return typeof payload.uid === "string" ? { uid: payload.uid, demo: payload.demo === true } : null;
  } catch {
    return null;
  }
}

export async function currentUser(req: NextRequest): Promise<SessionUser | null> {
  const s = await readSession(req);
  if (!s || !ObjectId.isValid(s.uid)) return null;
  if (s.demo && !betaOn()) return null; // 베타가 끝나면 둘러보기 세션은 로그아웃된 것으로
  const { users } = await cols();
  const user = await users.findOne({ _id: new ObjectId(s.uid) });
  if (!user || user.banned) return null;
  return s.demo ? { ...user, demoView: true } : user;
}

export async function requireUser(req: NextRequest): Promise<SessionUser> {
  const user = await currentUser(req);
  if (!user) throw new HttpError(401, "login", "로그인이 필요해요");
  // 베타 둘러보기는 읽기만: 일기 올리기·지우기, 게시판·우리 반·숙제·도장, 이름표 고치기·탈퇴 등 쓰기는 모두 여기서 막는다
  if (user.demoView && req.method !== "GET") throw new HttpError(403, "demo", DEMO_READONLY);
  return user;
}

/** 교무실(/admin)에 들어오는 선생님: fe(전산 선생님)·yogico(교장 선생님) 아이디 계정뿐 (lib/staff.ts).
 *  베타 둘러보기 세션은 fe 계정이어도 선생님이 아니다 — 교무실은 비밀번호로 들어온 세션만 */
export function staffRole(user: SessionUser | null): StaffRole | null {
  if (!user || user.demoView || !user.googleSub.startsWith("id:")) return null;
  return staffOfLoginId(user.loginId);
}

export function isAdmin(user: SessionUser | null): boolean {
  return staffRole(user) !== null;
}

/** 처음 들어온 사람: 이름표 기본값 (닉네임은 구글 이름 앞 두 글자 + 숫자로 가려서) */
export async function upsertUser(sub: string, email: string, name: string): Promise<UserDoc> {
  const { users } = await cols();
  const now = new Date();
  // 이름표 이름 = 구글 이름(성 빼고, 11-10 사용자 "아이디 이름으로"). 게시판에 보이니 표지·나 화면에서 별명으로 바꿀 수 있다
  const clean = (name || "").replace(/[^\p{L}\p{N}]/gu, "").slice(0, 8);
  const nickname = clean.length >= 2 ? clean : "어른이";
  const res = await users.findOneAndUpdate(
    { googleSub: sub },
    {
      $set: { email, lastSeenAt: now },
      $setOnInsert: {
        googleSub: sub,
        nickname,
        birthYear: null,
        createdAt: now,
      },
    },
    { upsert: true, returnDocument: "after" },
  );
  if (!res) throw new HttpError(500, "user");
  return res;
}
