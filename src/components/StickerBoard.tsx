"use client";

// 칭찬 스티커판 (90년대 교실 뒤 칭찬 스티커판처럼): 오늘의 숙제를 낼 때마다 스티커 한 장, 10칸 채우면 한 판.
// 숙제 10·30·100번이면 상장 (서버 lib/server/homework.ts)

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { shortDate } from "@/lib/date";
import type { Homework } from "@/lib/homework";
import { StickerSvg } from "./PraiseStickers";

export default function StickerBoard() {
  const [data, setData] = useState<{ count: number; list: Homework[] } | null>(null);

  useEffect(() => {
    let alive = true;
    api<{ count: number; list: Homework[] }>("/api/homework/mine", { cache: "no-store" })
      .then((d) => alive && setData(d))
      .catch(() => alive && setData({ count: 0, list: [] }));
    return () => {
      alive = false;
    };
  }, []);

  if (!data) return null;
  const n = data.count;
  const cur = n > 0 && n % 10 === 0 ? 10 : n % 10; // 지금 판에 붙은 장수
  const full = Math.floor((n - cur) / 10); // 다 채운 판
  const onBoard = data.list.slice(n - cur);
  const next = n < 10 ? 10 : n < 30 ? 30 : n < 100 ? 100 : null;

  return (
    <section id="stickers" className="sticker-board" aria-label="칭찬 스티커판">
      <h2 className="section-title">칭찬 스티커판</h2>
      <div className="sb-card">
        <p className="sb-title">
          숙제 스티커 <b>{cur}</b>/10
          {full > 0 && <small> · 다 채운 판 {full}장</small>}
        </p>
        <ol className="sb-grid">
          {Array.from({ length: 10 }, (_, i) => {
            const h = onBoard[i];
            return (
              <li key={i} className={h ? "on" : ""} title={h ? `${shortDate(h.date)} · ${h.mission}` : undefined}>
                {h ? <StickerSvg id={h.sticker} size={50} /> : <span className="sb-num">{i + 1}</span>}
              </li>
            );
          })}
        </ol>
        <p className="note">
          {n === 0
            ? "오늘의 숙제를 하고 숙제 검사를 받으면 스티커를 한 장씩 붙여 줘요."
            : next
              ? `숙제를 ${n}번 했어요. 상장까지 ${next - n}번 남았어요.`
              : `숙제를 ${n}번이나 했어요. 숙제 대장이에요!`}
        </p>
      </div>
    </section>
  );
}
