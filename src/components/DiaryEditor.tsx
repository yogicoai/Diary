"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { defaultBg } from "@/lib/backgrounds";
import type { Stroke } from "@/lib/crayon";
import { koreanDate, todayKey } from "@/lib/date";
import { useMe } from "@/lib/me";
import { stampThump, underlineSwish } from "@/lib/feel";
import { preferredBg } from "@/lib/prefs";
import { useHomework } from "@/lib/homework";
import { useTopic } from "@/lib/useTopic";
import { pushDiary } from "@/lib/sync";
import { api } from "@/lib/api";
import { saveDiary, track, type Diary } from "@/lib/store";
import { rowSpans } from "@/lib/manuscript";
import { isBirthday } from "@/lib/social";
import { teacherReply } from "@/lib/teacher";
import { askTeacher, getConsent, setConsent } from "@/lib/teacherAi";
import type { WeatherId } from "@/lib/weather";
import CardSheet from "./CardSheet";
import ConsentSheet from "./ConsentSheet";
import DeleteSheet from "./DeleteSheet";
import MineSheet from "./MineSheet";
import DiaryActions from "./DiaryActions";
import CrayonPad from "./CrayonPad";
import { BrandMark, CakeIcon, StampSvg, ColorWord } from "./Icons";
import Manuscript, { READ_MS } from "./Manuscript";
import LateSheet, { daysBetween } from "./LateSheet";
import PraiseStickers from "./PraiseStickers";
import ReadAloud from "./ReadAloud";
import HomeworkSheet from "./HomeworkSheet";
import TopicBanner from "./TopicBanner";
import WeatherPicker from "./WeatherPicker";

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export default function DiaryEditor() {
  const { me } = useMe();
  const [hwOpen, setHwOpen] = useState(false); // 오늘의 숙제(어른이 미션) 검사 시트
  const [date, setDate] = useState<string | null>(null);
  const [today, setToday] = useState<string | null>(null);
  const [lateOpen, setLateOpen] = useState(false);
  // 우리 반에서 "숙제하러 가기"로 왔을 때: 반 숙제를 보여 주고, 다 쓰면 그 반에 낸다
  const [classCtx, setClassCtx] = useState<{ id: string; name: string; homework: string | null } | null>(null);
  const [weather, setWeather] = useState<WeatherId | null>(null);
  const topic = useTopic(date); // 그날 숙제 (선생님이 건 숙제 → 그날만의 숙제 → 요일 숙제)
  const hw = useHomework(date && date === today ? date : null, !!date && date === today); // 오늘 숙제 검사 (내가 냈나·몇 명이 했나)
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [bg, setBg] = useState<string | null>(defaultBg());
  const [secret, setSecret] = useState(false);
  const [done, setDone] = useState<Diary | null>(null);
  const [reading, setReading] = useState(false); // 선생님이 읽는 중
  const [cardOf, setCardOf] = useState<Diary | null>(null);
  const [del, setDel] = useState<Diary | null>(null); // 다 쓴 일기 지우기 (지울까요? 묻는 중)
  const [consentOpen, setConsentOpen] = useState(false);
  const [mineOpen, setMineOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // 날짜는 브라우저에서만 정한다 (서버 시간과 어긋나지 않게)
  useEffect(() => {
    const t = todayKey();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 오늘 날짜는 기기 시계 기준
    setToday(t);
    // 달력에서 지난 날을 눌러 왔으면 그날 일기 (밀린 숙제), 아니면 오늘
    const want = new URLSearchParams(location.search).get("date");
    setDate(want && /^\d{4}-\d{2}-\d{2}$/.test(want) && want <= t ? want : t);
    // 처음 배경은 "나 → 기본 설정"에서 고른 것
    setBg(preferredBg());
    const cls = new URLSearchParams(location.search).get("class");
    if (cls && /^[a-f0-9]{24}$/.test(cls)) {
      api<{ class: { id: string; name: string }; homework: string | null }>(`/api/classes/${cls}`)
        .then((r) => setClassCtx({ id: r.class.id, name: r.class.name, homework: r.homework }))
        .catch(() => {});
    }
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
    const lateDays = today ? daysBetween(date, today) : 0;
    // 일기 날짜가 내 생일이면 선생님이 축하한다 (11-10 사용자: "생일 날짜에는 선생님이 축하 메시지를")
    const bday = !!me?.birth && isBirthday(me.birth, date);
    const fallback = bday
      ? { line: "생일 축하해요! 생일에 쓴 일기라 도장을 두 번 찍고 싶어요.", stickers: ["bravo", "best"], stamp: "best" }
      : lateDays > 0
        ? { line: "밀린 숙제 발견! 개학 전날 밤 냄새가 나는데요? 그래도 냈으니 통과예요.", stickers: ["bravo", "laugh"], stamp: "cham" }
        : teacherReply(body + title, weather);
    const draft: Diary = {
      id: newId(),
      date,
      weather,
      title: title.trim(),
      body: body.trim(),
      strokes,
      bg,
      teacher: fallback.line, // Claude 가 못 쓰면 이 답장
      stickers: fallback.stickers,
      stamp: fallback.stamp,
      late: lateDays > 0,
      teacherBy: "rule",
      secret,
      createdAt: Date.now(),
    };
    setDone(draft);
    setReading(true);
    // 1) 선생님이 한 줄씩 읽으며 밑줄을 긋는다 (그동안 Claude 가 한 줄을 쓴다)
    requestAnimationFrame(() =>
      document.querySelector(".manuscript")?.scrollIntoView({ behavior: "smooth", block: "center" }),
    );
    const lines = rowSpans(draft.body).filter((n) => n > 0).length;
    for (let i = 0; i < lines; i++) setTimeout(() => underlineSwish(), i * READ_MS + 40);
    const readFor = Math.max(1100, lines * READ_MS + 600);
    const [, ai] = await Promise.all([
      new Promise((r) => setTimeout(r, readFor)),
      useAi ? askTeacher(draft, lateDays, bday) : Promise.resolve(null),
    ]);
    const d: Diary = ai
      ? { ...draft, teacher: ai.line, teacherBy: "ai", care: ai.care, stickers: ai.stickers.length ? ai.stickers : draft.stickers, stamp: ai.stamp }
      : draft;
    try {
      await saveDiary(d);
    } catch {
      setToast("이 기기에 저장하지 못했어요. 카드로는 남길 수 있어요");
    }
    // 이름표가 있으면 서버에도 보관 (개근상도 여기서 받는다). 베타 둘러보기(예제 일기장)는 이 기기에만
    if (me && !me.demo) {
      pushDiary(d)
        .then(async (res) => {
          setDone((cur) => (cur && cur.id === d.id ? { ...cur, serverId: res.diary.serverId } : cur));
          if (res.awards.length) setToast(`${res.awards[0].label}을 받았어요! 나 › 상장함`);
          if (classCtx) {
            const ids = [...new Set([...(res.diary.classIds ?? []), classCtx.id])];
            await api(`/api/diaries/${res.diary.serverId}`, { method: "PATCH", json: { classIds: ids } });
            setDone((cur) => (cur && cur.id === d.id ? { ...cur, classIds: ids } : cur));
            setToast(`${classCtx.name} 반에 숙제를 냈어요`);
          }
        })
        .catch(() => {});
    }
    track("diary_created", { weather, chars: d.body.length, drew: strokes.length > 0, bg, by: d.teacherBy });
    // 2) 다 읽으면 도장 쾅 (도장이 종이에 닿는 0.3초쯤 짧게 진동)
    setDone(d);
    setReading(false);
    setTimeout(stampThump, 280);
    requestAnimationFrame(() =>
      document.getElementById("teacher")?.scrollIntoView({ behavior: "smooth", block: "center" }),
    );
  };

  const restart = useCallback(() => {
    setWeather(null);
    setTitle("");
    setBody("");
    setStrokes([]);
    setBg(preferredBg());
    setSecret(false);
    setDone(null);
    setReading(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const locked = !!done;

  return (
    <main className="app">
      <header className="topbar">
        <Link href="/?cover=1" className="brand" aria-label="참 잘했어요 처음으로">
          <BrandMark className="brand-mark" />
          <span>
            <span className="brand-name">
              <ColorWord text="참 잘했어요" />
            </span>
            <span className="brand-sub">어른이 그림일기</span>
          </span>
        </Link>
        <Link href={me ? "/me" : "/login?next=/"} className="toplink nametag-link">
          {me ? me.nickname : "이름표 만들기"}
        </Link>
      </header>

      {classCtx ? (
        <div className="topic-banner on">
          <span className="tb-label">{classCtx.name} 숙제</span>
          <span className="tb-topic">{classCtx.homework ?? "자유 주제"}</span>
          <span className="tb-btn done">{locked ? "반에 냄" : "다 쓰면 반에 내요"}</span>
        </div>
      ) : (
        date &&
        today &&
        date === today && (
          <TopicBanner
            date={date}
            topic={hw.data?.mission ?? topic}
            weather={weather}
            done={!!hw.data?.mine}
            count={hw.data?.count}
            onOpen={() => setHwOpen(true)}
            onPickDay={locked ? undefined : () => setLateOpen(true)}
          />
        )
      )}
      <HomeworkSheet open={hwOpen} onClose={() => setHwOpen(false)} day={hw.data} onDone={hw.reload} />

      <article className={`page${done && !reading ? " stamped" : ""}`} aria-label="오늘의 그림일기">
        <div className="page-head">
          <button type="button" className="page-date date-btn" onClick={() => !locked && setLateOpen(true)} disabled={locked}>
            {date ? koreanDate(date) : ""}
            {date && today && date < today && <span className="late-tag">밀린 숙제</span>}
            {date && me?.birth && isBirthday(me.birth, date) && (
              <span className="bday-tag">
                <CakeIcon />
                생일
              </span>
            )}
          </button>
          <WeatherPicker value={weather} onChange={setWeather} readOnly={locked} />
        </div>

        <CrayonPad
          strokes={strokes}
          onChange={setStrokes}
          bg={bg}
          onBg={setBg}
          readOnly={locked}
          onPickMine={() => setMineOpen(true)}
        />

        <div className="title-row">
          <label htmlFor="title">제목</label>
          <input
            id="title"
            value={title}
            maxLength={16}
            placeholder={classCtx?.homework ?? "드디어 금요일"}
            onChange={(e) => setTitle(e.target.value)}
            readOnly={locked}
            autoComplete="off"
          />
        </div>

        <div className="manu-wrap">
          <Manuscript value={body} onChange={setBody} readOnly={locked} checked={!!done} />
          {done && !reading && !!done.stickers?.length && <PraiseStickers ids={done.stickers} animate delay={1500} />}
        </div>

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
            <StampSvg className="stamp landing" stamp={done.stamp} />
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
          <ReadAloud diary={done} />
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
          <p className="erase-row">
            <button type="button" className="linkish" onClick={() => setDel(done)}>
              이 일기 지우기
            </button>
          </p>
        </>
      )}

      <p className="note">
        {me?.demo
          ? "예제 일기장을 둘러보는 중이라 일기는 이 기기에만 저장돼요. 내 이름으로 시작하면 내 일기장으로 옮겨 가요."
          : me
            ? "이름표가 있어서 일기가 이 기기와 서버에 함께 보관돼요. 게시판과 우리 반에는 직접 보낼 때만 올라가요."
            : "일기는 이 기기에만 저장돼요. 이름표를 만들면 게시판에 붙이고 우리 반과 나눌 수 있어요."}
      </p>


      <LateSheet
        open={lateOpen}
        today={today}
        value={date}
        onClose={() => setLateOpen(false)}
        onPick={(k) => {
          setDate(k);
          setLateOpen(false);
        }}
      />
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
      <DeleteSheet
        diary={del}
        onClose={() => setDel(null)}
        onToast={setToast}
        onDeleted={() => {
          setDel(null);
          restart(); // 지웠으면 빈 일기장으로 (다시 쓰고 싶을 때)
        }}
      />
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </main>
  );
}
