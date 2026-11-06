// 일기 저장 (이 기기 IndexedDB). 서버로 가는 데이터 없음.
// 계정·동기화가 생기면 이 파일만 바꾸면 된다.

import { get, set } from "idb-keyval";
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
  secret: boolean;
  createdAt: number;
};

const KEY = "chamjal.diaries.v1";

export async function listDiaries(): Promise<Diary[]> {
  try {
    const all = ((await get(KEY)) as Diary[] | undefined) ?? [];
    return [...all].sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

export async function saveDiary(d: Diary): Promise<void> {
  const all = ((await get(KEY)) as Diary[] | undefined) ?? [];
  const i = all.findIndex((x) => x.id === d.id);
  if (i >= 0) all[i] = d;
  else all.push(d);
  await set(KEY, all);
}

export async function getDiary(id: string): Promise<Diary | undefined> {
  const all = ((await get(KEY)) as Diary[] | undefined) ?? [];
  return all.find((x) => x.id === id);
}

export async function deleteDiary(id: string): Promise<void> {
  const all = ((await get(KEY)) as Diary[] | undefined) ?? [];
  await set(
    KEY,
    all.filter((x) => x.id !== id),
  );
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
