// 내 일기: 목록(GET) / 저장(POST, 기기 id 로 덮어쓰기) / 지우기(DELETE ?clientId=, 기기 id 로).
// 저장하면 개근상을 확인한다.

import type { ObjectId } from "mongodb";
import type { NextRequest } from "next/server";
import { grantBirthday, grantStreak } from "@/lib/server/awards";
import { cols } from "@/lib/server/db";
import { assertRate, assertSameOrigin, handle, HttpError, json, readJson } from "@/lib/server/http";
import { removeMyDiary } from "@/lib/server/removeDiary";
import { awardToClient, diaryToClient } from "@/lib/server/serialize";
import { requireUser } from "@/lib/server/session";
import { isStoredImage } from "@/lib/server/storage";
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
    const bg = await cleanBg(d.bg, user._id);
    const fields = {
      date: d.date,
      weather: typeof d.weather === "string" ? d.weather.slice(0, 20) : null,
      title: String(d.title ?? "").slice(0, 30),
      body: String(d.body ?? "").slice(0, 240),
      strokes: d.strokes,
      bg,
      teacher: String(d.teacher ?? "").slice(0, 60),
      teacherBy: d.teacherBy === "ai" ? ("ai" as const) : ("rule" as const),
      // 위험 신호(care)는 받지 않는다 — 109 안내는 답장을 받은 그 화면에서만 쓰고 이 기기에만 남는다 (민감정보 줄이기)
      stickers: cleanStickers(d.stickers, []),
      stamp: cleanStamp(d.stamp),
      late: !!d.late,
      secret: !!d.secret,
      topic: typeof d.topic === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d.topic) ? d.topic : null,
      topicText: typeof d.topic === "string" && typeof d.topicText === "string" ? d.topicText.replace(/\s+/g, " ").trim().slice(0, 30) || null : null,
      updatedAt: now,
    };

    const { diaries, goneDiaries } = await cols();
    // 지운 일기는 다시 받지 않는다 (지우는 사이에 늦게 도착한 올리기)
    if (await goneDiaries.findOne({ userId: user._id, clientId: d.id }, { projection: { _id: 1 } }))
      throw new HttpError(410, "deleted", "지운 일기예요");
    const saved = await diaries.findOneAndUpdate(
      { userId: user._id, clientId: d.id },
      {
        $set: fields,
        $unset: { care: "" }, // 예전에 올라온 값도 다시 올릴 때 지운다
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
    const awards = [...(await grantStreak(user._id)), ...(await grantBirthday(user, fields.date))];
    return json({ diary: diaryToClient(saved), awards: awards.map(awardToClient) });
  });
}

/** 그림칸 배경: 고른 배경 id, 또는 이 사람이 그려 받은 AI 그림 주소 (11-11, api/picture) */
async function cleanBg(bg: unknown, userId: ObjectId): Promise<string | null> {
  if (typeof bg !== "string" || !bg) return null;
  if (isStoredImage(bg, "ai")) {
    const { pictures } = await cols();
    return (await pictures.findOne({ userId, url: bg }, { projection: { _id: 1 } })) ? bg : null;
  }
  return bg.slice(0, 40);
}

/** 기기 id 로 내 일기 지우기 (?clientId=). 서버에 없던 일기여도 지운 표시는 남겨서 늦게 온 올리기를 막는다 */
export async function DELETE(req: NextRequest) {
  return handle(async () => {
    assertSameOrigin(req);
    const user = await requireUser(req);
    assertRate(`diary-del:${user._id}`, 120, 60 * 60 * 1000);
    const clientId = req.nextUrl.searchParams.get("clientId") ?? "";
    if (!clientId || clientId.length > 40) throw new HttpError(400, "clientId");
    const { diaries } = await cols();
    const d = await diaries.findOne({ userId: user._id, clientId });
    const deleted = await removeMyDiary(user._id, clientId, d);
    return json({ ok: true, deleted });
  });
}
