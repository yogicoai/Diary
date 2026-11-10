"use client";

// 그림일기장 표지 그림 (11-10 사용자: "표지 그림을 내가 그린 그림으로도 바꿀 수 있게").
// 기본은 크레파스 학교 운동장. 내 일기 하나를 고르면 그 그림(배경 + 크레파스)을 표지에 붙인다.
// 이 기기 설정(localStorage chamjal.coverPic = 일기 id). 그 일기를 지우면 다시 기본 그림.

import { useEffect, useState } from "react";
import { getDiary, onDiariesChange } from "./store";
import { renderThumb } from "./thumb";

const KEY = "chamjal.coverPic";
const EVENT = "chamjal:coverpic";

export function coverPicId(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setCoverPic(id: string | null) {
  try {
    if (id) localStorage.setItem(KEY, id);
    else localStorage.removeItem(KEY);
  } catch {
    /* 못 적으면 이번만 */
  }
  window.dispatchEvent(new Event(EVENT));
}

/** 표지에 붙일 내 그림 (그림 주소). 안 골랐거나 그 일기가 없으면 null = 기본 학교 운동장 */
export function useCoverPic(w = 800, h = 600): { id: string | null; src: string | null } {
  const [pic, setPic] = useState<{ id: string | null; src: string | null }>({ id: null, src: null });
  useEffect(() => {
    let alive = true;
    const load = async () => {
      const id = coverPicId();
      const d = id ? await getDiary(id).catch(() => undefined) : undefined;
      const src = d && (d.strokes.length > 0 || d.bg) ? (await renderThumb(d, w, h)).toDataURL("image/webp", 0.86) : null;
      if (alive) setPic({ id: src ? id : null, src });
    };
    void load();
    window.addEventListener(EVENT, load);
    const off = onDiariesChange(() => void load()); // 다른 계정으로 바뀌면 그 사람 그림으로 (없으면 기본)
    return () => {
      alive = false;
      window.removeEventListener(EVENT, load);
      off();
    };
  }, [w, h]);
  return pic;
}
