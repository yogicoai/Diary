"use client";

// 밀린 숙제 하기: 지난 날짜 일기 쓰기 (최근 90일). 방학 끝나기 전날 밤 몰아 쓰던 그 느낌.

import { useMemo } from "react";
import { koreanDate, todayKey } from "@/lib/date";
import Sheet from "./Sheet";

export function daysBetween(from: string, to: string): number {
  const [a, b] = [from, to].map((k) => {
    const [y, m, d] = k.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  });
  return Math.max(0, Math.round((b - a) / 86400000));
}

function shift(key: string, n: number) {
  const [y, m, d] = key.split("-").map(Number);
  return todayKey(new Date(y, m - 1, d + n));
}

export default function LateSheet({
  open,
  today,
  value,
  onClose,
  onPick,
}: {
  open: boolean;
  today: string | null;
  value: string | null;
  onClose: () => void;
  onPick: (key: string) => void;
}) {
  const quick = useMemo(() => (today ? [0, 1, 2, 3].map((n) => shift(today, -n)) : []), [today]);
  if (!today) return null;
  const min = shift(today, -90);
  return (
    <Sheet open={open} onClose={onClose} label="밀린 숙제 하기">
      <h2>밀린 숙제 하기</h2>
      <p>못 쓴 날이 있었나요? 개학 전날 밤처럼 몰아서 써도 괜찮아요. 선생님이 눈감아 줄게요(아마도).</p>
      <div className="late-quick">
        {quick.map((k, i) => (
          <button key={k} type="button" className={`tab-btn${k === value ? " on" : ""}`} aria-pressed={k === value} onClick={() => onPick(k)}>
            {["오늘", "어제", "그저께", "사흘 전"][i]}
          </button>
        ))}
      </div>
      <label className="late-date">
        다른 날 고르기
        <input type="date" min={min} max={today} value={value ?? today} onChange={(e) => e.target.value && onPick(e.target.value)} />
      </label>
      {value && value < today && <p className="note">{koreanDate(value)} 일기를 써요. 밀린 숙제는 그림일기 책 장수에는 들어가지만 개근상에는 안 들어가요. 선생님은 다 알아요.</p>}
    </Sheet>
  );
}
