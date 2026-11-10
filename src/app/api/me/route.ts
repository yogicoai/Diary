// 내 이름표 + 간단한 기록. 로그인 안 했으면 user:null 과 사용할 수 있는 로그인 방법만.

import { NextResponse, type NextRequest } from "next/server";
import { streakOf } from "@/lib/server/awards";
import { cols, NoDbError } from "@/lib/server/db";
import { assertSameOrigin, handle, HttpError, json, readJson } from "@/lib/server/http";
import { meToClient } from "@/lib/server/serialize";
import { birthProblem } from "@/lib/social";
import { removeAccount } from "@/lib/server/removeAccount";
import { clearSession, currentUser, isAdmin, requireUser } from "@/lib/server/session";

function flags() {
  return {
    google: !!process.env.GOOGLE_CLIENT_ID,
    devLogin: process.env.NODE_ENV !== "production" && process.env.DEV_LOGIN === "1",
    server: !!process.env.MONGODB_URI && !!process.env.AUTH_SECRET,
  };
}

export async function GET(req: NextRequest) {
  return handle(async () => {
    let user = null;
    try {
      user = await currentUser(req);
    } catch (e) {
      if (!(e instanceof NoDbError) && !(e instanceof HttpError)) throw e;
    }
    if (!user) return json({ user: null, flags: flags() });

    const { diaries } = await cols();
    const [dates, agg] = await Promise.all([
      diaries.distinct("date", { userId: user._id, late: { $ne: true } }) as Promise<string[]>,
      diaries
        .aggregate<{ n: number; stamps: number; board: number }>([
          { $match: { userId: user._id } },
          {
            $group: {
              _id: null,
              n: { $sum: 1 },
              board: { $sum: { $cond: [{ $eq: ["$board.status", "visible"] }, 1, 0] } },
              stamps: {
                $sum: {
                  $add: [
                    { $ifNull: ["$reactions.cham", 0] },
                    { $ifNull: ["$reactions.best", 0] },
                    { $ifNull: ["$reactions.cheer", 0] },
                    { $ifNull: ["$reactions.star", 0] },
                    { $ifNull: ["$reactions.heart", 0] },
                    { $ifNull: ["$reactions.smile", 0] },
                  ],
                },
              },
            },
          },
        ])
        .toArray(),
    ]);
    const s = agg[0] ?? { n: 0, stamps: 0, board: 0 };
    return json({
      user: meToClient(user, isAdmin(user)),
      stats: { diaries: s.n, stamps: s.stamps, board: s.board, streak: streakOf(new Set(dates)).streak },
      flags: flags(),
    });
  });
}

/** 이름표 고치기: 이름 2~8자, 생년월일(→ 만 나이 = 어른이 초등학교 학년·반, 생일 축하), 나(남자아이·여자아이 = 읽어 주는 목소리) */
export async function PATCH(req: NextRequest) {
  return handle(async () => {
    assertSameOrigin(req);
    const user = await requireUser(req);
    const body = await readJson<{ nickname?: string; birth?: string | null; kid?: string }>(req);
    const set: Record<string, unknown> = {};
    if (body.nickname !== undefined) {
      const nick = String(body.nickname).trim();
      if (!/^[\p{L}\p{N}]{2,8}$/u.test(nick)) throw new HttpError(400, "nickname", "이름은 띄어쓰기 없이 2~8자로 써 주세요");
      set.nickname = nick;
    }
    if (body.birth !== undefined) {
      if (body.birth === null) {
        set.birth = null;
        set.birthYear = null;
      } else {
        const b = String(body.birth);
        const problem = birthProblem(b);
        if (problem) throw new HttpError(400, "birth", problem);
        set.birth = b;
        set.birthYear = Number(b.slice(0, 4));
      }
    }
    if (body.kid !== undefined) {
      if (body.kid !== "girl" && body.kid !== "boy") throw new HttpError(400, "kid", "남자아이·여자아이 중에 골라 주세요");
      set.kid = body.kid;
    }
    const { users } = await cols();
    const updated = await users.findOneAndUpdate({ _id: user._id }, { $set: set }, { returnDocument: "after" });
    if (!updated) throw new HttpError(404, "user");
    return json({ user: meToClient(updated, isAdmin(updated)) });
  });
}

/** 회원 탈퇴: 이 사람의 일기·그림·숙제·상장·반 기록을 모두 지우고 이름표를 없앤다 (되돌릴 수 없음).
 *  선생님 아이디(fe·yogico)는 여기서 못 지운다. 잘못 누르지 않게 화면에서 { confirm: "탈퇴" } 를 같이 보낸다 */
export async function DELETE(req: NextRequest) {
  return handle(async () => {
    assertSameOrigin(req);
    const user = await requireUser(req);
    if (isAdmin(user)) throw new HttpError(400, "staff", "선생님 아이디는 탈퇴할 수 없어요");
    const body = await readJson<{ confirm?: string }>(req);
    if (body.confirm !== "탈퇴") throw new HttpError(400, "confirm", "탈퇴를 한 번 더 확인해 주세요");
    const done = await removeAccount(user);
    const res = NextResponse.json({ ok: true, ...done });
    clearSession(res);
    return res;
  });
}
