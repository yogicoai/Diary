// 내 일기 지우기 (11-09 사용자: "이야기 지우기"). 일기·반응·신고·짝꿍 한마디를 지우고,
// 게시판 카드 그림은 응답을 보낸 뒤 저장소에서 지운다.
// 지운 기기 id 는 남겨 둔다 → 늦게 도착한 올리기(동기화)를 POST /api/diaries 가 410 으로 거절해서 되살아나지 않는다.

import type { ObjectId } from "mongodb";
import { after } from "next/server";
import { cols, type DiaryDoc } from "./db";
import { removeImages } from "./storage";

/** 지웠으면 true, 서버에 없던 일기면 false (지운 표시는 어느 쪽이든 남긴다) */
export async function removeMyDiary(userId: ObjectId, clientId: string, d: DiaryDoc | null): Promise<boolean> {
  const { diaries, reactions, reports, notes, goneDiaries } = await cols();
  await goneDiaries.updateOne({ userId, clientId }, { $setOnInsert: { at: new Date() } }, { upsert: true });
  if (!d) return false;
  await Promise.all([
    diaries.deleteOne({ _id: d._id }),
    reactions.deleteMany({ diaryId: d._id }),
    reports.deleteMany({ diaryId: d._id }),
    notes.deleteMany({ diaryId: d._id }),
  ]);
  const board = d.board;
  if (board) after(() => removeImages([board.cardUrl, board.thumbUrl]));
  return true;
}
