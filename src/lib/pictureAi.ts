// 화면 쪽: AI 그림 = 일기 글로 크레파스 그림 그려 받기 (11-11, 서버 api/picture · lib/server/picture.ts).
// 동의는 이 기기에 한 번 — 선생님 한 줄 동의(teacherAi)와 따로 묻는다(그림은 OpenAI 까지 가서).
// '아니요'는 남기지 않는다: 그림 그려 받기는 누를 때마다 직접 고르는 일이라 다음에 누르면 다시 묻는다.

import { api } from "./api";

const KEY = "chamjal.picConsent";

export function picConsented(): boolean {
  try {
    return localStorage.getItem(KEY) === "yes";
  } catch {
    return false;
  }
}

export function setPicConsented() {
  try {
    localStorage.setItem(KEY, "yes");
  } catch {
    /* 저장 못 하면 다음에 다시 묻는다 */
  }
}

/** 오늘 남은 장수 · 오늘 그려 받은 그림 (다시 깔 수 있게) */
export type PictureStatus = { ready: boolean; left: number; url: string | null };
export const pictureStatus = () => api<PictureStatus>("/api/picture");

/** 일기 글(제목·날씨·본문)로 그림 그려 받기 → 저장소 주소 (bg 에 그대로 넣는다) */
export const drawPicture = (d: { title: string; body: string; weather: string | null }) =>
  api<{ url: string; left: number }>("/api/picture", { method: "POST", json: d });

/** 그림을 그려 달라고 하기에 글이 충분한가 (빈칸 빼고 8자) */
export const enoughForPicture = (title: string, body: string) => (title + body).replace(/\s/g, "").length >= 8;
