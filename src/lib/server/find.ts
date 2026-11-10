// id 문자열 → 문서 찾기 (없으면 404)

import { ObjectId } from "mongodb";
import { cols, type ClassDoc, type DiaryDoc, type UserDoc } from "./db";
import { HttpError } from "./http";

export function oid(id: string): ObjectId {
  if (!ObjectId.isValid(id)) throw new HttpError(404, "not_found", "찾을 수 없어요");
  return new ObjectId(id);
}

export async function diaryById(id: string): Promise<DiaryDoc> {
  const { diaries } = await cols();
  const d = await diaries.findOne({ _id: oid(id) });
  if (!d) throw new HttpError(404, "not_found", "일기를 찾을 수 없어요");
  return d;
}

export async function myDiary(id: string, user: UserDoc): Promise<DiaryDoc> {
  const d = await diaryById(id);
  if (!d.userId.equals(user._id)) throw new HttpError(403, "not_mine", "내 일기가 아니에요");
  return d;
}

export async function memberClass(id: string, user: UserDoc): Promise<ClassDoc> {
  const { classes } = await cols();
  const c = await classes.findOne({ _id: oid(id) });
  if (!c) throw new HttpError(404, "not_found", "반을 찾을 수 없어요");
  if (!c.memberIds.some((m) => m.equals(user._id))) throw new HttpError(403, "not_member", "이 반 친구만 볼 수 있어요");
  return c;
}

/** 일기 주인들의 이름표를 한 번에 */
export async function ownersOf(list: DiaryDoc[]) {
  const { users } = await cols();
  const ids = [...new Set(list.map((d) => d.userId.toHexString()))].map((s) => new ObjectId(s));
  const owners = await users
    .find({ _id: { $in: ids } }, { projection: { nickname: 1, birth: 1, birthYear: 1 } })
    .toArray();
  return new Map(owners.map((u) => [u._id.toHexString(), u]));
}
