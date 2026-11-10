// 이 기기의 기본 설정 ("나" → 기본 설정). 서버로 가지 않는다.

import { BACKGROUNDS, defaultBg } from "./backgrounds";
import { webBackdropById } from "./webBackdrops";

const BG_KEY = "chamjal.defaultBg";

/** 새 일기의 처음 배경. "none" = 직접 그리기(흰 종이), 없으면 목록 기본값 */
export function preferredBg(): string | null {
  try {
    const v = localStorage.getItem(BG_KEY);
    if (v === "none") return null;
    if (v && BACKGROUNDS.some((b) => b.id === v)) return v;
  } catch {
    /* 못 읽으면 기본값 */
  }
  return defaultBg();
}

export function setPreferredBg(id: string | null) {
  try {
    localStorage.setItem(BG_KEY, id ?? "none");
  } catch {
    /* 무시 */
  }
}

// 넓은 화면(PC) 일기장 뒤 배경: 그림 하나(lib/webBackdrops.ts 의 id) 또는 아래 세 가지
export const WEB_BG_MODES = [
  { id: "theme", name: "일기장에 맞춤" }, // 테마마다 정해진 그림 (CSS)
  { id: "random", name: "그때그때 바뀜" }, // 들어올 때마다 그림 전부 중에서
  { id: "mine", name: "내 그림으로" }, // 내가 그린 일기 그림들을 양옆에 붙인 책상
] as const;
export type WebBgId = string;
const WEB_KEY = "chamjal.webBg";

export function webBg(): WebBgId {
  try {
    const v = localStorage.getItem(WEB_KEY);
    if (v && (WEB_BG_MODES.some((b) => b.id === v) || webBackdropById(v))) return v;
  } catch {
    /* 기본값 */
  }
  return "theme";
}

export function setWebBg(id: WebBgId) {
  try {
    localStorage.setItem(WEB_KEY, id);
  } catch {
    /* 무시 */
  }
  window.dispatchEvent(new Event("chamjal:webbg"));
}

// 처음 온 사람 인트로(표지 → 쓰는 법 → 이름표)를 이 기기에서 봤나. 로그인했거나 "로그인 없이 써 볼게요"를 누르면 봤다고 적는다.
const INTRO_KEY = "chamjal.intro";

export function introSeen(): boolean {
  try {
    return localStorage.getItem(INTRO_KEY) === "1";
  } catch {
    return true; // 저장소를 못 쓰는 브라우저는 인트로를 매번 보여 주지 않는다
  }
}

export function setIntroSeen() {
  try {
    localStorage.setItem(INTRO_KEY, "1");
  } catch {
    /* 무시 */
  }
}

// 표지(겉표지)는 그날 처음 열 때 한 번 (11-09 사용자: "처음 접근 시 겉표지가 나와야"). 같은 날 다시 오면 바로 쓰기.
const COVER_KEY = "chamjal.coverDay";

function localDay(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function coverShownToday(): boolean {
  try {
    return localStorage.getItem(COVER_KEY) === localDay();
  } catch {
    return true;
  }
}

export function markCoverToday() {
  try {
    localStorage.setItem(COVER_KEY, localDay());
  } catch {
    /* 무시 */
  }
}
