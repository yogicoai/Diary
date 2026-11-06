"use client";

// 오늘의 숙제 알림장: 누르면 오늘 일기를 숙제로 쓴다 (게시판 "오늘의 숙제" 칸에 모인다)

import { topicOf } from "@/lib/social";

export default function TopicBanner({
  date,
  on,
  onToggle,
  locked,
}: {
  date: string | null;
  on: boolean;
  onToggle: () => void;
  locked?: boolean;
}) {
  if (!date) return <div className="topic-banner" aria-hidden="true" />;
  return (
    <div className={`topic-banner${on ? " on" : ""}`}>
      <span className="tb-label">오늘의 숙제</span>
      <span className="tb-topic">{topicOf(date)}</span>
      {!locked && (
        <button type="button" className="tb-btn" aria-pressed={on} onClick={onToggle}>
          {on ? "숙제로 쓰는 중" : "숙제로 쓰기"}
        </button>
      )}
      {locked && on && <span className="tb-btn done">숙제 냄</span>}
    </div>
  );
}
