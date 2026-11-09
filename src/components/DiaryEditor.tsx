"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { defaultBg } from "@/lib/backgrounds";
import type { Stroke } from "@/lib/crayon";
import { koreanDate, todayKey } from "@/lib/date";
import { useMe } from "@/lib/me";
import { topicOf } from "@/lib/social";
import { pushDiary } from "@/lib/sync";
import { saveDiary, track, type Diary } from "@/lib/store";
import { rowSpans } from "@/lib/manuscript";
import { teacherLine } from "@/lib/teacher";
import { askTeacher, getConsent, setConsent } from "@/lib/teacherAi";
import type { WeatherId } from "@/lib/weather";
import AiSheet from "./AiSheet";
import CardSheet from "./CardSheet";
import ConsentSheet from "./ConsentSheet";
import MineSheet from "./MineSheet";
import DiaryActions from "./DiaryActions";
import CrayonPad from "./CrayonPad";
import { BrandMark, StampSvg } from "./Icons";
import Manuscript, { READ_MS } from "./Manuscript";
import ThemePicker from "./ThemePicker";
import TopicBanner from "./TopicBanner";
import WeatherPicker from "./WeatherPicker";

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export default function DiaryEditor() {
  const { me } = useMe();
  const [topicOn, setTopicOn] = useState(false); // 오늘의 숙제로 쓰기
  const [date, setDate] = useState<string | null>(null);
  const [weather, setWeather] = useState<WeatherId | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [bg, setBg] = useState<string | null>(defaultBg());
  const [secret, setSecret] = useState(false);
  const [done, setDone] = useState<Diary | null>(null);
  const [reading, setReading] = useState(false); // 선생님이 읽는 중
  const [cardOf, setCardOf] = useState<Diary | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [consentOpen, setConsentOpen] = useState(false);
  const [mineOpen, setMineOpen] = useState(false);
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

  // 처음 낼 때 한 번: 선생님(Claude)이 직접 읽어도 되는지 묻는다
  const submit = () => {
    if (!canSubmit || !date) return;
    if (getConsent() === null) {
      setConsentOpen(true);
      return;
    }
    void handIn(getConsent() === "yes");
  };

  const handIn = async (useAi: boolean) => {
    if (!date) return;
    const draft: Diary = {
      id: newId(),
      date,
      weather,
      title: title.trim(),
      body: body.trim(),
      strokes,
      bg,
      teacher: teacherLine(body + title, weather), // Claude 가 못 쓰면 이 한 줄
      teacherBy: "rule",
      secret,
      topic: topicOn ? date : null,
      createdAt: Date.now(),
    };
    setDone(draft);
    setReading(true);
    // 1) 선생님이 한 줄씩 읽으며 밑줄을 긋는다 (그동안 Claude 가 한 줄을 쓴다)
    requestAnimationFrame(() =>
      document.querySelector(".manuscript")?.scrollIntoView({ behavior: "smooth", block: "center" }),
    );
    const lines = rowSpans(draft.body).filter((n) => n > 0).length;
    const readFor = Math.max(1100, lines * READ_MS + 600);
    const [, ai] = await Promise.all([
      new Promise((r) => setTimeout(r, readFor)),
      useAi ? askTeacher(draft) : Promise.resolve(null),
    ]);
    const d: Diary = ai ? { ...draft, teacher: ai.line, teacherBy: "ai", care: ai.care } : draft;
    try {
      await saveDiary(d);
    } catch {
      setToast("이 기기에 저장하지 못했어요. 카드로는 남길 수 있어요");
    }
    // 이름표가 있으면 서버에도 보관 (개근상도 여기서 받는다)
    if (me) {
      pushDiary(d)
        .then((res) => {
          setDone((cur) => (cur && cur.id === d.id ? { ...cur, serverId: res.diary.serverId } : cur));
          if (res.awards.length) setToast(`${res.awards[0].label}을 받았어요! 나 › 상장함`);
        })
        .catch(() => {});
    }
    track("diary_created", { weather, chars: d.body.length, drew: strokes.length > 0, bg, by: d.teacherBy });
    // 2) 다 읽으면 도장 쾅 (도장이 종이에 닿는 0.3초쯤 짧게 진동)
    setDone(d);
    setReading(false);
    setTimeout(() => navigator.vibrate?.([14, 50, 26]), 280);
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
    setTopicOn(false);
    setDone(null);
    setReading(false);
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
        <Link href={me ? "/me" : "/login?next=/"} className="toplink nametag-link">
          {me ? me.nickname : "이름표 만들기"}
        </Link>
      </header>

      <TopicBanner date={date} on={topicOn} onToggle={() => setTopicOn((v) => !v)} locked={locked} />

      <article className={`page${done && !reading ? " stamped" : ""}`} aria-label="오늘의 그림일기">
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
          onPickMine={() => setMineOpen(true)}
        />

        <div className="title-row">
          <label htmlFor="title">제목</label>
          <input
            id="title"
            value={title}
            maxLength={16}
            placeholder={topicOn && date ? topicOf(date) : "드디어 금요일"}
            onChange={(e) => setTitle(e.target.value)}
            readOnly={locked}
            autoComplete="off"
          />
        </div>

        <Manuscript value={body} onChange={setBody} readOnly={locked} checked={!!done} />

        {done && reading && (
          <div className="teacher" id="teacher">
            <div className="teacher-reading" role="status">
              {done.body ? "선생님이 읽고 있어요" : "선생님이 그림을 보고 있어요"}
              <span className="dots" />
            </div>
          </div>
        )}
        {done && !reading && (
          <div className="teacher" id="teacher">
            <div className="teacher-line writing">{done.teacher}</div>
            <StampSvg className="stamp landing" />
          </div>
        )}
        {done && !reading && done.care && (
          <p className="care-note">
            마음이 많이 힘들면 혼자 견디지 말고 <a href="tel:109">109</a>(자살예방 상담전화, 24시간)에 전화해 주세요.
          </p>
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
      ) : reading ? null : (
        <>
          <button type="button" className="btn" onClick={() => setCardOf(done)}>
            카드로 만들어 자랑하기
          </button>
          <DiaryActions diary={done} onChange={setDone} onToast={setToast} />
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

      <p className="note">
        {me
          ? "이름표가 있어서 일기가 이 기기와 서버에 함께 보관돼요. 게시판과 우리 반에는 직접 보낼 때만 올라가요."
          : "일기는 이 기기에만 저장돼요. 이름표를 만들면 게시판에 붙이고 우리 반과 나눌 수 있어요."}
      </p>

      <h2 className="section-title">일기장 바꾸기</h2>
      <ThemePicker />

      <AiSheet open={aiOpen} onClose={() => setAiOpen(false)} />
      <MineSheet
        open={mineOpen}
        onClose={() => setMineOpen(false)}
        onPick={(d) => {
          if (strokes.length && !confirm("지금 그린 그림 대신 이 그림을 가져올까요?")) return;
          setBg(d.bg ?? null);
          setStrokes(d.strokes.map((st) => ({ ...st, points: [...st.points] })));
          setMineOpen(false);
          track("mine_reuse");
        }}
      />
      <ConsentSheet
        open={consentOpen}
        onAnswer={(yes) => {
          setConsent(yes ? "yes" : "no");
          setConsentOpen(false);
          track("ai_consent", { yes });
          void handIn(yes);
        }}
        onClose={() => setConsentOpen(false)}
      />
      <CardSheet diary={cardOf} onClose={() => setCardOf(null)} onToast={setToast} />
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </main>
  );
}
