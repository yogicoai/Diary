"use client";

import { useRef, useState } from "react";
import { pencilTick } from "@/lib/feel";
import { COLS, MAX_CHARS, ROWS, clampText, layoutCells, rowSpans, usedCells } from "@/lib/manuscript";

const PLACEHOLDER = "퇴근하고 친구랑 떡볶이를 먹었다. 너무 맛있어서 웃음이 났다.";

export default function Manuscript({
  value,
  onChange,
  readOnly,
  checked,
}: {
  value: string;
  onChange: (v: string) => void;
  readOnly?: boolean;
  checked?: boolean; // 선생님이 읽으며 빨간 밑줄을 긋는다
}) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [focused, setFocused] = useState(false);
  const [caret, setCaret] = useState<number | null>(null);

  const showPh = !value && !focused && !readOnly;
  const cells = layoutCells(showPh ? PLACEHOLDER : value);
  const caretCell = focused && !readOnly ? layoutCells(value.slice(0, caret ?? value.length)).length : -1;

  const syncCaret = () => setCaret(taRef.current?.selectionStart ?? null);

  return (
    <div className="manuscript">
      <div className="grid" aria-hidden="true">
        {Array.from({ length: COLS * ROWS }, (_, i) => (
          <div key={i} className={`cell${showPh ? " ph" : ""}${i === caretCell ? " caret" : ""}`}>
            {cells[i] ?? ""}
          </div>
        ))}
      </div>
      {checked && <CheckLines text={value} />}
      {!readOnly && (
        <textarea
          ref={taRef}
          aria-label="오늘 있었던 일 (원고지 60칸)"
          value={value}
          onChange={(e) => {
            const next = clampText(e.target.value);
            if (next.length > value.length) pencilTick();
            onChange(next);
            requestAnimationFrame(syncCaret);
          }}
          onSelect={syncCaret}
          onKeyUp={syncCaret}
          onFocus={() => {
            setFocused(true);
            requestAnimationFrame(syncCaret);
          }}
          onBlur={() => setFocused(false)}
          spellCheck={false}
          autoComplete="off"
        />
      )}
      {!readOnly && (
        <div className="manu-foot">
          <span>세 줄이면 충분해요</span>
          <span>
            {Math.min(usedCells(value), MAX_CHARS)}/{MAX_CHARS}칸
          </span>
        </div>
      )}
    </div>
  );
}

// 빨간 색연필 물결 밑줄. 줄마다 차례로 그어진다 (READ_MS 간격)
export const READ_MS = 380;
const WAVE = "M0 5 Q 2.5 1 5 5 T 10 5 T 15 5 T 20 5 T 25 5 T 30 5 T 35 5 T 40 5 T 45 5 T 50 5 T 55 5 T 60 5 T 65 5 T 70 5 T 75 5 T 80 5 T 85 5 T 90 5 T 95 5 T 100 5";

function CheckLines({ text }: { text: string }) {
  let k = 0;
  return (
    <div className="check-lines" aria-hidden="true">
      {rowSpans(text).map((n, r) => {
        if (n === 0) return <div key={r} />;
        const delay = k++ * READ_MS;
        return (
          <div key={r} className="check-row">
            <svg
              viewBox="0 0 100 10"
              preserveAspectRatio="none"
              style={{ width: `${n * 10}%`, animationDelay: `${delay}ms` }}
            >
              <path d={WAVE} />
            </svg>
          </div>
        );
      })}
    </div>
  );
}
