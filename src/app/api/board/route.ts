// 교실 뒤 게시판 목록: 전체 / 오늘의 숙제 / 같은 해 입학
//   ?tab=all|topic|year&before=<시각 ms>

import type { NextRequest } from "next/server";
import type { Filter } from "mongodb";
import { kstKey } from "@/lib/server/awards";
import { cols, type DiaryDoc } from "@/lib/server/db";
import { ownersOf } from "@/lib/server/find";
import { handle, json } from "@/lib/server/http";
import { boardItem } from "@/lib/server/serialize";
import { currentUser } from "@/lib/server/session";
import { topicOf } from "@/lib/social";

const PAGE = 24;

export async function GET(req: NextRequest) {
  return handle(async () => {
    const sp = req.nextUrl.searchParams;
    const tab = sp.get("tab") ?? "all";
    const before = Number(sp.get("before")) || 0;
    const today = kstKey();
    const q: Filter<DiaryDoc> = { "board.status": "visible" };
    if (before) q["board.at"] = { $lt: new Date(before) };

    const { diaries, users } = await cols();
    let year: number | null = null;
    if (tab === "topic") q.topic = today;
    if (tab === "year") {
      const me = await currentUser(req);
      year = me?.entryYear ?? null;
      if (!year) return json({ items: [], today, topic: topicOf(today), year: null, needYear: true });
      const peers = await users.find({ entryYear: year }, { projection: { _id: 1 } }).limit(5000).toArray();
      q.userId = { $in: peers.map((p) => p._id) };
    }

    const list = await diaries.find(q).sort({ "board.at": -1 }).limit(PAGE).toArray();
    const owners = await ownersOf(list);
    return json({
      items: list.map((d) => boardItem(d, owners.get(d.userId.toHexString()) ?? null)),
      today,
      topic: topicOf(today),
      year,
      more: list.length === PAGE,
    });
  });
}
