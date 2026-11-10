"use client";

// 숙제 검사 (화면): 그날 숙제·내 숙제 불러오기, 사진 줄이기 (올리기 전에 기기에서 webp 로)

import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import { canvasBlob } from "./thumb";
import type { Topic } from "./topics";

export type Homework = {
  id: string;
  date: string;
  mission: string;
  text: string;
  photoUrl: string | null;
  thumbUrl: string | null;
  sticker: string;
  share: boolean;
  status: "visible" | "pending" | "hidden";
  at: number;
  nameTag?: string;
};

export type HomeworkDay = {
  date: string;
  today: string;
  mission: Topic;
  mine: Homework | null;
  count: number;
  shared: Homework[];
  noServer?: boolean;
};

export type HomeworkResult = { homework: Homework; first: boolean; count: number; monthCount: number; awards: { label: string; detail: string }[] };

/** 그날 숙제 + 내 숙제 + 보여 주기 숙제들. date 가 없으면 서버의 오늘 */
export function useHomework(date: string | null | undefined, enabled = true) {
  const [data, setData] = useState<HomeworkDay | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    api<HomeworkDay>(`/api/homework${date ? `?date=${date}` : ""}`, { cache: "no-store" })
      .then((d) => alive && setData(d))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [date, enabled, tick]);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data: data && (!date || data.date === date) ? data : null, reload };
}

/** 사진을 긴 쪽 max px 로 줄여 webp 로 (휴대폰 사진 방향도 바로잡는다) */
export async function shrinkImage(file: Blob, max: number, quality = 0.82): Promise<Blob> {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const w = Math.max(1, Math.round(bmp.width * k));
  const h = Math.max(1, Math.round(bmp.height * k));
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  c.getContext("2d")!.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  return canvasBlob(c, "image/webp", quality);
}

export async function submitHomework(input: { date: string; text: string; share: boolean; photo: Blob | null }): Promise<HomeworkResult> {
  const form = new FormData();
  form.set("date", input.date);
  form.set("text", input.text);
  form.set("share", input.share ? "1" : "0");
  if (input.photo) {
    const [photo, thumb] = await Promise.all([shrinkImage(input.photo, 1280), shrinkImage(input.photo, 480, 0.8)]);
    form.set("photo", photo, "photo.webp");
    form.set("thumb", thumb, "thumb.webp");
  }
  return api<HomeworkResult>("/api/homework", { method: "POST", body: form });
}
