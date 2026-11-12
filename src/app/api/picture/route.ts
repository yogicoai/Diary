// AI 그림 그려 받기 (11-11, lib/server/picture.ts): 이름표 있는 사람만 하루 AI_PICTURE.perDay 장.
//   GET  = 오늘 남은 장수 + 오늘 그린 그림 (다시 깔 수 있게)
//   POST = 일기 글(제목·날씨·본문)로 그리기 → { url, left }. 둘러보기(예제 일기장)는 requireUser 가 막는다
// 화면은 이 기기에서 국외 이전 동의(AI 그림)를 받은 뒤에만 부른다 (components/PictureConsentSheet).

import { MongoServerError, type ObjectId } from "mongodb";
import type { NextRequest } from "next/server";
import { AI_PICTURE } from "@/lib/business";
import { kstKey } from "@/lib/server/awards";
import { cols } from "@/lib/server/db";
import { assertRate, assertSameOrigin, clientIp, handle, HttpError, json, readJson } from "@/lib/server/http";
import { drawScene, pictureReady, sceneOf } from "@/lib/server/picture";
import { requireUser } from "@/lib/server/session";
import { putImage, storageReady } from "@/lib/server/storage";
import { weatherById } from "@/lib/weather";

export const maxDuration = 60; // 장면 정리 + 그림 AI 가 15초 안팎 걸린다

export async function GET(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser(req);
    // 그림 AI 키가 있고, 둘러보기가 아니고, 그림을 보관할 수 있어야 준비됨 (보관함이 고장이면 안내 판이 처음부터 "준비 중")
    const ready = pictureReady() && !user.demoView && (await storageReady(`ai/${kstKey().slice(0, 7)}`));
    if (!ready) return json({ ready, left: 0, url: null });
    const { pictures } = await cols();
    const today = await pictures.find({ userId: user._id, day: kstKey() }).sort({ slot: 1 }).toArray();
    const done = today.filter((p) => p.status === "done" && p.url);
    return json({ ready, left: Math.max(0, AI_PICTURE.perDay - today.length), url: done.at(-1)?.url ?? null });
  });
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    assertSameOrigin(req);
    const user = await requireUser(req);
    if (!pictureReady()) throw new HttpError(503, "not_ready", "그림 AI 가 아직 준비 중이에요");
    assertRate(`pic:${clientIp(req)}`, 10, 60 * 60 * 1000);
    const body = await readJson<{ title?: string; body?: string; weather?: string | null }>(req);
    const title = String(body.title ?? "").trim().slice(0, 30);
    const text = String(body.body ?? "").trim().slice(0, 240);
    if ((title + text).replace(/\s/g, "").length < 8) throw new HttpError(400, "short", "오늘 있었던 일을 조금 더 적어 주세요");

    const day = kstKey();
    const dir = `ai/${day.slice(0, 7)}`;
    const { pictures } = await cols();
    if ((await pictures.countDocuments({ day })) >= AI_PICTURE.dailyCap) {
      throw new HttpError(503, "busy", "오늘은 그림 AI 가 너무 바빠요. 내일 다시 그려 줄게요");
    }
    // 저장할 수 없으면 그림 AI 를 부르지 않는다 (돈만 나가고 그림은 남지 않으니까)
    if (!(await storageReady(dir))) throw new HttpError(503, "storage", "그림 보관함을 고치는 중이에요. 오늘은 직접 그려 볼까요?");
    // 오늘 칸 잡기: 같은 칸은 한 번만 잡혀서 두 번 눌러도 두 장 그리지 않는다
    let slotId: ObjectId | null = null;
    for (let slot = 0; slot < AI_PICTURE.perDay && !slotId; slot++) {
      try {
        slotId = (await pictures.insertOne({ userId: user._id, day, slot, status: "drawing", url: null, at: new Date() } as never)).insertedId;
      } catch (e) {
        if (!(e instanceof MongoServerError && e.code === 11000)) throw e;
      }
    }
    if (!slotId) throw new HttpError(429, "used", "오늘 그림은 다 그렸어요. 내일 또 그려 줄게요");

    let image: Buffer;
    try {
      const scene = await sceneOf({ title, body: text, weather: body.weather ? (weatherById(body.weather)?.label ?? null) : null });
      if (!scene) throw new HttpError(400, "scene", "이 일기는 그림으로 그리기 어려워요. 직접 그려 볼까요?");
      image = await drawScene(scene);
    } catch (e) {
      await pictures.deleteOne({ _id: slotId }).catch(() => {}); // 그림을 못 받았으면(그림값이 안 나갔으면) 오늘 칸은 돌려준다
      throw e;
    }
    // 그림은 받았다(그림값이 나갔다) → 저장은 한 번 더 해 보고, 그래도 안 되면 오늘 칸은 쓴 것으로 둔다 (다시 눌러 또 돈이 나가지 않게)
    let url: string;
    try {
      url = await putImage(image, dir, "webp").catch(() => putImage(image, dir, "webp"));
    } catch {
      await pictures.updateOne({ _id: slotId }, { $set: { status: "failed" } }).catch(() => {});
      throw new HttpError(502, "storage", "그림을 보관하지 못했어요. 오늘은 직접 그려 볼까요?");
    }
    await pictures.updateOne({ _id: slotId }, { $set: { status: "done", url } });
    const used = await pictures.countDocuments({ userId: user._id, day });
    return json({ url, left: Math.max(0, AI_PICTURE.perDay - used) });
  });
}
