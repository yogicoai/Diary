// 회원 목록: 이름표·로그인 방법·들어간 반·일기 수. 찾기(별명·이메일·아이디), 거르기(운영자·정지), 50명씩.

import type { NextRequest } from "next/server";
import type { Filter } from "mongodb";
import { adminJson, escapeRegex, personBrief, requireStaff, USER_SAFE } from "@/lib/server/admin";
import { cols, type UserDoc } from "@/lib/server/db";
import { handle } from "@/lib/server/http";
import { STAFF_LOGIN_IDS } from "@/lib/staff";

const PAGE = 50;

export async function GET(req: NextRequest) {
  return handle(async () => {
    await requireStaff(req);
    const sp = req.nextUrl.searchParams;
    const q = (sp.get("q") ?? "").trim().slice(0, 40);
    const kind = sp.get("kind");
    const sort = sp.get("sort") === "active" ? "active" : "new";
    const page = Math.max(0, Math.min(1000, Number(sp.get("page")) || 0));

    const filter: Filter<UserDoc> = {};
    if (q) {
      const rx = new RegExp(escapeRegex(q), "i");
      filter.$or = [{ nickname: rx }, { email: rx }, { loginId: rx }];
    }
    if (kind === "staff") filter.loginId = { $in: STAFF_LOGIN_IDS };
    else if (kind === "banned") filter.banned = true;

    const { users, diaries, classes } = await cols();
    const [total, list] = await Promise.all([
      users.countDocuments(filter),
      users
        .find(filter, { projection: USER_SAFE })
        .sort(sort === "active" ? { lastSeenAt: -1 } : { createdAt: -1 })
        .skip(page * PAGE)
        .limit(PAGE)
        .toArray(),
    ]);

    const ids = list.map((u) => u._id);
    const [dAgg, cls] = await Promise.all([
      diaries
        .aggregate<{ _id: (typeof ids)[number]; n: number; board: number; shared: number; last: Date }>([
          { $match: { userId: { $in: ids } } },
          {
            $group: {
              _id: "$userId",
              n: { $sum: 1 },
              board: { $sum: { $cond: [{ $eq: ["$board.status", "visible"] }, 1, 0] } },
              shared: { $sum: { $cond: [{ $gt: [{ $size: { $ifNull: ["$classIds", []] } }, 0] }, 1, 0] } },
              last: { $max: "$createdAt" },
            },
          },
        ])
        .toArray(),
      classes.find({ memberIds: { $in: ids } }, { projection: { name: 1, memberIds: 1, ownerId: 1 } }).toArray(),
    ]);

    return adminJson({
      total,
      page,
      pageSize: PAGE,
      rows: list.map((u) => {
        const d = dAgg.find((a) => a._id.equals(u._id));
        return {
          ...personBrief(u),
          diaries: d?.n ?? 0,
          board: d?.board ?? 0,
          classShared: d?.shared ?? 0,
          lastDiaryAt: d?.last?.getTime() ?? null,
          classes: cls
            .filter((c) => c.memberIds.some((m) => m.equals(u._id)))
            .map((c) => ({ id: c._id.toHexString(), name: c.name, owner: c.ownerId.equals(u._id) })),
        };
      }),
    });
  });
}
