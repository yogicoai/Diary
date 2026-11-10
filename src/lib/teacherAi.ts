// 화면 쪽: 선생님 한 줄을 Claude 에게 부탁한다 (/api/teacher).
// 동의는 이 기기에 한 번 저장. 동의 안 했거나 실패하면 null → 기본 한 줄(lib/teacher.ts).

import type { Diary } from "./store";

const CONSENT_KEY = "chamjal.aiConsent";
export type Consent = "yes" | "no" | null;

export function getConsent(): Consent {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === "yes" || v === "no" ? v : null;
  } catch {
    return null;
  }
}

export function setConsent(v: "yes" | "no") {
  try {
    localStorage.setItem(CONSENT_KEY, v);
  } catch {
    /* 저장 못 하면 다음에 다시 묻는다 */
  }
}

export async function askTeacher(d: Diary, lateDays = 0, birthday = false): Promise<{ line: string; stickers: string[]; stamp: string; care: boolean } | null> {
  try {
    const res = await fetch("/api/teacher", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weather: d.weather, title: d.title, body: d.body, drew: d.strokes.length > 0, late: lateDays || undefined, birthday: birthday || undefined }),
      signal: AbortSignal.timeout(9000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { line?: string; stickers?: string[]; stamp?: string; care?: boolean };
    if (!data.line) return null;
    return { line: data.line, stickers: data.stickers ?? [], stamp: data.stamp ?? "cham", care: !!data.care };
  } catch {
    return null;
  }
}
