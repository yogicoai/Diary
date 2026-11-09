// 아이 목소리가 읽을 글. 서버(api/read)와 화면(기기 저장 열쇠)이 같은 글을 쓴다.

import { koreanDate } from "./date";
import { weatherById } from "./weather";

export type ReadVoice = "girl" | "boy";
/**
 * 읽는 빠르기 (Typecast output.audio_tempo, 1 = 성우 본래 속도). 11-09 사용자 "목소리가 너무 빨리 읽어진다".
 * 본래 속도에서 태지 초당 약 5.5음절·수아 약 4.6음절(쉼 포함) → 둘 다 약 4.2음절이 되게 따로 늦춘다.
 * 바꾸면 기기에 담아 둔 소리 열쇠도 바뀌어 새로 받는다(lib/readAloud.ts).
 */
export const READ_TEMPO: Record<ReadVoice, number> = { girl: 0.88, boy: 0.78 };

export const READ_VOICES: { id: ReadVoice; name: string }[] = [
  { id: "girl", name: "여자아이" },
  { id: "boy", name: "남자아이" },
];

export function readScript(input: { date: string; weather: string | null; title: string; body: string }): string {
  const w = weatherById(input.weather);
  const parts = [`${koreanDate(input.date)}.`];
  if (w) parts.push(`날씨, ${w.label}.`);
  if (input.title.trim()) parts.push(`제목, ${input.title.trim()}.`);
  const body = input.body.replace(/\s+/g, " ").trim();
  if (body) parts.push(/[.!?]$/.test(body) ? body : `${body}.`);
  return parts.join(" ");
}
