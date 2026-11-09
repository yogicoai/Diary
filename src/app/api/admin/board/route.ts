// 게시판 검사: 확인할 것(대기·신고된 것) / 숨긴 것 / 보이는 것. 탭마다 100장까지.

import type { NextRequest } from "next/server";
import type { Filter } from "mongodb";
import { adminJson, bodyVisible, reactionTotal, requireStaff } from "@/lib/server/admin";
import { cols, type DiaryDoc } from "@/lib/server/db";
import { ownersOf } from "@/lib/server/find";
import { handle } from "@/lib/server/http";
import { nameTag } from "@/lib/social";

const TABS: Record<string, Filter<DiaryDoc>> = {
  todo: { $or: [{ "board.status": "pending" }, { "board.status": "visible", "board.reports": { $gt: 0 } }] },
  hidden: { "board.status": "hidden" },
  visible: { "board.status": "visible" },
};

export async function GET(req: NextRequest) {
  return handle(async () => {
    await requireStaff(req);
    const tab = req.nextUrl.searchParams.get("tab") ?? "todo";
    const filter = TABS[tab] ?? TABS.todo;
    const { diaries, reports } = await cols();
    const [list, todo, hidden, visible] = await Promise.all([
      diaries.find(filter, { projection: { strokes: 0 } }).sort({ "board.at": -1 }).limit(100).toArray(),
      diaries.countDocuments(TABS.todo),
      diaries.countDocuments(TABS.hidden),
      diaries.countDocuments(TABS.visible),
    ]);
    const owners = await ownersOf(list);
    const reps = await reports.find({ diaryId: { $in: list.map((d) => d._id) } }).toArray();
    return adminJson({
      counts: { todo, hidden, visible },
      items: list.map((d) => {
        const o = owners.get(d.userId.toHexString());
        return {
          id: d._id.toHexString(),
          userId: d.userId.toHexString(),
          nameTag: o ? nameTag(o) : "전학 간 친구",
          date: d.date,
          title: d.title,
          body: bodyVisible({ ...d, classIds: [] }) ? d.body : "",
          mode: d.board?.mode ?? "drawing",
          thumbUrl: d.board?.thumbUrl ?? "",
          status: d.board?.status ?? "visible",
          checked: d.board?.checked ?? false,
          note: d.board?.note ?? null,
          at: d.board?.at?.getTime() ?? d.createdAt.getTime(),
          reactions: reactionTotal(d.reactions),
          reports: reps.filter((r) => r.diaryId.equals(d._id)).map((r) => r.reason),
        };
      }),
    });
  });
}
