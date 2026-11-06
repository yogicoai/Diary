// 교실 뒤 게시판에 붙이기(POST, 카드·미리보기 그림 + 그림만/글까지) / 떼기(DELETE)
// 붙이기 전에 AI 검사. 검사를 못 했으면 운영에서는 관리자 확인 대기.

import type { NextRequest } from "next/server";
import { cols, type BoardState } from "@/lib/server/db";
import { myDiary } from "@/lib/server/find";
import { assertRate, assertSameOrigin, handle, HttpError, json } from "@/lib/server/http";
import { moderate } from "@/lib/server/moderate";
import { diaryToClient } from "@/lib/server/serialize";
import { requireUser } from "@/lib/server/session";
import { putImage } from "@/lib/server/storage";

type Ctx = { params: Promise<{ id: string }> };
const MAX_CARD = 2_500_000;
const MAX_THUMB = 400_000;

async function fileBuffer(v: FormDataEntryValue | null, max: number): Promise<Buffer> {
  if (!v || typeof v === "string") throw new HttpError(400, "file", "그림 파일이 없어요");
  if (v.size > max) throw new HttpError(413, "file_size", "그림 파일이 너무 커요");
  return Buffer.from(await v.arrayBuffer());
}

export async function POST(req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    assertSameOrigin(req);
    const user = await requireUser(req);
    assertRate(`publish:${user._id}`, 20, 60 * 60 * 1000);
    const d = await myDiary((await params).id, user);
    if (d.secret) throw new HttpError(400, "secret", "비밀 일기는 게시판에 붙일 수 없어요");

    const form = await req.formData();
    const mode = form.get("mode") === "full" ? "full" : "drawing";
    const card = await fileBuffer(form.get("card"), MAX_CARD);
    const thumb = await fileBuffer(form.get("thumb"), MAX_THUMB);

    const check = await moderate({ title: d.title, body: d.body, mode, thumb });
    if (check.checked && !check.ok) {
      throw new HttpError(422, "moderation", check.reason || "게시판에 붙이기 어려운 내용이 있어요");
    }

    const month = d.date.slice(0, 7);
    const [cardUrl, thumbUrl] = await Promise.all([putImage(card, `card/${month}`), putImage(thumb, `thumb/${month}`)]);
    const pending = !check.checked && process.env.NODE_ENV === "production";
    const board: BoardState = {
      status: pending ? "pending" : "visible",
      mode,
      at: d.board?.at ?? new Date(),
      cardUrl,
      thumbUrl,
      reports: d.board?.reports ?? 0,
      checked: check.checked,
      note: pending ? "선생님이 확인하고 붙여 줄게요" : undefined,
    };
    const { diaries } = await cols();
    const updated = await diaries.findOneAndUpdate(
      { _id: d._id },
      { $set: { board, updatedAt: new Date() } },
      { returnDocument: "after" },
    );
    if (!updated) throw new HttpError(404, "not_found");
    return json({ diary: diaryToClient(updated) });
  });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    assertSameOrigin(req);
    const user = await requireUser(req);
    const d = await myDiary((await params).id, user);
    const { diaries } = await cols();
    const updated = await diaries.findOneAndUpdate(
      { _id: d._id },
      { $unset: { board: "" }, $set: { updatedAt: new Date() } },
      { returnDocument: "after" },
    );
    if (!updated) throw new HttpError(404, "not_found");
    return json({ diary: diaryToClient(updated) });
  });
}
