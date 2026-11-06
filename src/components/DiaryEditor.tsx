"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { defaultBg } from "@/lib/backgrounds";
import type { Stroke } from "@/lib/crayon";
import { koreanDate, todayKey } from "@/lib/date";
import { saveDiary, track, type Diary } from "@/lib/store";
import { teacherLine } from "@/lib/teacher";
import type { WeatherId } from "@/lib/weather";
import AiSheet from "./AiSheet";
import CardSheet from "./CardSheet";
import CrayonPad from "./CrayonPad";
import { BrandMark, NotebookIcon, StampSvg } from "./Icons";
import Manuscript from "./Manuscript";
import ThemePicker from "./ThemePicker";
import WeatherPicker from "./WeatherPicker";

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export default function DiaryEditor() {
  const [date, setDate] = useState<string | null>(null);
  const [weather, setWeather] = useState<WeatherId | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [bg, setBg] = useState<string | null>(defaultBg());
  const [secret, setSecret] = useState(false);
  const [done, setDone] = useState<Diary | null>(null);
  const [cardOf, setCardOf] = useState<Diary | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // 날짜는 브라우저에서만 정한다 (서버 시간과 어긋나지 않게)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 오늘 날짜는 기기 시계 기준
    setDate(todayKey());
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const canSubmit = body.trim().length > 0 || strokes.length > 0;

  const submit = async () => {
    if (!canSubmit || !date) return;
    const d: Diary = {
      id: newId(),
      date,
      weather,
      title: title.trim(),
      body: body.trim(),
      strokes,
      bg,
      teacher: teacherLine(body + title, weather),
      secret,
      createdAt: Date.now(),
    };
    try {
      await saveDiary(d);
    } catch {
      setToast("이 기기에 저장하지 못했어요. 카드로는 남길 수 있어요");
    }
    track("diary_created", { weather, chars: d.body.length, drew: strokes.length > 0, bg });
    setDone(d);
    requestAnimationFrame(() =>
      document.getElementById("teacher")?.scrollIntoView({ behavior: "smooth", block: "center" }),
    );
  };

  const restart = useCallback(() => {
    setWeather(null);
    setTitle("");
    setBody("");
    setStrokes([]);
    setBg(defaultBg());
    setSecret(false);
    setDone(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const locked = !!done;

  return (
    <main className="app">
      <header className="topbar">
        <Link href="/" className="brand" aria-label="참 잘했어요 처음으로">
          <BrandMark className="brand-mark" />
          <span>
            <span className="brand-name">참 잘했어요</span>
            <span className="brand-sub">어른이 그림일기</span>
          </span>
        </Link>
        <Link href="/diary" className="toplink">
          <NotebookIcon />내 일기장
        </Link>
      </header>

      <article className="page" aria-label="오늘의 그림일기">
        <div className="page-head">
          <div className="page-date">{date ? koreanDate(date) : ""}</div>
          <WeatherPicker value={weather} onChange={setWeather} readOnly={locked} />
        </div>

        <CrayonPad
          strokes={strokes}
          onChange={setStrokes}
          bg={bg}
          onBg={setBg}
          readOnly={locked}
          onAskAi={() => setAiOpen(true)}
        />

        <div className="title-row">
          <label htmlFor="title">제목</label>
          <input
            id="title"
            value={title}
            maxLength={16}
            placeholder="드디어 금요일"
            onChange={(e) => setTitle(e.target.value)}
            readOnly={locked}
            autoComplete="off"
          />
        </div>

        <Manuscript value={body} onChange={setBody} readOnly={locked} />

        {done && (
          <div className="teacher" id="teacher">
            <div className="teacher-line writing">{done.teacher}</div>
            <StampSvg className="stamp landing" />
          </div>
        )}
      </article>

      {!done ? (
        <>
          <div style={{ marginTop: 12, padding: "0 4px" }}>
            <label className="check">
              <input type="checkbox" checked={secret} onChange={(e) => setSecret(e.target.checked)} />
              <span className="box">
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M3 8.5 6.5 12 13 4" />
                </svg>
              </span>
              <span style={{ fontSize: 14 }}>비밀 일기 (보낼 때 글씨는 크레파스로 가려요)</span>
            </label>
          </div>
          <button type="button" className="btn" disabled={!canSubmit} onClick={submit}>
            선생님께 내기
          </button>
        </>
      ) : (
        <>
          <button type="button" className="btn" onClick={() => setCardOf(done)}>
            카드로 만들어 자랑하기
          </button>
          <div className="btn-row">
            <Link href="/diary" className="btn plain">
              내 일기장 보기
            </Link>
            <button type="button" className="btn plain" onClick={restart}>
              새로 쓰기
            </button>
          </div>
        </>
      )}

      <p className="note">일기는 이 기기에만 저장돼요. 카드로 보낼 때만 그림이 밖으로 나가요.</p>

      <h2 className="section-title">일기장 바꾸기</h2>
      <ThemePicker />

      <AiSheet open={aiOpen} onClose={() => setAiOpen(false)} />
      <CardSheet diary={cardOf} onClose={() => setCardOf(null)} onToast={setToast} />
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </main>
  );
}
