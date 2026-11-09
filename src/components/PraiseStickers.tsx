"use client";

// 선생님이 원고지 귀퉁이에 붙여 주는 칭찬 스티커 (하나씩 톡톡 붙는다)

import { useEffect } from "react";
import { buzz, pencilTick } from "@/lib/feel";
import { stickerById, stickerFontSize, stickerLines, stickerPaths } from "@/lib/stickers";

export function StickerSvg({ id, size = 64 }: { id: string; size?: number }) {
  const s = stickerById(id);
  if (!s) return null;
  const p = stickerPaths(s.shape);
  const lines = stickerLines(s.text);
  const lh = stickerFontSize(s.text) * 1.05;
  const cy = s.shape === "ribbon" ? 44 : s.shape === "cloud" ? 60 : 52;
  return (
    <svg width={size} height={size} viewBox="-6 -6 112 112" role="img" aria-label={`${s.text} 스티커`}>
      <g strokeLinejoin="round">
        {p.extra && <path d={p.extra} fill="none" stroke="#fff" strokeWidth={9} />}
        <path d={p.body} fill="none" stroke="#fff" strokeWidth={9} />
        {p.extra && s.shape === "ribbon" && <path d={p.extra} fill={s.fill} stroke={s.stroke} strokeWidth={3} />}
        <path d={p.body} fill={s.fill} stroke={s.stroke} strokeWidth={3} />
        {p.extra && s.shape === "flower" && <path d={p.extra} fill="#fffdf6" />}
      </g>
      <text
        x="50"
        textAnchor="middle"
        dominantBaseline="central"
        fill={s.ink}
        style={{ fontFamily: "var(--font-kid), cursive", fontWeight: 700, fontSize: stickerFontSize(s.text) }}
      >
        {lines.map((ln, i) => (
          <tspan key={i} x="50" y={cy + (i - (lines.length - 1) / 2) * lh}>
            {ln}
          </tspan>
        ))}
      </text>
    </svg>
  );
}

const SPOTS = [
  { right: -12, top: -66, rot: 12 },
  { right: 44, top: -74, rot: -10 },
  { right: 98, top: -64, rot: 6 },
];

/** 원고지 오른쪽 위에 붙는 스티커들. animate 면 0.45초 간격으로 하나씩 */
export default function PraiseStickers({ ids, animate, delay = 0 }: { ids: string[]; animate?: boolean; delay?: number }) {
  useEffect(() => {
    if (!animate) return;
    const timers = ids.map((_, i) =>
      setTimeout(() => {
        pencilTick();
        buzz(10);
      }, delay + i * 450 + 120),
    );
    return () => timers.forEach(clearTimeout);
  }, [ids, animate, delay]);

  return (
    <div className="praise" aria-label={`칭찬 스티커 ${ids.length}개`}>
      {ids.slice(0, 3).map((id, i) => (
        <span
          key={id}
          className={`praise-sticker${animate ? " pop" : ""}`}
          style={{
            right: SPOTS[i].right,
            top: SPOTS[i].top,
            rotate: `${SPOTS[i].rot}deg`,
            animationDelay: `${delay + i * 450}ms`,
          }}
        >
          <StickerSvg id={id} size={62} />
        </span>
      ))}
    </div>
  );
}
