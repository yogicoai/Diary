"use client";

import { useState } from "react";
import { PACKS, won } from "@/lib/business";
import { track } from "@/lib/store";
import Sheet from "./Sheet";

// AI 그림은 아직 "준비 중" 문. 가격 반응만 기기 안에 기록한다.
export default function AiSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [pick, setPick] = useState<string>(PACKS.find((p) => p.best)?.id ?? PACKS[0].id);
  const [done, setDone] = useState<null | "yes" | "no">(null);

  const vote = (answer: "yes" | "no") => {
    track("price_vote", { pack: pick, answer });
    setDone(answer);
  };

  return (
    <Sheet open={open} onClose={onClose} label="AI가 대신 그려 주기">
      <h2>크레파스로 대신 그려 드려요</h2>
      <p>
        오늘 쓴 세 줄을 읽고 그림칸을 채워요. 내 사진을 한 장 넣으면 나를 닮은 어린이로 그려요. 지금은 준비 중이라,
        어떤 묶음이면 쓰실지 먼저 여쭤봐요.
      </p>

      <div className="plans" role="radiogroup" aria-label="크레딧 묶음">
        {PACKS.map((p) => (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={pick === p.id}
            className="plan"
            onClick={() => setPick(p.id)}
          >
            <span>
              <b>{p.credits}장</b>
              {p.best && <span className="tag">추천</span>}
              <small>한 장에 {won(Math.round(p.price / p.credits))}</small>
            </span>
            <span className="price">{won(p.price)}</span>
          </button>
        ))}
      </div>

      {done ? (
        <p style={{ marginTop: 16, color: "var(--ink)" }}>
          {done === "yes" ? "고마워요. 나오면 제일 먼저 알려 드릴게요." : "알겠어요. 더 좋은 값으로 돌아올게요."}
        </p>
      ) : (
        <div className="btn-row">
          <button type="button" className="btn plain" onClick={() => vote("no")}>
            아직은 괜찮아요
          </button>
          <button type="button" className="btn" onClick={() => vote("yes")}>
            이 값이면 쓸래요
          </button>
        </div>
      )}
      <p className="note">
        아직 결제는 되지 않아요. 출시되면 일기 내용이 그림을 그리는 AI 서비스(국외 서버)로 보내지며, 그때 따로 동의를
        받아요.
      </p>
    </Sheet>
  );
}
