// 내 일기: 목록(GET) / 저장(POST, 기기 id 로 덮어쓰기). 저장하면 개근상을 확인한다.

import type { NextRequest } from "next/server";
import { grantStreak } from "@/lib/server/awards";
import { cols } from "@/lib/server/db";
import { assertRate, assertSameOrigin, handle, HttpError, json, readJson } from "@/lib/server/http";
import { awardToClient, diaryToClient } from "@/lib/server/serialize";
import { requireUser } from "@/lib/server/session";
import type { Stroke } from "@/lib/crayon";
import { cleanStickers } from "@/lib/stickers";
import { cleanStamp } from "@/lib/stamps";

export async function GET(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser(req);
    const { diaries } = await cols();
    const list = await diaries.find({ userId: user._id }).sort({ createdAt: -1 }).limit(500).toArray();
    return json({ diaries: list.map(diaryToClient) });
  });
}

type In = {
  id: string;
  date: string;
  weather: string | null;
  title: string;
  body: string;
  strokes: Stroke[];
  bg?: string | null;
  teacher: string;
  teacherBy?: "ai" | "rule";
  stickers?: string[];
  late?: boolean;
  care?: boolean;
  secret: boolean;
  topic?: string | null;
  topicText?: string | null;
  stamp?: string;
  createdAt: number;
};

export async function POST(req: NextRequest) {
  return handle(async () => {
    assertSameOrigin(req);
    const user = await requireUser(req);
    assertRate(`diary:${user._id}`, 60, 60 * 60 * 1000);
    const d = await readJson<In>(req);

    if (typeof d.id !== "string" || d.id.length > 40) throw new HttpError(400, "id");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date ?? "")) throw new HttpError(400, "date");
    if (!Array.isArray(d.strokes) || JSON.stringify(d.strokes).length > 600_000)
      throw new HttpError(413, "strokes", "그림이 너무 커서 저장하지 못했어요");
    const now = new Date();
    const fields = {
      date: d.date,
      weather: typeof d.weather === "string" ? d.weather.slice(0, 20) : null,
      title: String(d.title ?? "").slice(0, 30),
      body: String(d.body ?? "").slice(0, 240),
      strokes: d.strokes,
      bg: typeof d.bg === "string" ? d.bg.slice(0, 40) : null,
      teacher: String(d.teacher ?? "").slice(0, 60),
      teacherBy: d.teacherBy === "ai" ? ("ai" as const) : ("rule" as const),
      care: !!d.care,
      stickers: cleanStickers(d.stickers, []),
      stamp: cleanStamp(d.stamp),
      late: !!d.late,
      secret: !!d.secret,
      topic: typeof d.topic === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d.topic) ? d.topic : null,
      topicText: typeof d.topic === "string" && typeof d.topicText === "string" ? d.topicText.replace(/\s+/g, " ").trim().slice(0, 30) || null : null,
      updatedAt: now,
    };

    const { diaries } = await cols();
    const saved = await diaries.findOneAndUpdate(
      { userId: user._id, clientId: d.id },
      {
        $set: fields,
        $setOnInsert: {
          userId: user._id,
          clientId: d.id,
          createdAt: new Date(Number(d.createdAt) || now.getTime()),
          classIds: [],
          reactions: {},
        },
      },
      { upsert: true, returnDocument: "after" },
    );
    if (!saved) throw new HttpError(500, "save");
    const awards = await grantStreak(user._id);
    return json({ diary: diaryToClient(saved), awards: awards.map(awardToClient) });
  });
}
