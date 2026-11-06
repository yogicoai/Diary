"use client";

import { useRef, useState } from "react";
import { COLS, MAX_CHARS, ROWS, clampText, layoutCells, usedCells } from "@/lib/manuscript";

const PLACEHOLDER = "퇴근하고 친구랑 떡볶이를 먹었다. 너무 맛있어서 웃음이 났다.";

export default function Manuscript({
  value,
  onChange,
  readOnly,
}: {
  value: string;
  onChange: (v: string) => void;
  readOnly?: boolean;
}) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [focused, setFocused] = useState(false);
  const [caret, setCaret] = useState<number | null>(null);

  const showPh = !value && !focused && !readOnly;
  const cells = layoutCells(showPh ? PLACEHOLDER : value);
  const caretCell = focused ? layoutCells(value.slice(0, caret ?? value.length)).length : -1;

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
      {!readOnly && (
        <textarea
          ref={taRef}
          aria-label="오늘 있었던 일 (원고지 60칸)"
          value={value}
          onChange={(e) => {
            onChange(clampText(e.target.value));
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
