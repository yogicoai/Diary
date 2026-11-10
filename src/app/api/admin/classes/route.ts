// 반 목록: 반 이름·반장·인원·반에 낸 일기·최근 반 숙제. 찾기(반 이름·초대 코드), 50개씩.

import type { NextRequest } from "next/server";
import type { Filter, ObjectId } from "mongodb";
import { adminJson, escapeRegex, requireStaff } from "@/lib/server/admin";
import { cols, type ClassDoc } from "@/lib/server/db";
import { handle } from "@/lib/server/http";
import { nameTag } from "@/lib/social";

const PAGE = 50;

export async function GET(req: NextRequest) {
  return handle(async () => {
    await requireStaff(req);
    const sp = req.nextUrl.searchParams;
    const q = (sp.get("q") ?? "").trim().slice(0, 40);
    const page = Math.max(0, Math.min(1000, Number(sp.get("page")) || 0));
    const filter: Filter<ClassDoc> = q ? { $or: [{ name: new RegExp(escapeRegex(q), "i") }, { code: q.toUpperCase() }] } : {};

    const { classes, users, diaries } = await cols();
    const [total, list] = await Promise.all([
      classes.countDocuments(filter),
      classes.find(filter).sort({ createdAt: -1 }).skip(page * PAGE).limit(PAGE).toArray(),
    ]);
    const ids = list.map((c) => c._id);
    const [owners, dAgg] = await Promise.all([
      users
        .find({ _id: { $in: list.map((c) => c.ownerId) } }, { projection: { nickname: 1, birth: 1, birthYear: 1 } })
        .toArray(),
      diaries
        .aggregate<{ _id: ObjectId; n: number; last: Date }>([
          { $match: { classIds: { $in: ids } } },
          { $unwind: "$classIds" },
          { $match: { classIds: { $in: ids } } },
          { $group: { _id: "$classIds", n: { $sum: 1 }, last: { $max: "$createdAt" } } },
        ])
        .toArray(),
    ]);

    return adminJson({
      total,
      page,
      pageSize: PAGE,
      rows: list.map((c) => {
        const o = owners.find((u) => u._id.equals(c.ownerId));
        const d = dAgg.find((a) => a._id.equals(c._id));
        return {
          id: c._id.toHexString(),
          name: c.name,
          code: c.code,
          owner: o ? { id: o._id.toHexString(), nameTag: nameTag(o) } : null,
          members: c.memberIds.length,
          diaries: d?.n ?? 0,
          lastDiaryAt: d?.last?.getTime() ?? null,
          homework: c.homework ?? null,
          createdAt: c.createdAt.getTime(),
        };
      }),
    });
  });
}
