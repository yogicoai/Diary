// 이 기기의 기본 설정 ("나" → 기본 설정). 서버로 가지 않는다.

import { BACKGROUNDS, defaultBg } from "./backgrounds";

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

// 넓은 화면(PC) 일기장 뒤 배경
export const WEB_BGS = [
  { id: "theme", name: "일기장에 맞춤" },
  { id: "doodle", name: "크라프트 낙서" },
  { id: "town", name: "크레파스 동네" },
  { id: "desk", name: "교실 책상" },
  { id: "random", name: "그때그때 바뀜" },
  { id: "mine", name: "내 그림으로" },
] as const;
export type WebBgId = (typeof WEB_BGS)[number]["id"];
const WEB_KEY = "chamjal.webBg";

export function webBg(): WebBgId {
  try {
    const v = localStorage.getItem(WEB_KEY);
    if (v && WEB_BGS.some((b) => b.id === v)) return v as WebBgId;
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
