// 대시보드 숫자: 회원·일기·게시판·반, 최근 14일, 나이별(어른이 초등학교 학년·반). 개발자 계정엔 연결 상태·처리 기록도.
// 회원 숫자는 운영자 아이디(fe·yogico)를 빼고 센다.

import type { NextRequest } from "next/server";
import { adminJson, kstDateExpr, kstDayStart, kstDays, requireStaff, seesSystem } from "@/lib/server/admin";
import { cols } from "@/lib/server/db";
import { handle } from "@/lib/server/http";
import { ageOf } from "@/lib/social";
import { STAFF_LOGIN_IDS } from "@/lib/staff";

const MEMBER = { loginId: { $nin: STAFF_LOGIN_IDS } }; // 학생 수에서 선생님(fe·yogico) 빼기

export async function GET(req: NextRequest) {
  return handle(async () => {
    const { role } = await requireStaff(req);
    const { users, diaries, classes, reactions, notes, adminlog } = await cols();
    const today = kstDayStart(0);
    const week = kstDayStart(6);
    const from14 = kstDayStart(13);

    const [
      members,
      membersToday,
      membersWeek,
      activeToday,
      banned,
      diaryTotal,
      diaryToday,
      diaryWeek,
      shared,
      boardVisible,
      boardPending,
      boardHidden,
      reported,
      classTotal,
      reactionTotal,
      noteTotal,
    ] = await Promise.all([
      users.countDocuments(MEMBER),
      users.countDocuments({ ...MEMBER, createdAt: { $gte: today } }),
      users.countDocuments({ ...MEMBER, createdAt: { $gte: week } }),
      users.countDocuments({ ...MEMBER, lastSeenAt: { $gte: today } }),
      users.countDocuments({ ...MEMBER, banned: true }),
      diaries.countDocuments({}),
      diaries.countDocuments({ createdAt: { $gte: today } }),
      diaries.countDocuments({ createdAt: { $gte: week } }),
      diaries.countDocuments({ $or: [{ board: { $exists: true } }, { "classIds.0": { $exists: true } }] }),
      diaries.countDocuments({ "board.status": "visible" }),
      diaries.countDocuments({ "board.status": "pending" }),
      diaries.countDocuments({ "board.status": "hidden" }),
      diaries.countDocuments({ "board.status": "visible", "board.reports": { $gt: 0 } }),
      classes.countDocuments({}),
      reactions.countDocuments({}),
      notes.countDocuments({}),
    ]);

    const [diaryDays, memberDays, cohorts, classAvg] = await Promise.all([
      diaries
        .aggregate<{ _id: string; n: number }>([
          { $match: { createdAt: { $gte: from14 } } },
          { $group: { _id: kstDateExpr("$createdAt"), n: { $sum: 1 } } },
        ])
        .toArray(),
      users
        .aggregate<{ _id: string; n: number }>([
          { $match: { ...MEMBER, createdAt: { $gte: from14 } } },
          { $group: { _id: kstDateExpr("$createdAt"), n: { $sum: 1 } } },
        ])
        .toArray(),
      users
        .aggregate<{ _id: number | null; n: number }>([
          { $match: MEMBER },
          { $group: { _id: "$birthYear", n: { $sum: 1 } } },
          { $sort: { n: -1 } },
        ])
        .toArray(),
      classes.aggregate<{ avg: number }>([{ $group: { _id: null, avg: { $avg: { $size: "$memberIds" } } } }]).toArray(),
    ]);

    const days = kstDays(14);
    const byDay = (rows: { _id: string; n: number }[]) => days.map((d) => ({ date: d, n: rows.find((r) => r._id === d)?.n ?? 0 }));

    const system = seesSystem(role)
      ? {
          checks: [
            { key: "db", label: "학생 명부 저장소 (MongoDB)", on: true, note: process.env.MONGODB_DB || "chamjal" },
            { key: "ftp", label: "그림 저장 (Cafe24 FTP)", on: !!process.env.FTP_USER && !!process.env.FTP_PASS, note: "게시판 카드 그림" },
            { key: "claude", label: "선생님 답장·게시판 검사 (Claude)", on: !!process.env.ANTHROPIC_API_KEY, note: "꺼지면 기본 한 줄" },
            { key: "typecast", label: "아이 목소리 (Typecast)", on: !!process.env.TYPECAST_API_KEY, note: "전용 키 필요" },
            { key: "google", label: "구글 로그인", on: !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET, note: "OAuth 클라이언트" },
          ],
          log: (await adminlog.find({}).sort({ at: -1 }).limit(12).toArray()).map((l) => ({
            at: l.at.getTime(),
            by: l.byName,
            action: l.action,
            target: l.target,
            note: l.note ?? null,
          })),
        }
      : null;

    return adminJson({
      members: { total: members, today: membersToday, week: membersWeek, activeToday, banned },
      diaries: { total: diaryTotal, today: diaryToday, week: diaryWeek, shared },
      board: { visible: boardVisible, pending: boardPending, hidden: boardHidden, reported },
      classes: { total: classTotal, avgMembers: classAvg[0]?.avg ?? 0 },
      reactions: reactionTotal,
      notes: noteTotal,
      days: { diaries: byDay(diaryDays), members: byDay(memberDays) },
      cohorts: cohorts.map((c) => ({ age: ageOf(c._id), n: c.n })),
      system,
    });
  });
}
