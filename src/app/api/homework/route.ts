// 오늘의 숙제(어른이 미션) 검사
//  GET  ?date=  그날 숙제 + 내 숙제 + 몇 명이 했나 + 보여 주기로 낸 숙제들(게시판 '오늘의 숙제')
//  POST (FormData: date·text·share·photo·thumb)  오늘 숙제 내기. 사진 한 장이나 한 줄 중 하나는 있어야.
//       보여 주기면 붙이기 전에 AI 검사(게시판과 같은 moderate). 처음 내면 숙제 스티커 1장, 10·30·100번이면 상장.

import type { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { kstKey } from "@/lib/server/awards";
import { cols, NoDbError } from "@/lib/server/db";
import { grantHomework, homeworkSticker, homeworkToClient } from "@/lib/server/homework";
import { assertRate, assertSameOrigin, handle, HttpError, json } from "@/lib/server/http";
import { moderate } from "@/lib/server/moderate";
import { currentUser, requireUser } from "@/lib/server/session";
import { putImage } from "@/lib/server/storage";
import { DATE_KEY, resolveTopic } from "@/lib/server/topics";
import { nameTag } from "@/lib/social";

const MAX_PHOTO = 1_500_000;
const MAX_THUMB = 300_000;

async function fileBuffer(v: FormDataEntryValue | null, max: number): Promise<Buffer | null> {
  if (!v || typeof v === "string") return null;
  if (v.size > max) throw new HttpError(413, "too_big", "사진이 너무 커요");
  return Buffer.from(await v.arrayBuffer());
}

export async function GET(req: NextRequest) {
  return handle(async () => {
    const today = kstKey();
    const q = req.nextUrl.searchParams.get("date") ?? "";
    const date = DATE_KEY.test(q) ? q : today;
    const mission = await resolveTopic(date);
    try {
      const me = await currentUser(req);
      const { homework, users } = await cols();
      const [mine, count, shared] = await Promise.all([
        me ? homework.findOne({ userId: me._id, date }) : Promise.resolve(null),
        homework.countDocuments({ date }),
        homework.find({ date, share: true, status: "visible" }).sort({ at: -1 }).limit(30).toArray(),
      ]);
      const owners = await users
        .find({ _id: { $in: [...new Set(shared.map((h) => h.userId.toHexString()))].map((s) => new ObjectId(s)) } }, { projection: { nickname: 1, birth: 1, birthYear: 1 } })
        .toArray();
      const tag = (id: ObjectId) => {
        const o = owners.find((u) => u._id.equals(id));
        return o ? nameTag(o) : "전학 간 친구";
      };
      return json({
        date,
        today,
        mission,
        mine: mine ? homeworkToClient(mine) : null,
        count,
        shared: shared.map((h) => homeworkToClient(h, tag(h.userId))),
      });
    } catch (e) {
      if (!(e instanceof NoDbError)) throw e;
      return json({ date, today, mission, mine: null, count: 0, shared: [], noServer: true });
    }
  });
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    assertSameOrigin(req);
    const me = await requireUser(req);
    assertRate(`hw:${me._id.toHexString()}`, 12, 60 * 60_000);
    const form = await req.formData();
    const date = String(form.get("date") ?? "");
    if (date !== kstKey()) throw new HttpError(400, "today", "오늘 숙제만 낼 수 있어요");
    const text = String(form.get("text") ?? "").replace(/\s+/g, " ").trim().slice(0, 60);
    const share = form.get("share") === "1";
    const photo = await fileBuffer(form.get("photo"), MAX_PHOTO);
    const thumb = await fileBuffer(form.get("thumb"), MAX_THUMB);
    if (photo && !thumb) throw new HttpError(400, "thumb", "사진을 다시 골라 주세요");

    const { homework } = await cols();
    const before = await homework.findOne({ userId: me._id, date });
    if (!text && !photo && !before?.photoUrl) throw new HttpError(400, "empty", "사진 한 장이나 한 줄 중 하나는 있어야 해요");

    const mission = (await resolveTopic(date)).text;
    let status: "visible" | "pending" = "visible";
    let checked = false;
    if (share) {
      const check = await moderate({ title: `오늘의 숙제: ${mission}`, body: text, mode: "full", thumb: thumb ?? undefined });
      if (check.checked && !check.ok) throw new HttpError(422, "moderation", check.reason || "게시판에 보여 주기 어려운 내용이 있어요");
      checked = check.checked;
      if (!checked && process.env.NODE_ENV === "production") status = "pending";
    }

    const month = date.slice(0, 7);
    const [photoUrl, thumbUrl] = photo && thumb ? await Promise.all([putImage(photo, `hw/${month}`), putImage(thumb, `hw-thumb/${month}`)]) : [null, null];
    const now = new Date();
    await homework.updateOne(
      { userId: me._id, date },
      {
        $set: { mission, text, share, status, checked, updatedAt: now, ...(photoUrl ? { photoUrl, thumbUrl } : {}) },
        $setOnInsert: { userId: me._id, date, sticker: homeworkSticker(me._id, date), at: now, ...(photoUrl ? {} : { photoUrl: null, thumbUrl: null }) },
      },
      { upsert: true },
    );
    const saved = await homework.findOne({ userId: me._id, date });
    if (!saved) throw new HttpError(500, "save");
    const count = await homework.countDocuments({ userId: me._id });
    // 칭찬 스티커판은 달마다 새 판 (11-10 사용자) → 이번 달 장수도 알려 준다
    const monthCount = await homework.countDocuments({ userId: me._id, date: { $gte: `${date.slice(0, 7)}-01`, $lte: `${date.slice(0, 7)}-31` } });
    const awards = before ? [] : await grantHomework(me._id, count);
    return json({
      homework: homeworkToClient(saved),
      first: !before,
      count,
      monthCount,
      awards: awards.map((a) => ({ label: a.label, detail: a.detail })),
    });
  });
}
