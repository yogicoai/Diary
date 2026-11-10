// 아이 목소리 읽어 주기 (화면 쪽). 한 번 받은 소리는 이 기기(IndexedDB)에 두고 다시 부르지 않는다
// → 같은 일기를 몇 번 들어도 크레딧은 한 번만.

import { get, set } from "idb-keyval";
import { READ_ALOUD } from "./business";
import { readScript, type ReadVoice, READ_TEMPO } from "./readScript";

const VOICE_KEY = "chamjal.readVoice";

/** 이 기기에서 (인트로 이름표 단계에서) 고른 나. 안 골랐으면 null */
export function kidChoice(): ReadVoice | null {
  try {
    const v = localStorage.getItem(VOICE_KEY);
    return v === "boy" || v === "girl" ? v : null;
  } catch {
    return null;
  }
}

/** 읽어 줄 목소리: 이름표의 나 → 이 기기에서 고른 나 → 여자아이 */
export function voiceFor(kid: ReadVoice | null | undefined): ReadVoice {
  return kid ?? kidChoice() ?? "girl";
}

export function readVoice(): ReadVoice {
  try {
    return localStorage.getItem(VOICE_KEY) === "boy" ? "boy" : "girl";
  } catch {
    return "girl";
  }
}

export function setReadVoice(v: ReadVoice) {
  try {
    localStorage.setItem(VOICE_KEY, v);
  } catch {
    /* 무시 */
  }
}

let onCheck: Promise<boolean> | null = null;
/** 서버에 목소리 키가 있을 때만 버튼을 보인다 (무료판은 꺼 둠: lib/business.ts READ_ALOUD) */
export function readAloudOn(): Promise<boolean> {
  if (!READ_ALOUD) return Promise.resolve(false);
  onCheck ??= fetch("/api/read")
    .then((r) => (r.ok ? r.json() : { on: false }))
    .then((j: { on?: boolean }) => !!j.on)
    .catch(() => false);
  return onCheck;
}

function hash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return (h >>> 0).toString(36);
}

export type ReadInput = { date: string; weather: string | null; title: string; body: string };

/** 실패하면 Error(message = 서버 error 코드) */
export async function getReading(d: ReadInput, voice: ReadVoice): Promise<Blob> {
  const key = `read:${voice}:t${READ_TEMPO[voice]}:${hash(readScript(d))}`; // 빠르기가 바뀌면 새로 받는다
  try {
    const hit = await get<Blob>(key);
    if (hit) return hit;
  } catch {
    /* 저장소를 못 쓰면 그냥 받는다 */
  }
  const res = await fetch("/api/read", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ voice, date: d.date, weather: d.weather, title: d.title, body: d.body }),
  });
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(j.error ?? "voice");
  }
  const blob = await res.blob();
  try {
    await set(key, blob);
  } catch {
    /* 못 남겨도 듣기는 된다 */
  }
  return blob;
}
