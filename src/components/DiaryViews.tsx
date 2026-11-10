"use client";

// 내 일기장 보기: 달력(월별) / 하루씩(일기장 한 쪽 그대로 넘겨 보기)

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { koreanDate } from "@/lib/date";
import { useMe } from "@/lib/me";
import { isBirthday } from "@/lib/social";
import type { Diary } from "@/lib/store";
import { renderThumb } from "@/lib/thumb";
import CrayonPad from "./CrayonPad";
import { CakeIcon, StampSvg } from "./Icons";
import Manuscript from "./Manuscript";
import PraiseStickers from "./PraiseStickers";
import ReadAloud from "./ReadAloud";
import WeatherPicker from "./WeatherPicker";

const WEEK = ["일", "월", "화", "수", "목", "금", "토"];

function CellThumb({ d }: { d: Diary }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    renderThumb(d, 120, 90).then((c) => alive && setSrc(c.toDataURL("image/webp", 0.75)));
    return () => {
      alive = false;
    };
  }, [d]);
  // eslint-disable-next-line @next/next/no-img-element
  return src ? <img src={src} alt="" /> : null;
}

/** 달력: month = "YYYY-MM" */
export function MonthView({
  list,
  month,
  today,
  onMonth,
  onPick,
}: {
  list: Diary[];
  month: string;
  today: string;
  onMonth: (m: string) => void;
  onPick: (d: Diary) => void;
}) {
  const router = useRouter();
  const { me } = useMe(); // 생일 날짜에 케이크 (11-10 사용자: 생일을 날짜에도 표시)
  const [y, m] = month.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const days = new Date(y, m, 0).getDate();
  const lead = first.getDay();
  const byDate = new Map<string, Diary[]>();
  for (const d of list) {
    if (!d.date.startsWith(month)) continue;
    byDate.set(d.date, [...(byDate.get(d.date) ?? []), d]);
  }
  const shift = (n: number) => {
    const t = new Date(y, m - 1 + n, 1);
    onMonth(`${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}`);
  };
  const count = [...byDate.values()].reduce((a, b) => a + b.length, 0);

  return (
    <section className="month" aria-label={`${y}년 ${m}월 일기`}>
      <div className="month-head">
        <button type="button" className="tool" aria-label="지난달" onClick={() => shift(-1)}>
          ‹
        </button>
        <b>
          {y}년 {m}월
        </b>
        <button type="button" className="tool" aria-label="다음 달" onClick={() => shift(1)}>
          ›
        </button>
      </div>
      <p className="month-count">이번 달 {count}장 썼어요</p>
      <div className="cal">
        {WEEK.map((w, i) => (
          <span key={w} className={`cal-w${i === 0 ? " sun" : ""}`}>
            {w}
          </span>
        ))}
        {Array.from({ length: lead }, (_, i) => (
          <span key={`e${i}`} />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const key = `${month}-${String(i + 1).padStart(2, "0")}`;
          const ds = byDate.get(key);
          const bday = isBirthday(me?.birth, key);
          return (
            <button
              key={key}
              type="button"
              className={`cal-day${ds ? " has" : ""}${key === today ? " today" : ""}${bday ? " bday" : ""}`}
              disabled={!ds && key > today}
              onClick={() => (ds ? onPick(ds[0]) : router.push(`/?date=${key}`))}
              aria-label={`${m}월 ${i + 1}일${bday ? " 생일" : ""}${ds ? ` 일기 ${ds.length}장` : ""}`}
            >
              <span className="cal-n">{i + 1}</span>
              {bday && <CakeIcon className="cal-cake" />}
              {ds && (
                <span className="cal-art">
                  <CellThumb d={ds[0]} />
                  <StampSvg className="cal-stamp" stamp={ds[0].stamp} />
                </span>
              )}
              {ds && ds.length > 1 && <span className="cal-more">+{ds.length - 1}</span>}
              {!ds && key < today && <span className="cal-late">밀린 숙제</span>}
            </button>
          );
        })}
      </div>
    </section>
  );
}

/** 하루씩 보기 순서 (옛날 → 최근, 같은 날은 쓴 순서) */
export function daySorted(list: Diary[]): Diary[] {
  return [...list].sort((a, b) => (a.date === b.date ? a.createdAt - b.createdAt : a.date < b.date ? -1 : 1));
}

/** 하루씩: 날짜 순으로 한 장씩 넘긴다 (옛날 → 최근) */
export function DayView({
  list,
  current,
  onCurrent,
  onOpenCard,
  onDelete,
}: {
  list: Diary[];
  current: string | null;
  onCurrent: (id: string) => void;
  onOpenCard: (d: Diary) => void;
  onDelete: (d: Diary) => void;
}) {
  const { me } = useMe();
  const sorted = daySorted(list);
  const idx = Math.max(0, current ? sorted.findIndex((d) => d.id === current) : sorted.length - 1);
  const d = sorted[idx];
  const touch = useRef<number | null>(null);
  if (!d) return null;
  const go = (n: number) => {
    const next = sorted[idx + n];
    if (next) onCurrent(next.id);
  };

  return (
    <section
      className="dayview"
      onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touch.current === null) return;
        const dx = e.changedTouches[0].clientX - touch.current;
        touch.current = null;
        if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1);
      }}
    >
      <div className="day-nav">
        <button type="button" className="tool" onClick={() => go(-1)} disabled={idx === 0}>
          ‹ 이전
        </button>
        <span>
          {idx + 1} / {sorted.length}
        </span>
        <button type="button" className="tool" onClick={() => go(1)} disabled={idx === sorted.length - 1}>
          다음 ›
        </button>
      </div>
      <article key={d.id} className="page turn" aria-label={`${koreanDate(d.date)} 그림일기`}>
        <div className="page-head">
          <div className="page-date">
            {koreanDate(d.date)}
            {isBirthday(me?.birth, d.date) && (
              <span className="bday-tag">
                <CakeIcon />
                생일
              </span>
            )}
          </div>
          <WeatherPicker value={d.weather} onChange={() => {}} readOnly />
        </div>
        <CrayonPad strokes={d.strokes} bg={d.bg} onChange={() => {}} readOnly />
        <div className="title-row">
          <label>제목</label>
          <input value={d.title} readOnly aria-label="제목" />
        </div>
        <div className="manu-wrap">
          <Manuscript value={d.body} onChange={() => {}} readOnly checked />
          {!!d.stickers?.length && <PraiseStickers ids={d.stickers} />}
        </div>
        <div className="teacher">
          <div className="teacher-line">{d.teacher}</div>
          <StampSvg className="stamp" stamp={d.stamp} />
        </div>
      </article>
      <ReadAloud key={`read-${d.id}`} diary={d} />
      <button type="button" className="btn plain" onClick={() => onOpenCard(d)}>
        카드로 보기 · 보내기
      </button>
      <p className="erase-row">
        <button type="button" className="linkish" onClick={() => onDelete(d)}>
          이 일기 지우기
        </button>
      </p>
    </section>
  );
}
