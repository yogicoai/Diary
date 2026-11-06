"use client";

import { useState } from "react";
import { BOOK, won } from "@/lib/business";
import { track } from "@/lib/store";
import Sheet from "./Sheet";

// 실물 그림일기 책: 아직 준비 중. 갖고 싶은지 반응만 기기 안에 기록한다.
export default function BookSheet({ open, onClose, count }: { open: boolean; onClose: () => void; count: number }) {
  const [done, setDone] = useState<null | "yes" | "no">(null);
  const vote = (answer: "yes" | "no") => {
    track("book_vote", { answer, count });
    setDone(answer);
  };
  return (
    <Sheet open={open} onClose={onClose} label="그림일기 책">
      <h2>{BOOK.pages}장이 모이면 책 한 권</h2>
      <p>
        내가 쓴 그림일기 {BOOK.pages}장을 옛날 그림일기장 모양 그대로 인쇄해서 보내 드려요. 표지에는 내 이름과 기간이
        들어가요. 직접 그린 그림만으로도 만들 수 있어요.
      </p>
      <p style={{ marginTop: 10, color: "var(--ink)" }}>
        예상 가격 {won(BOOK.priceFrom)} ~ {won(BOOK.priceTo)} · 지금 {count}장 모았어요
      </p>
      {done ? (
        <p style={{ marginTop: 16, color: "var(--ink)" }}>
          {done === "yes" ? "고마워요. 책이 준비되면 제일 먼저 알려 드릴게요." : "알겠어요. 더 좋은 모습으로 돌아올게요."}
        </p>
      ) : (
        <div className="btn-row">
          <button type="button" className="btn plain" onClick={() => vote("no")}>
            아직은요
          </button>
          <button type="button" className="btn" onClick={() => vote("yes")}>
            갖고 싶어요
          </button>
        </div>
      )}
      <p className="note">아직 주문은 되지 않아요. 골라 주신 답은 책 가격과 모양을 정하는 데만 써요.</p>
    </Sheet>
  );
}
