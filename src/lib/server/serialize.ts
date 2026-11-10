// DB 문서 → 화면으로 보내는 모양

import type { AwardDoc, ClassDoc, DiaryDoc, UserDoc } from "./db";
import { ageOf, nameTag } from "@/lib/social";

export function meToClient(u: UserDoc, admin: boolean) {
  return {
    id: u._id.toHexString(),
    nickname: u.nickname,
    age: ageOf(u),
    birth: u.birth ?? null, // 본인 화면에만 (이름표 고치기·생일 축하)
    kid: u.kid ?? null,
    email: u.email,
    nameTag: nameTag(u),
    admin,
  };
}

/** 내 일기 (전부) */
export function diaryToClient(d: DiaryDoc) {
  return {
    serverId: d._id.toHexString(),
    id: d.clientId,
    date: d.date,
    weather: d.weather,
    title: d.title,
    body: d.body,
    strokes: d.strokes,
    bg: d.bg,
    teacher: d.teacher,
    teacherBy: d.teacherBy,
    stickers: d.stickers ?? [],
    stamp: d.stamp ?? "cham",
    late: !!d.late,
    secret: d.secret,
    topic: d.topic,
    topicText: d.topicText ?? null,
    createdAt: d.createdAt.getTime(),
    board: d.board
      ? { status: d.board.status, mode: d.board.mode, cardUrl: d.board.cardUrl, thumbUrl: d.board.thumbUrl, note: d.board.note }
      : null,
    classIds: d.classIds.map((c) => c.toHexString()),
    reactions: d.reactions ?? {},
  };
}

/** 게시판에 보이는 일기 (글은 "글까지" 붙인 경우만) */
export function boardItem(d: DiaryDoc, owner: Pick<UserDoc, "nickname" | "birth" | "birthYear"> | null) {
  const full = d.board?.mode === "full" && !d.secret;
  return {
    id: d._id.toHexString(),
    date: d.date,
    weather: d.weather,
    title: d.title,
    body: full ? d.body : "",
    teacher: d.teacher,
    topic: d.topic,
    topicText: d.topicText ?? null,
    mode: d.board?.mode ?? "drawing",
    thumbUrl: d.board?.thumbUrl ?? "",
    cardUrl: d.board?.cardUrl ?? "",
    at: d.board?.at?.getTime() ?? d.createdAt.getTime(),
    nameTag: owner ? nameTag(owner) : "전학 간 친구",
    reactions: d.reactions ?? {},
  };
}

/** 우리 반 피드: 반 친구끼리라 그림을 획 그대로 보낸다 (비밀 일기는 글을 뺀다) */
export function classItem(d: DiaryDoc, owner: Pick<UserDoc, "nickname" | "birth" | "birthYear"> | null) {
  return {
    id: d._id.toHexString(),
    date: d.date,
    weather: d.weather,
    title: d.title,
    body: d.secret ? "" : d.body,
    secret: d.secret,
    strokes: d.strokes,
    bg: d.bg,
    teacher: d.teacher,
    stickers: d.stickers ?? [],
    nameTag: owner ? nameTag(owner) : "전학 간 친구",
    reactions: d.reactions ?? {},
    at: d.createdAt.getTime(),
  };
}

export function classToClient(c: ClassDoc, meId: string) {
  return {
    id: c._id.toHexString(),
    name: c.name,
    code: c.code,
    members: c.memberIds.length,
    owner: c.ownerId.toHexString() === meId,
  };
}

export function awardToClient(a: AwardDoc) {
  return {
    id: a._id.toHexString(),
    kind: a.kind,
    label: a.label,
    detail: a.detail,
    rank: a.rank ?? null,
    diaryId: a.diaryId?.toHexString() ?? null,
    at: a.at.getTime(),
  };
}
