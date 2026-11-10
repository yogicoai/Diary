// 일기 저장 (이 기기 IndexedDB, 사람마다 따로). 서버와 맞추기는 lib/sync.ts.

import { del, get, set } from "idb-keyval";
import type { Stroke } from "./crayon";
import type { WeatherId } from "./weather";

export type Diary = {
  id: string;
  date: string; // YYYY-MM-DD
  weather: WeatherId | null;
  title: string;
  body: string;
  strokes: Stroke[];
  bg?: string | null; // 그림칸 배경 id, 없으면 직접 그리기(흰 종이)
  teacher: string;
  teacherBy?: "ai" | "rule"; // 선생님 한 줄을 누가 썼나
  stickers?: string[]; // 선생님 칭찬 스티커 id (lib/stickers.ts)
  late?: boolean; // 밀린 숙제 (날짜가 지나서 쓴 일기) — 개근상에는 안 들어간다
  care?: boolean; // Claude 가 위험 신호를 봤을 때
  topic?: string | null; // 오늘의 숙제로 쓴 날 (YYYY-MM-DD)
  topicText?: string | null; // 그때 숙제 글 (선생님이 나중에 바꿔도 그대로)
  stamp?: string; // 선생님 도장 (lib/stamps.ts, 없으면 참 잘했어요)
  // 서버에 올라간 뒤 채워지는 값
  serverId?: string;
  board?: { status: "visible" | "pending" | "hidden"; mode: "drawing" | "full"; cardUrl: string; thumbUrl: string; note?: string } | null;
  classIds?: string[];
  reactions?: Partial<Record<string, number>>;
  secret: boolean;
  createdAt: number;
};

/* ---------- 이 기기 일기장은 사람마다 따로 (11-10 사용자: "본인 계정에 있는 일기만 보여야지") ----------
 * 로그인한 사람은 chamjal.diaries.v1:u:<id>, 손님은 chamjal.diaries.v1:guest. 지금 주인은 localStorage chamjal.owner
 * (lib/me.tsx 가 로그인 확인 때 맞춘다 → 바뀌면 'chamjal:diaries' 알림으로 일기장 화면이 다시 읽는다).
 * 손님 때 쓴 일기는 로그인하면 그 계정으로 합친다(lib/sync.ts adoptGuestDiaries). 다른 사람 칸은 화면에 안 나온다. */
const LEGACY_KEY = "chamjal.diaries.v1"; // 11-10 전: 기기 하나에 한 칸 (계정이 섞였다)
const GUEST_KEY = "chamjal.diaries.v1:guest";
const OWNER_KEY = "chamjal.owner";
const DIARIES_EVENT = "chamjal:diaries";

/** 지금 이 기기 일기장의 주인 (로그인한 사람 id, 손님이면 null) */
export function diaryOwner(): string | null {
  try {
    return localStorage.getItem(OWNER_KEY);
  } catch {
    return null;
  }
}

/** 로그인·로그아웃 때 일기장 주인을 바꾼다. 바뀌면 일기장 화면들에 알린다 */
export function setDiaryOwner(id: string | null) {
  if (diaryOwner() === id) return;
  try {
    if (id) localStorage.setItem(OWNER_KEY, id);
    else localStorage.removeItem(OWNER_KEY);
  } catch {
    /* 못 적으면 손님 칸 */
  }
  notifyDiaries();
}

/** 일기장이 바뀌었다고 알리기 (주인이 바뀌었거나 서버에서 받아 왔을 때) */
export function notifyDiaries() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(DIARIES_EVENT));
}

/** 일기장이 바뀌면 다시 읽기 (화면에서 씀) */
export function onDiariesChange(fn: () => void): () => void {
  window.addEventListener(DIARIES_EVENT, fn);
  return () => window.removeEventListener(DIARIES_EVENT, fn);
}

const keyOf = (owner = diaryOwner()) => (owner ? `${LEGACY_KEY}:u:${owner}` : GUEST_KEY);

/** 예전 한 칸 일기장 나누기 (한 번): 서버에 간 일기(serverId)는 뺀다 — 주인이 로그인하면 서버에서 다시 받아 온다.
 *  서버에 안 간 일기만 손님 칸으로 (로그인하면 그 계정으로 합쳐진다) */
let migrated: Promise<void> | null = null;
function migrate(): Promise<void> {
  migrated ??= (async () => {
    const legacy = (await get(LEGACY_KEY)) as Diary[] | undefined;
    if (!legacy) return;
    const local = legacy.filter((d) => !d.serverId);
    if (local.length) {
      const guest = ((await get(GUEST_KEY)) as Diary[] | undefined) ?? [];
      await set(GUEST_KEY, [...guest, ...local.filter((d) => !guest.some((g) => g.id === d.id))]);
    }
    await del(LEGACY_KEY);
  })().catch(() => {
    migrated = null; // 다음에 다시
  });
  return migrated;
}

async function readAll(owner?: string | null): Promise<Diary[]> {
  await migrate();
  return ((await get(keyOf(owner))) as Diary[] | undefined) ?? [];
}

export async function listDiaries(): Promise<Diary[]> {
  try {
    const all = await readAll();
    return [...all].sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

export async function saveDiary(d: Diary): Promise<void> {
  const key = keyOf();
  const all = await readAll();
  const i = all.findIndex((x) => x.id === d.id);
  if (i >= 0) all[i] = d;
  else all.push(d);
  await set(key, all);
}

export async function getDiary(id: string): Promise<Diary | undefined> {
  const all = await readAll();
  return all.find((x) => x.id === id);
}

export async function deleteDiary(id: string): Promise<void> {
  const key = keyOf();
  const all = await readAll();
  await set(
    key,
    all.filter((x) => x.id !== id),
  );
}

/** 이 기기에서 한 사람의 일기장 칸을 비운다 (회원 탈퇴 뒤) */
export async function dropDiariesOf(owner: string): Promise<void> {
  await del(keyOf(owner));
}

/** 만 14살 미만이라 가입 정보를 지웠을 때: 이 기기의 그 사람 일기를 손님 칸으로 돌려놓는다.
 *  서버 쪽 표시(serverId·게시판·반·반응)는 뗀다 — 서버에선 이미 지워졌고, 일기는 이 기기에만 남는다 */
export async function releaseToGuest(owner: string): Promise<void> {
  const mine = await readAll(owner);
  if (mine.length) {
    const guest = ((await get(GUEST_KEY)) as Diary[] | undefined) ?? [];
    const back = mine
      .filter((d) => !guest.some((g) => g.id === d.id))
      .map((d): Diary => ({ ...d, serverId: undefined, board: null, classIds: undefined, reactions: undefined }));
    await set(GUEST_KEY, [...guest, ...back]);
  }
  await del(keyOf(owner));
}

/** 로그아웃할 때: 서버에 올라간 일기 사본은 이 기기에서 지운다 (공용 컴퓨터에 남지 않게 — 다시 로그인하면 서버에서 받아 온다).
 *  아직 못 올린 일기만 남겨 두고 다음 로그인 때 올린다 */
export async function forgetSynced(owner: string): Promise<void> {
  const left = (await readAll(owner)).filter((d) => !d.serverId);
  if (left.length) await set(keyOf(owner), left);
  else await del(keyOf(owner));
}

/** 손님 때 이 기기에 쓴 일기를 지금 로그인한 사람 일기장으로 옮긴다. 옮긴 일기를 돌려준다 */
export async function adoptGuestDiaries(): Promise<Diary[]> {
  const owner = diaryOwner();
  if (!owner) return [];
  await migrate();
  const guest = ((await get(GUEST_KEY)) as Diary[] | undefined) ?? [];
  if (!guest.length) return [];
  const mine = await readAll(owner);
  const moved = guest.filter((g) => !mine.some((m) => m.id === g.id));
  await set(keyOf(owner), [...mine, ...moved]);
  await del(GUEST_KEY);
  return moved;
}

// 가벼운 이용 기록 (분석 도구 붙기 전까지 기기 안에만)
export function track(event: string, data: Record<string, unknown> = {}) {
  try {
    const raw = localStorage.getItem("chamjal.metrics.v1");
    const list = raw ? (JSON.parse(raw) as unknown[]) : [];
    list.push({ event, at: Date.now(), ...data });
    localStorage.setItem("chamjal.metrics.v1", JSON.stringify(list.slice(-300)));
  } catch {
    /* 저장 못 해도 화면은 그대로 */
  }
  const w = window as unknown as { PD_TRACK?: (e: string, d: unknown) => void };
  w.PD_TRACK?.(event, data);
}
