// 우리 반: 내 반 목록(GET) / 새 반 만들기(POST {name})

import crypto from "node:crypto";
import type { NextRequest } from "next/server";
import { MongoServerError } from "mongodb";
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
    const { classes } = await cols();
    const list = await classes.find({ memberIds: user._id }).sort({ createdAt: -1 }).limit(30).toArray();
    return json({ classes: list.map((c) => classToClient(c, user._id.toHexString())) });
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
