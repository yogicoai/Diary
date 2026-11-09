"use client";

// 오늘의 숙제 알림장 = 그날의 어른이 미션. [숙제 하기]를 누르면 사진·한 줄로 숙제 검사를 받는다 (일기와 따로).
// 선생님(교무실)이 건 숙제면 "선생님 숙제", 아래엔 선생님 한마디(빨간 펜).
// 일요일엔 "밀린 일기 하는 날" 안내, 비·눈·천둥에 동그라미 치면 날씨 덤 숙제.

import type { Topic } from "@/lib/topics";
import { WEATHER_BONUS, WEEKDAY_NAMES, weekdayOf } from "@/lib/topics";
import type { WeatherId } from "@/lib/weather";
import { StampSvg } from "./Icons";

export default function TopicBanner({
  date,
  topic,
  weather,
  done,
  count,
  onOpen,
  onPickDay,
}: {
  date: string | null;
  topic: Topic | null;
  weather?: WeatherId | null;
  done: boolean;
  count?: number;
  onOpen: () => void;
  onPickDay?: () => void;
}) {
  if (!date || !topic) return <div className="topic-banner" aria-hidden="true" />;
  const dow = weekdayOf(date);
  const label = topic.kind === "teacher" ? "선생님 숙제" : "오늘의 숙제";
  const subject =
    topic.kind === "teacher" ? "선생님이 낸 숙제" : topic.kind === "weekday" ? `${WEEKDAY_NAMES[dow]}요일 · ${topic.subject}` : topic.subject;
  const bonus = weather ? WEATHER_BONUS[weather] : undefined;

  return (
    <div className={`topic-banner${done ? " on" : ""}`}>
      <div className="tb-row">
        <span className={`tb-label${topic.kind === "teacher" ? " by-teacher" : ""}`}>{label}</span>
        <span className="tb-topic">{topic.text}</span>
        {done ? (
          <button type="button" className="tb-btn done" onClick={onOpen} aria-label="오늘 낸 숙제 보기">
            <StampSvg className="tb-check" stamp="checked" />
            검사 끝
          </button>
        ) : (
          <button type="button" className="tb-btn" onClick={onOpen}>
            숙제 하기
          </button>
        )}
      </div>
      {(subject || topic.note) && (
        <p className="tb-sub">
          {subject && <span className="tb-subject">{subject}</span>}
          {topic.note && <span className="tb-note">{topic.note}</span>}
        </p>
      )}
      {!!count && count > 0 && <p className="tb-extra">오늘 {count}명이 숙제를 했어요</p>}
      {dow === 0 && onPickDay && (
        <p className="tb-extra">
          일요일은 밀린 일기 하는 날!{" "}
          <button type="button" className="linkish" onClick={onPickDay}>
            이번 주 빈 날 고르기
          </button>
        </p>
      )}
      {bonus && (
        <p className="tb-extra">
          <span className="tb-subject">날씨 덤 숙제</span> {bonus}
        </p>
      )}
    </div>
  );
}
