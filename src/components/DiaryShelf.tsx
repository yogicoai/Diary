"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { bgById, bgSrc } from "@/lib/backgrounds";
import { renderStrokes } from "@/lib/crayon";
import { shortDate, todayKey } from "@/lib/date";
import { listDiaries, type Diary } from "@/lib/store";
import { BOOK } from "@/lib/business";
import BookSheet from "./BookSheet";
import CardSheet from "./CardSheet";
import DeleteSheet from "./DeleteSheet";
import DiaryActions from "./DiaryActions";
import { DayView, daySorted, MonthView } from "./DiaryViews";
import { BrandMark, PencilIcon, StampSvg } from "./Icons";

const DAY_NAMES = ["월", "화", "수", "목", "금", "토", "일"];

function thisWeek(): string[] {
  const now = new Date();
  const mondayOffset = (now.getDay() + 6) % 7;
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - mondayOffset + i);
    return todayKey(d);
  });
}

function Thumb({ d }: { d: Diary }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    if (!d.strokes.length) return;
    const c = renderStrokes(d.strokes, 320, 240, 0.8);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 캔버스는 브라우저에서만 그릴 수 있다
    setSrc(c.toDataURL("image/png"));
  }, [d]);
  const b = bgById(d.bg);
  return (
    <div className="thumb">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {b && <img src={bgSrc(b.id)} alt="" />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src && <img src={src} alt="" />}
    </div>
  );
}

export default function DiaryShelf() {
  const [list, setList] = useState<Diary[] | null>(null);
  const [week, setWeek] = useState<string[]>([]);
  const [today, setToday] = useState("");
  const [open, setOpen] = useState<Diary | null>(null);
  const [del, setDel] = useState<Diary | null>(null); // 지울까요? 묻는 중인 일기
  const [toast, setToast] = useState<string | null>(null);
  const [bookOpen, setBookOpen] = useState(false);
  const [view, setView] = useState<"grid" | "month" | "day">("grid");
  const [month, setMonth] = useState("");
  const [dayId, setDayId] = useState<string | null>(null);

  const pickView = (v: "grid" | "month" | "day") => {
    setView(v);
    try {
      localStorage.setItem("chamjal.shelfView", v);
    } catch {
      /* 무시 */
    }
  };

  useEffect(() => {
    listDiaries().then(setList);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 이번 주는 기기 시계 기준
    setWeek(thisWeek());
    setToday(todayKey());
    setMonth(todayKey().slice(0, 7));
    try {
      const v = localStorage.getItem("chamjal.shelfView");
      if (v === "month" || v === "day") setView(v);
    } catch {
      /* 기본은 모아 보기 */
    }
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const written = new Set((list ?? []).map((d) => d.date));
  const streak = week.filter((k) => written.has(k)).length;

  return (
    <main className="app">
      <header className="topbar">
        <Link href="/" className="brand" aria-label="참 잘했어요 처음으로">
          <BrandMark className="brand-mark" />
          <span>
            <span className="brand-name">내 일기장</span>
            <span className="brand-sub">{list ? `${list.length}장 썼어요` : " "}</span>
          </span>
        </Link>
        <Link href="/" className="toplink">
          <PencilIcon />
          오늘 쓰기
        </Link>
      </header>

      <section className="week" aria-label={`이번 주 도장 ${streak}개`}>
        {week.map((k, i) => (
          <div key={k} className={`day${k === today ? " today" : ""}`}>
            {DAY_NAMES[i]}
            <div className="slot">{written.has(k) && <StampSvg />}</div>
          </div>
        ))}
      </section>

      {list && (
        <button type="button" className="book-progress" onClick={() => setBookOpen(true)}>
          <span className="bp-head">
            <span>그림일기 책까지</span>
            <b>
              {Math.min(list.length, BOOK.pages)}/{BOOK.pages}장
            </b>
          </span>
          <svg className="bp-bar" viewBox="0 0 300 14" preserveAspectRatio="none" aria-hidden="true">
            <path d="M4 7 Q 75 4 150 7 T 296 7" className="bp-track" />
            <path
              d="M4 7 Q 75 4 150 7 T 296 7"
              className="bp-fill"
              pathLength={100}
              style={{ strokeDasharray: `${(Math.min(list.length, BOOK.pages) / BOOK.pages) * 100} 100` }}
            />
          </svg>
          <span className="bp-more">책으로 받기 알아보기</span>
        </button>
      )}

      {list && list.length === 0 && (
        <div className="empty">
          아직 쓴 일기가 없어요.
          <br />
          오늘 첫 장을 써 볼까요?
          <Link href="/" className="btn" style={{ marginTop: 18 }}>
            오늘 쓰기
          </Link>
        </div>
      )}

      {!!list?.length && (
        <div className="tabs" role="tablist" aria-label="일기장 보기" style={{ marginTop: 14 }}>
          {(
            [
              ["grid", "모아 보기"],
              ["month", "달력"],
              ["day", "하루씩"],
            ] as const
          ).map(([v, n]) => (
            <button key={v} type="button" role="tab" aria-selected={view === v} className="tab-btn" onClick={() => pickView(v)}>
              {n}
            </button>
          ))}
        </div>
      )}

      {view === "month" && list && month && (
        <MonthView
          list={list}
          month={month}
          today={today}
          onMonth={setMonth}
          onPick={(d) => {
            setDayId(d.id);
            pickView("day");
          }}
        />
      )}
      {view === "day" && list && list.length > 0 && (
        <DayView list={list} current={dayId} onCurrent={setDayId} onOpenCard={setOpen} onDelete={setDel} />
      )}

      <div className="shelf" hidden={view !== "grid"}>
        {(list ?? []).map((d) => (
          <button key={d.id} type="button" className="mini" onClick={() => setOpen(d)}>
            <Thumb d={d} />
            <div className="when">{shortDate(d.date)}</div>
            <div className="ttl">{d.title || d.body.slice(0, 10) || "그림만 그린 날"}</div>
            <StampSvg className="mini-stamp" />
            {d.board?.status === "visible" && <span className="mini-badge">게시판</span>}
            {!!d.classIds?.length && <span className="mini-badge cls">우리 반</span>}
          </button>
        ))}
      </div>

      <CardSheet
        diary={open}
        onClose={() => setOpen(null)}
        onToast={setToast}
        extra={
          open ? (
            <DiaryActions
              diary={open}
              onChange={(d) => {
                setOpen(d);
                setList((l) => (l ?? []).map((x) => (x.id === d.id ? d : x)));
              }}
              onToast={setToast}
            />
          ) : null
        }
        onDelete={() => open && setDel(open)}
      />
      <DeleteSheet
        diary={del}
        onClose={() => setDel(null)}
        onToast={setToast}
        onDeleted={(d) => {
          // 하루씩 보던 중이면 옆 장(다음, 없으면 이전)으로
          if (view === "day" && list) {
            const sorted = daySorted(list);
            const i = sorted.findIndex((x) => x.id === d.id);
            setDayId((sorted[i + 1] ?? sorted[i - 1])?.id ?? null);
          }
          setList((l) => (l ?? []).filter((x) => x.id !== d.id));
          setOpen((o) => (o?.id === d.id ? null : o));
          setDel(null);
        }}
      />
      <BookSheet open={bookOpen} onClose={() => setBookOpen(false)} count={list?.length ?? 0} />
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </main>
  );
}
