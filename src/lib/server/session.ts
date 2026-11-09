// 로그인 세션: 서명한 JWT 를 httpOnly 쿠키에 (AUTH_SECRET 필요)

import { SignJWT, jwtVerify } from "jose";
import { ObjectId } from "mongodb";
import type { NextRequest, NextResponse } from "next/server";
import { cols, type UserDoc } from "./db";
import { HttpError } from "./http";
import { staffOfLoginId, type StaffRole } from "@/lib/staff";

export type { StaffRole };

export const SESSION_COOKIE = "cj_session";
const MAX_AGE = 60 * 60 * 24 * 60; // 60일

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) throw new HttpError(503, "no_auth_secret", "AUTH_SECRET 이 없어요");
  return new TextEncoder().encode(s);
}

export async function setSession(res: NextResponse, userId: string) {
  const token = await new SignJWT({ uid: userId })
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

export async function sessionUserId(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return typeof payload.uid === "string" ? payload.uid : null;
  } catch {
    return null;
  }
}

export async function currentUser(req: NextRequest): Promise<UserDoc | null> {
  const uid = await sessionUserId(req);
  if (!uid || !ObjectId.isValid(uid)) return null;
  const { users } = await cols();
  const user = await users.findOne({ _id: new ObjectId(uid) });
  if (!user || user.banned) return null;
  return user;
}

export async function requireUser(req: NextRequest): Promise<UserDoc> {
  const user = await currentUser(req);
  if (!user) throw new HttpError(401, "login", "로그인이 필요해요");
  return user;
}

/** 교무실(/admin)에 들어오는 선생님: fe(전산 선생님)·yogico(교장 선생님) 아이디 계정뿐 (lib/staff.ts) */
export function staffRole(user: UserDoc | null): StaffRole | null {
  if (!user || !user.googleSub.startsWith("id:")) return null;
  return staffOfLoginId(user.loginId);
}

export function isAdmin(user: UserDoc | null): boolean {
  return staffRole(user) !== null;
}

/** 처음 들어온 사람: 이름표 기본값 (닉네임은 구글 이름 앞 두 글자 + 숫자로 가려서) */
export async function upsertUser(sub: string, email: string, name: string): Promise<UserDoc> {
  const { users } = await cols();
  const now = new Date();
  const base = (name || "어른이").replace(/\s+/g, "").slice(0, 2) || "어른";
  const res = await users.findOneAndUpdate(
    { googleSub: sub },
    {
      $set: { email, lastSeenAt: now },
      $setOnInsert: {
        googleSub: sub,
        nickname: `${base}${Math.floor(10 + Math.random() * 90)}`,
        entryYear: null,
        classNo: 1 + Math.floor(Math.random() * 9),
        createdAt: now,
      },
    },
    { upsert: true, returnDocument: "after" },
  );
  if (!res) throw new HttpError(500, "user");
  return res;
}
