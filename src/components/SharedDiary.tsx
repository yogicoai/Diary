"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { koreanDate } from "@/lib/date";
import { readShared } from "@/lib/share";
import type { Diary } from "@/lib/store";
import { track } from "@/lib/store";
import CrayonPad from "./CrayonPad";
import { BrandMark, StampSvg, ColorWord } from "./Icons";
import Manuscript from "./Manuscript";
import PraiseStickers from "./PraiseStickers";
import WeatherPicker from "./WeatherPicker";

// 친구가 받은 링크로 보는 화면
export default function SharedDiary() {
  const [diary, setDiary] = useState<Diary | null | "loading">("loading");

  useEffect(() => {
    readShared(location.hash).then((d) => {
      setDiary(d);
      if (d) track("shared_open");
    });
  }, []);

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
      </header>

      {diary === "loading" && <div className="empty">일기장을 펼치는 중…</div>}

      {diary === null && (
        <div className="empty">
          일기장이 찢어졌나 봐요.
          <br />
          링크를 다시 받아 주세요.
        </div>
      )}

      {diary && diary !== "loading" && (
        <>
          <p className="received">친구가 오늘의 그림일기를 보냈어요</p>
          <article className="page" aria-label="친구의 그림일기">
            <div className="page-head">
              <div className="page-date">{koreanDate(diary.date)}</div>
              <WeatherPicker value={diary.weather} onChange={() => {}} readOnly />
            </div>
            <CrayonPad strokes={diary.strokes} bg={diary.bg} onChange={() => {}} readOnly />
            <div className="title-row">
              <label>제목</label>
              <input value={diary.title} readOnly aria-label="제목" />
            </div>
            {diary.secret ? (
              <div className="secret-note">비밀 일기예요. 글은 친구만 알아요.</div>
            ) : (
              <div className="manu-wrap">
                <Manuscript value={diary.body} onChange={() => {}} readOnly checked />
                {!!diary.stickers?.length && <PraiseStickers ids={diary.stickers} />}
              </div>
            )}
            <div className="teacher">
              <div className="teacher-line">{diary.teacher}</div>
              <StampSvg className="stamp" stamp={diary.stamp} />
            </div>
          </article>
        </>
      )}

      <Link href="/" className="btn" onClick={() => track("shared_cta")}>
        나도 오늘 그림일기 쓰기
      </Link>
      <p className="note">가입 없이 바로 써요. 일기는 내 기기에만 저장돼요.</p>
    </main>
  );
}
