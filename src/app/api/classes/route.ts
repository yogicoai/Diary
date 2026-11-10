// 우리 반: 내 반 목록(GET, 반마다 오늘 낸 친구 수·내가 냈나·오늘 반 숙제) / 새 반 만들기(POST {name})

import crypto from "node:crypto";
import type { NextRequest } from "next/server";
import { MongoServerError, type ObjectId } from "mongodb";
import { kstToday } from "@/lib/social";
import { cols } from "@/lib/server/db";
import { assertRate, assertSameOrigin, handle, HttpError, json, readJson } from "@/lib/server/http";
import { classToClient } from "@/lib/server/serialize";
import { requireUser } from "@/lib/server/session";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 헷갈리는 글자(0 O 1 I) 뺌

function newCode() {
  const bytes = crypto.randomBytes(6);
  return Array.from(bytes, (b) => CODE_CHARS[b % CODE_CHARS.length]).join("");
}

export async function GET(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser(req);
    const { classes, diaries, brags } = await cols();
    const list = await classes.find({ memberIds: user._id }).sort({ createdAt: -1 }).limit(30).toArray();
    // 목록 카드에 오늘 반 소식: 오늘 낸 친구 수(출석부)·내가 냈나·오늘 반 숙제 (11-10 사용자: 반 목록 디자인)
    const today = kstToday();
    const ids = list.map((c) => c._id);
    const todays = ids.length
      ? await diaries
          .aggregate<{ _id: ObjectId; users: ObjectId[] }>([
            { $match: { classIds: { $in: ids }, date: today } },
            { $unwind: "$classIds" },
            { $match: { classIds: { $in: ids } } },
            { $group: { _id: "$classIds", users: { $addToSet: "$userId" } } },
          ])
          .toArray()
      : [];
    // 이번 달 칭찬 스티커를 이 반에 자랑했나 (스티커판의 '우리 반에 자랑하기')
    const bragged = new Set(
      (await brags.find({ userId: user._id, month: today.slice(0, 7), classId: { $in: ids } }, { projection: { classId: 1 } }).toArray()).map((b) => b.classId.toHexString()),
    );
    return json({
      classes: list.map((c) => {
        const t = todays.find((x) => x._id.equals(c._id));
        const members = new Set(c.memberIds.map((m) => m.toHexString()));
        const handed = (t?.users ?? []).filter((u) => members.has(u.toHexString()));
        return {
          ...classToClient(c, user._id.toHexString()),
          handedIn: handed.length,
          mine: handed.some((u) => u.equals(user._id)),
          homework: c.homework?.date === today ? c.homework.text : null,
          bragged: bragged.has(c._id.toHexString()),
        };
      }),
    });
  });
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    assertSameOrigin(req);
    const user = await requireUser(req);
    assertRate(`class:${user._id}`, 10, 60 * 60 * 1000);
    const { name } = await readJson<{ name: string }>(req);
    const clean = String(name ?? "").trim().slice(0, 16);
    if (clean.length < 1) throw new HttpError(400, "name", "반 이름을 써 주세요");
    const { classes } = await cols();
    if ((await classes.countDocuments({ ownerId: user._id })) >= 10)
      throw new HttpError(400, "too_many", "반은 10개까지 만들 수 있어요");

    for (let i = 0; i < 5; i++) {
      const doc = { name: clean, code: newCode(), ownerId: user._id, memberIds: [user._id], createdAt: new Date() };
      try {
        const res = await classes.insertOne(doc as never);
        return json({ class: classToClient({ _id: res.insertedId, ...doc }, user._id.toHexString()) });
      } catch (e) {
        if (!(e instanceof MongoServerError && e.code === 11000)) throw e;
      }
    }
    throw new HttpError(500, "code");
  });
}
