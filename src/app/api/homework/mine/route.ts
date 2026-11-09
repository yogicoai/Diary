// 내 숙제 모음 (칭찬 스티커판): 낸 날·숙제·받은 스티커·사진 미리보기

import type { NextRequest } from "next/server";
import { cols } from "@/lib/server/db";
import { homeworkToClient } from "@/lib/server/homework";
import { handle, json } from "@/lib/server/http";
import { requireUser } from "@/lib/server/session";

export async function GET(req: NextRequest) {
  return handle(async () => {
    const me = await requireUser(req);
    const { homework } = await cols();
    const list = await homework.find({ userId: me._id }).sort({ date: 1 }).limit(500).toArray();
    return json({ count: list.length, list: list.map((h) => homeworkToClient(h)) });
  });
}
