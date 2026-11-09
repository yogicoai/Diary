// 아이 목소리가 읽을 글. 서버(api/read)와 화면(기기 저장 열쇠)이 같은 글을 쓴다.

import { koreanDate } from "./date";
import { WEATHERS } from "./weather";

export type ReadVoice = "girl" | "boy";
export const READ_VOICES: { id: ReadVoice; name: string }[] = [
  { id: "girl", name: "여자아이" },
  { id: "boy", name: "남자아이" },
];

export function readScript(input: { date: string; weather: string | null; title: string; body: string }): string {
  const w = WEATHERS.find((x) => x.id === input.weather);
  const parts = [`${koreanDate(input.date)}.`];
  if (w) parts.push(`날씨, ${w.label}.`);
  if (input.title.trim()) parts.push(`제목, ${input.title.trim()}.`);
  const body = input.body.replace(/\s+/g, " ").trim();
  if (body) parts.push(/[.!?]$/.test(body) ? body : `${body}.`);
  return parts.join(" ");
}
