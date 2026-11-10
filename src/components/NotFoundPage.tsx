"use client";

// 없는 주소(404): 일기장 한 쪽 모양 — 크레파스 물음표 그림 + 원고지 + 선생님 빨간 펜 한 줄 → 일기장으로 돌아가기

import Link from "next/link";
import type { Point, Stroke } from "@/lib/crayon";
import CrayonPad from "./CrayonPad";
import { BrandMark, StampSvg } from "./Icons";
import Manuscript from "./Manuscript";

const pts = (xy: number[][]): Point[] => xy.map(([x, y]) => ({ x, y }));
const circle = (cx: number, cy: number, r: number, n = 18): Point[] =>
  Array.from({ length: n + 1 }, (_, i) => ({ x: cx + r * 0.75 * Math.cos((i / n) * Math.PI * 2), y: cy + r * Math.sin((i / n) * Math.PI * 2) }));

// 0~1 좌표 (그림칸 4:3). 파란 물음표 · 노란 해 · 초록 풀밭
const DRAWING: Stroke[] = [
  { color: "#2f5fb3", size: 0.04, points: pts([[0.4, 0.31], [0.41, 0.23], [0.46, 0.17], [0.53, 0.15], [0.6, 0.18], [0.63, 0.25], [0.61, 0.32], [0.56, 0.38], [0.51, 0.43], [0.5, 0.5], [0.5, 0.58]]) },
  { color: "#2f5fb3", size: 0.04, points: pts([[0.495, 0.69], [0.505, 0.7], [0.5, 0.71], [0.495, 0.695]]) },
  { color: "#f6c945", size: 0.022, points: circle(0.84, 0.19, 0.07) },
  ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
    const a = (i / 8) * Math.PI * 2;
    return { color: "#f28a2e", size: 0.012, points: pts([[0.84 + 0.075 * Math.cos(a), 0.19 + 0.1 * Math.sin(a)], [0.84 + 0.105 * Math.cos(a), 0.19 + 0.14 * Math.sin(a)]]) };
  }),
  { color: "#4fa35b", size: 0.022, points: pts(Array.from({ length: 24 }, (_, i) => [0.04 + i * 0.04, i % 2 ? 0.86 : 0.91])) },
];

export default function NotFoundPage() {
  return (
    <main className="app">
      <header className="topbar">
        <Link href="/?cover=1" className="brand">
          <BrandMark className="brand-mark" />
          <span>
            <span className="brand-name">없는 쪽이에요</span>
            <span className="brand-sub">참 잘했어요 어른이 그림일기</span>
          </span>
        </Link>
      </header>
      <article className="page" aria-label="찾는 쪽이 없어요">
        <div className="page-head">
          <div className="page-date">몇 월 며칠이었더라?</div>
        </div>
        <CrayonPad strokes={DRAWING} onChange={() => {}} readOnly />
        <div className="title-row">
          <label>제목</label>
          <input value="찾는 쪽이 없어요" readOnly aria-label="제목" />
        </div>
        <div className="manu-wrap">
          <Manuscript value="주소가 바뀌었거나 지운 일기인가 봐요. 일기장으로 돌아가서 다시 찾아봐요." onChange={() => {}} readOnly checked />
        </div>
        <div className="teacher">
          <div className="teacher-line">길을 잃어도 괜찮아요, 오늘 일기부터 쓰면 되죠</div>
          <StampSvg className="stamp" stamp="cheer" />
        </div>
      </article>
      <Link href="/" className="btn">
        오늘 일기 쓰러 가기
      </Link>
      <Link href="/diary" className="btn plain">
        내 일기장 보기
      </Link>
    </main>
  );
}
