"use client";

// 오늘의 숙제 알림장: 누르면 오늘 일기를 숙제로 쓴다 (게시판 "오늘의 숙제" 칸에 모인다)
// 선생님(운영자)이 건 숙제면 "선생님 숙제", 아래엔 선생님 한마디(빨간 펜).
// 일요일엔 "밀린 일기 하는 날" 안내, 비·눈·천둥에 동그라미 치면 날씨 덤 숙제.

import type { Topic } from "@/lib/topics";
import { WEATHER_BONUS, WEEKDAY_NAMES, weekdayOf } from "@/lib/topics";
import type { WeatherId } from "@/lib/weather";

export default function TopicBanner({
  date,
  topic,
  today,
  weather,
  on,
  onToggle,
  onPickDay,
  locked,
}: {
  date: string | null;
  topic: Topic | null;
  today?: string | null;
  weather?: WeatherId | null;
  on: boolean;
  onToggle: () => void;
  onPickDay?: () => void;
  locked?: boolean;
}) {
  if (!date || !topic) return <div className="topic-banner" aria-hidden="true" />;
  const isToday = !today || date === today;
  const dow = weekdayOf(date);
  const label = topic.kind === "teacher" ? "선생님 숙제" : isToday ? "오늘의 숙제" : "그날 숙제";
  const subject =
    topic.kind === "teacher" ? "선생님이 낸 숙제" : topic.kind === "weekday" ? `${WEEKDAY_NAMES[dow]}요일 · ${topic.subject}` : topic.subject;
  const bonus = weather ? WEATHER_BONUS[weather] : undefined;
  const sunday = isToday && dow === 0 && !locked && onPickDay;

  return (
    <div className={`topic-banner${on ? " on" : ""}`}>
      <div className="tb-row">
        <span className={`tb-label${topic.kind === "teacher" ? " by-teacher" : ""}`}>{label}</span>
        <span className="tb-topic">{topic.text}</span>
        {!locked && (
          <button type="button" className="tb-btn" aria-pressed={on} onClick={onToggle}>
            {on ? "숙제로 쓰는 중" : "숙제로 쓰기"}
          </button>
        )}
        {locked && on && <span className="tb-btn done">숙제 냄</span>}
      </div>
      {(subject || topic.note) && (
        <p className="tb-sub">
          {subject && <span className="tb-subject">{subject}</span>}
          {topic.note && <span className="tb-note">{topic.note}</span>}
        </p>
      )}
      {sunday && (
        <p className="tb-extra">
          일요일은 밀린 일기 하는 날!{" "}
          <button type="button" className="linkish" onClick={onPickDay}>
            이번 주 빈 날 고르기
          </button>
        </p>
      )}
      {bonus && !locked && (
        <p className="tb-extra">
          <span className="tb-subject">날씨 덤 숙제</span> {bonus}
        </p>
      )}
    </div>
  );
}
