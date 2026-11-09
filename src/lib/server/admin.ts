// 관리자 페이지 서버 공통: 운영자 확인 · 캐시 안 남기기 · 한국 시각 · "운영자가 볼 수 있는 일기" 규칙
//
// 볼 수 있는 일기 규칙 (11-09): 운영자는 쓴 사람이 **남에게 보여 준 것**만 펼쳐 본다.
//   게시판에 붙인 일기 = 게시판에 보이는 만큼 (글은 "글까지 붙이기"일 때만)
//   반에 낸 일기 = 반 친구가 보는 만큼 (비밀 일기는 글 빼고)
//   혼자 쓴 일기 = 날짜만. 제목·글·그림은 운영자도 못 본다.

import { NextResponse, type NextRequest } from "next/server";
import type { ObjectId } from "mongodb";
import { nameTag } from "@/lib/social";
import { cols, type DiaryDoc, type UserDoc, type AdminLogDoc } from "./db";
import { HttpError } from "./http";
import { currentUser, staffRole, type StaffRole } from "./session";
import { ROLE_LABEL, staffOfLoginId } from "@/lib/staff";

export { ROLE_LABEL };

export async function requireStaff(req: NextRequest): Promise<{ user: UserDoc; role: StaffRole }> {
  const user = await currentUser(req);
  if (!user) throw new HttpError(401, "login", "로그인이 필요해요");
  const role = staffRole(user);
  if (!role) throw new HttpError(403, "staff", "선생님만 들어올 수 있어요");
  return { user, role };
}

/** 전산 선생님(fe)만 보는 것 (시설 점검·교무 기록) */
export function seesSystem(role: StaffRole) {
  return role === "developer";
}

/** 회원 정보가 브라우저·중간 캐시에 남지 않게 */
export function adminJson(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store, max-age=0", "X-Robots-Tag": "noindex" } });
}

/* ── 한국 시각 ── */
const KST = 9 * 3600_000;

/** 오늘(한국 시각)에서 n일 전 0시 */
export function kstDayStart(daysAgo = 0): Date {
  const k = new Date(Date.now() + KST);
  return new Date(Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate() - daysAgo) - KST);
}

/** 최근 n일 날짜 글자 (오래된 것 → 오늘) */
export function kstDays(n: number): string[] {
  return Array.from({ length: n }, (_, i) => new Date(kstDayStart(n - 1 - i).getTime() + KST).toISOString().slice(0, 10));
}

export const kstDateExpr = (field: string) => ({ $dateToString: { format: "%Y-%m-%d", date: field, timezone: "Asia/Seoul" } });

/* ── 사람 ── */
export type LoginKind = "google" | "id" | "dev";

export function loginKind(u: Pick<UserDoc, "googleSub">): LoginKind {
  if (u.googleSub.startsWith("id:")) return "id";
  if (u.googleSub.startsWith("dev:")) return "dev";
  return "google";
}

export function personBrief(u: UserDoc) {
  return {
    id: u._id.toHexString(),
    nameTag: nameTag(u),
    nickname: u.nickname,
    login: loginKind(u),
    email: loginKind(u) === "google" ? u.email : null,
    loginId: u.loginId ?? null,
    staff: staffOfLoginId(u.loginId),
    banned: !!u.banned,
    createdAt: u.createdAt.getTime(),
    lastSeenAt: u.lastSeenAt.getTime(),
  };
}

/** 사람 projection: 비밀번호 해시·잠금 기록은 화면으로 안 보낸다 */
export const USER_SAFE = { passHash: 0, loginFails: 0, lockedUntil: 0 } as const;

/* ── 일기: 운영자가 볼 수 있는 만큼 ── */
export function shareOf(d: Pick<DiaryDoc, "board" | "classIds">) {
  return { board: d.board?.status ?? null, classes: d.classIds.length };
}

export function canOpen(d: Pick<DiaryDoc, "board" | "classIds">) {
  return !!d.board || d.classIds.length > 0;
}

/** 글을 보여도 되나: 게시판 "글까지" 또는 반에 낸 일기, 둘 다 비밀 일기면 안 됨 */
export function bodyVisible(d: Pick<DiaryDoc, "board" | "classIds" | "secret">) {
  if (d.secret) return false;
  return d.board?.mode === "full" || d.classIds.length > 0;
}

export function reactionTotal(r: DiaryDoc["reactions"] | undefined) {
  return Object.values(r ?? {}).reduce<number>((a, b) => a + (b ?? 0), 0);
}

/** 목록 한 줄: 혼자 쓴 일기는 제목도 빼고 날짜만 */
export function diaryRow(d: DiaryDoc, classNames: Map<string, string>) {
  const open = canOpen(d);
  return {
    id: d._id.toHexString(),
    date: d.date,
    createdAt: d.createdAt.getTime(),
    late: !!d.late,
    open,
    title: open ? d.title : null,
    board: d.board ? { status: d.board.status, mode: d.board.mode, thumbUrl: d.board.thumbUrl, reports: d.board.reports } : null,
    classes: d.classIds.map((c) => ({ id: c.toHexString(), name: classNames.get(c.toHexString()) ?? "없어진 반" })),
    reactions: reactionTotal(d.reactions),
  };
}

/* ── 처리 기록 ── */
export async function logAction(by: UserDoc, action: AdminLogDoc["action"], target: ObjectId | string, note?: string) {
  const { adminlog } = await cols();
  const doc: Omit<AdminLogDoc, "_id"> = {
    at: new Date(),
    by: by._id,
    byName: by.loginId ?? nameTag(by),
    action,
    target: typeof target === "string" ? target : target.toHexString(),
    ...(note ? { note } : {}),
  };
  await adminlog.insertOne(doc as never); // _id 는 Mongo 가 붙인다 (다른 경로와 같은 방식)
}

export function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
