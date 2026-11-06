// 상장: 내 상장함(로그인) + 지난주 참 잘한 일기 1~3등(누구나)

import type { NextRequest } from "next/server";
import { weeklyWinners } from "@/lib/server/awards";
import { cols } from "@/lib/server/db";
import { ownersOf } from "@/lib/server/find";
import { handle, json } from "@/lib/server/http";
import { awardToClient, boardItem } from "@/lib/server/serialize";
import { currentUser } from "@/lib/server/session";

export async function GET(req: NextRequest) {
  return handle(async () => {
    const { week, awards: weekly } = await weeklyWinners();
    const { awards, diaries } = await cols();

    const ids = weekly.map((a) => a.diaryId).filter((x): x is NonNullable<typeof x> => !!x);
    const ds = await diaries.find({ _id: { $in: ids }, "board.status": "visible" }).toArray();
    const owners = await ownersOf(ds);
    const winners = weekly
      .map((a) => {
        const d = ds.find((x) => a.diaryId && x._id.equals(a.diaryId));
        return d ? { rank: a.rank ?? 0, item: boardItem(d, owners.get(d.userId.toHexString()) ?? null) } : null;
      })
      .filter(Boolean);

    const me = await currentUser(req);
    const mine = me ? await awards.find({ userId: me._id }).sort({ at: -1 }).limit(100).toArray() : [];
    return json({ week, winners, mine: mine.map(awardToClient) });
  });
}
