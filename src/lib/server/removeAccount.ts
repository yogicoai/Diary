// 회원 탈퇴 (11-10, 출시 전 필수 — 생년월일·일기 같은 개인정보를 본인이 모두 지울 수 있어야 한다).
// 이 사람의 일기(+ 그 일기에 달린 반응·신고·짝꿍 한마디)·숙제·상장·스티커 자랑·지운 표시를 지우고,
// 다른 사람 일기에 남긴 반응·짝꿍 한마디·신고도 지운다(반응 수도 줄인다). 반에서는 빠지고, 반장이면 다음 친구에게,
// 혼자 남은 반은 없앤다. 게시판 카드·숙제 사진·AI 그림은 응답 뒤 저장소에서 지운다. 마지막에 이름표(사용자)를 지운다.

import { after } from "next/server";
import type { ObjectId } from "mongodb";
import { cols, type UserDoc } from "./db";
import { removeImages } from "./storage";

export async function removeAccount(user: UserDoc): Promise<{ diaries: number; images: number }> {
  const { users, diaries, reactions, reports, notes, homework, awards, brags, goneDiaries, classes, pictures } = await cols();
  const uid = user._id;

  // 1) 내 일기와 거기 달린 것들
  const mine = await diaries.find({ userId: uid }, { projection: { _id: 1, board: 1 } }).toArray();
  const dIds = mine.map((d) => d._id);
  const urls: (string | undefined)[] = mine.flatMap((d) => (d.board ? [d.board.cardUrl, d.board.thumbUrl] : []));

  // 2) 내가 남의 일기에 찍은 도장·스티커 → 그 일기의 반응 수에서 뺀다
  const myReactions = await reactions.find({ userId: uid, diaryId: { $nin: dIds } }, { projection: { diaryId: 1, kind: 1 } }).toArray();
  const dec = new Map<string, { id: ObjectId; inc: Record<string, number> }>();
  for (const r of myReactions) {
    const k = r.diaryId.toHexString();
    const e = dec.get(k) ?? { id: r.diaryId, inc: {} };
    e.inc[`reactions.${r.kind}`] = (e.inc[`reactions.${r.kind}`] ?? 0) - 1;
    dec.set(k, e);
  }
  for (const e of dec.values()) await diaries.updateOne({ _id: e.id }, { $inc: e.inc });

  // 3) 숙제 사진 · AI 그림 (그려 받은 것 전부 — 일기에 안 깐 것도)
  const hw = await homework.find({ userId: uid }, { projection: { photoUrl: 1, thumbUrl: 1 } }).toArray();
  for (const h of hw) urls.push(h.photoUrl ?? undefined, h.thumbUrl ?? undefined);
  for (const p of await pictures.find({ userId: uid }, { projection: { url: 1 } }).toArray()) urls.push(p.url ?? undefined);

  await Promise.all([
    reactions.deleteMany({ $or: [{ userId: uid }, { diaryId: { $in: dIds } }] }),
    reports.deleteMany({ $or: [{ userId: uid }, { diaryId: { $in: dIds } }] }),
    notes.deleteMany({ $or: [{ userId: uid }, { diaryId: { $in: dIds } }] }),
    homework.deleteMany({ userId: uid }),
    awards.deleteMany({ $or: [{ userId: uid }, { diaryId: { $in: dIds } }] }),
    brags.deleteMany({ userId: uid }),
    goneDiaries.deleteMany({ userId: uid }),
    pictures.deleteMany({ userId: uid }),
  ]);
  await diaries.deleteMany({ userId: uid });

  // 4) 반: 빠지기 (반장이면 다음 친구에게, 혼자면 반을 없앤다)
  for (const c of await classes.find({ memberIds: uid }).toArray()) {
    const rest = c.memberIds.filter((m) => !m.equals(uid));
    if (!rest.length) {
      await classes.deleteOne({ _id: c._id });
      await brags.deleteMany({ classId: c._id });
      await diaries.updateMany({ classIds: c._id }, { $pull: { classIds: c._id } });
    } else {
      await classes.updateOne({ _id: c._id }, { $pull: { memberIds: uid }, ...(c.ownerId.equals(uid) ? { $set: { ownerId: rest[0] } } : {}) });
    }
  }

  // 5) 이름표
  await users.deleteOne({ _id: uid });

  const files = urls.filter((u): u is string => !!u);
  if (files.length) after(() => removeImages(files));
  return { diaries: mine.length, images: files.length };
}
