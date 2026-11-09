"use client";

// 친구 도장·스티커 줄. 누르면 찍고, 한 번 더 누르면 뗀다.

import { useState } from "react";
import { api } from "@/lib/api";
import { buzz, pencilTick, stampThump } from "@/lib/feel";
import { REACTIONS, type ReactionKind } from "@/lib/social";

export function ReactionIcon({ kind, size = 30 }: { kind: ReactionKind; size?: number }) {
  if (kind === "cham" || kind === "best" || kind === "cheer") {
    const text = kind === "cham" ? "참" : kind === "best" ? "최고" : "힘내";
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" className="r-stamp">
        <circle cx="20" cy="20" r="16.5" fill="none" stroke="currentColor" strokeWidth="2.6" />
        <circle cx="20" cy="20" r="13" fill="none" stroke="currentColor" strokeWidth="1" />
        <text
          x="20"
          y={kind === "cham" ? 26 : 24.5}
          textAnchor="middle"
          fill="currentColor"
          style={{ fontFamily: "var(--font-kid), cursive", fontWeight: 700, fontSize: kind === "cham" ? 17 : 12 }}
        >
          {text}
        </text>
      </svg>
    );
  }
  if (kind === "star")
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
        <path d="M20 5l4.4 9.4 10.1 1.3-7.4 7 1.9 10.1L20 27.9l-9 4.9 1.9-10.1-7.4-7 10.1-1.3Z" fill="#f6c945" stroke="#c99a1d" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    );
  if (kind === "heart")
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
        <path d="M20 33S6 24.6 6 15.4A7.4 7.4 0 0 1 20 11a7.4 7.4 0 0 1 14 4.4C34 24.6 20 33 20 33Z" fill="#f08fb0" stroke="#c8577c" strokeWidth="1.6" />
      </svg>
    );
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <circle cx="20" cy="20" r="14" fill="#ffd166" stroke="#c99a1d" strokeWidth="1.6" />
      <circle cx="15" cy="17" r="1.8" fill="#2b2622" />
      <circle cx="25" cy="17" r="1.8" fill="#2b2622" />
      <path d="M13.5 23c3.6 4.2 9.4 4.2 13 0" fill="none" stroke="#2b2622" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function totalReactions(r: Partial<Record<string, number>> | undefined) {
  return Object.values(r ?? {}).reduce<number>((a, b) => a + (b ?? 0), 0);
}

export default function Reactions({
  diaryId,
  initial,
  mine: initialMine,
  canReact,
  onNeedLogin,
  onToast,
}: {
  diaryId: string;
  initial: Partial<Record<string, number>>;
  mine: string[];
  canReact: boolean;
  onNeedLogin?: () => void;
  onToast?: (m: string) => void;
}) {
  const [counts, setCounts] = useState(initial);
  const [mine, setMine] = useState(initialMine);
  const [busy, setBusy] = useState<string | null>(null);

  const toggle = async (kind: ReactionKind) => {
    if (!canReact) {
      onNeedLogin?.();
      return;
    }
    if (busy) return;
    setBusy(kind);
    const on = mine.includes(kind);
    // 먼저 화면에 보이고, 서버 답으로 맞춘다
    setMine((m) => (on ? m.filter((k) => k !== kind) : [...m, kind]));
    setCounts((c) => ({ ...c, [kind]: Math.max(0, (c[kind] ?? 0) + (on ? -1 : 1)) }));
    if (!on) {
      if (kind === "cham" || kind === "best" || kind === "cheer") stampThump();
      else {
        pencilTick();
        buzz(12);
      }
    }
    try {
      const res = await api<{ reactions: Record<string, number>; mine: string[] }>(`/api/board/${diaryId}/react`, {
        method: "POST",
        json: { kind },
      });
      setCounts(res.reactions);
      setMine(res.mine);
    } catch (e) {
      setMine(initialMine);
      setCounts(initial);
      onToast?.(e instanceof Error ? e.message : "도장을 못 찍었어요");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="reactions" role="group" aria-label="도장·스티커">
      {REACTIONS.map((r) => {
        const on = mine.includes(r.kind);
        return (
          <button
            key={r.kind}
            type="button"
            className={`reaction rx-${r.type}${on ? " on" : ""}`}
            aria-pressed={on}
            aria-label={`${r.label} ${counts[r.kind] ?? 0}개`}
            onClick={() => toggle(r.kind)}
          >
            <ReactionIcon kind={r.kind} />
            <span className="r-count">{counts[r.kind] ?? 0}</span>
          </button>
        );
      })}
    </div>
  );
}
