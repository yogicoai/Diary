"use client";

// 없는 주소(404)·화면 오류: 일기장 한 쪽 모양 — 크레파스 그림 + 원고지 + 선생님 빨간 펜 한 줄 → 다시 해 보기 / 일기장으로
// (기본 영어 화면 대신, 11-10)

import Link from "next/link";
import type { Point, Stroke } from "@/lib/crayon";
import CrayonPad from "./CrayonPad";
import { BrandMark, StampSvg } from "./Icons";
import Manuscript from "./Manuscript";

const pts = (xy: number[][]): Point[] => xy.map(([x, y]) => ({ x, y }));
const circle = (cx: number, cy: number, r: number, n = 18): Point[] =>
  Array.from({ length: n + 1 }, (_, i) => ({ x: cx + r * 0.75 * Math.cos((i / n) * Math.PI * 2), y: cy + r * Math.sin((i / n) * Math.PI * 2) }));
const grass = (y: number): Stroke => ({ color: "#4fa35b", size: 0.022, points: pts(Array.from({ length: 24 }, (_, i) => [0.04 + i * 0.04, i % 2 ? y : y + 0.05])) });

// 0~1 좌표 (그림칸 4:3)
// 없는 쪽: 파란 물음표 · 노란 해 · 초록 풀밭
const MISSING: Stroke[] = [
  { color: "#2f5fb3", size: 0.04, points: pts([[0.4, 0.31], [0.41, 0.23], [0.46, 0.17], [0.53, 0.15], [0.6, 0.18], [0.63, 0.25], [0.61, 0.32], [0.56, 0.38], [0.51, 0.43], [0.5, 0.5], [0.5, 0.58]]) },
  { color: "#2f5fb3", size: 0.04, points: pts([[0.495, 0.69], [0.505, 0.7], [0.5, 0.71], [0.495, 0.695]]) },
  { color: "#f6c945", size: 0.022, points: circle(0.84, 0.19, 0.07) },
  ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
    const a = (i / 8) * Math.PI * 2;
    return { color: "#f28a2e", size: 0.012, points: pts([[0.84 + 0.075 * Math.cos(a), 0.19 + 0.1 * Math.sin(a)], [0.84 + 0.105 * Math.cos(a), 0.19 + 0.14 * Math.sin(a)]]) };
  }),
  grass(0.86),
];

// 오류: 똑 부러진 빨간 크레파스 두 동강 + 부러진 자국 + 부스러기
const BROKEN: Stroke[] = [
  { color: "#e0453a", size: 0.1, points: pts([[0.15, 0.52], [0.43, 0.52]]) },
  { color: "#e0453a", size: 0.1, points: pts([[0.55, 0.47], [0.76, 0.47]]) },
  { color: "#e0453a", size: 0.05, points: pts([[0.76, 0.47], [0.84, 0.47]]) },
  // 크레파스 종이 띠
  { color: "#2b2622", size: 0.012, points: pts([[0.22, 0.45], [0.22, 0.59]]) },
  { color: "#2b2622", size: 0.012, points: pts([[0.36, 0.45], [0.36, 0.59]]) },
  { color: "#2b2622", size: 0.012, points: pts([[0.63, 0.4], [0.63, 0.54]]) },
  // 부러진 자국
  { color: "#2b2622", size: 0.012, points: pts([[0.47, 0.32], [0.5, 0.36], [0.48, 0.39]]) },
  { color: "#2b2622", size: 0.012, points: pts([[0.51, 0.3], [0.53, 0.33]]) },
  // 부스러기
  ...[
    [0.47, 0.64],
    [0.51, 0.67],
    [0.49, 0.71],
  ].map(([x, y]) => ({ color: "#e0453a", size: 0.022, points: pts([[x, y], [x + 0.006, y + 0.004]]) })),
  grass(0.84),
];

const TEXT = {
  missing: {
    brand: "없는 쪽이에요",
    date: "몇 월 며칠이었더라?",
    title: "찾는 쪽이 없어요",
    body: "주소가 바뀌었거나 지운 일기인가 봐요. 일기장으로 돌아가서 다시 찾아봐요.",
    teacher: "길을 잃어도 괜찮아요, 오늘 일기부터 쓰면 되죠",
    drawing: MISSING,
  },
  error: {
    brand: "잠깐 멈췄어요",
    date: "앗, 크레파스가 부러졌어요",
    title: "다시 해 볼까요?",
    body: "잠깐 문제가 생겼어요. 저장한 일기는 그대로 있어요. 아래 다시 해 보기를 눌러 주세요.",
    teacher: "괜찮아요, 새 크레파스 꺼내서 다시 해요",
    drawing: BROKEN,
  },
};

export default function OopsPage({ kind, onRetry }: { kind: keyof typeof TEXT; onRetry?: () => void }) {
  const t = TEXT[kind];
  return (
    <main className="app">
      <header className="topbar">
        <Link href="/?cover=1" className="brand">
          <BrandMark className="brand-mark" />
          <span>
            <span className="brand-name">{t.brand}</span>
            <span className="brand-sub">참 잘했어요 어른이 그림일기</span>
          </span>
        </Link>
      </header>
      <article className="page" aria-label={t.title}>
        <div className="page-head">
          <div className="page-date">{t.date}</div>
        </div>
        <CrayonPad strokes={t.drawing} onChange={() => {}} readOnly />
        <div className="title-row">
          <label>제목</label>
          <input value={t.title} readOnly aria-label="제목" />
        </div>
        <div className="manu-wrap">
          <Manuscript value={t.body} onChange={() => {}} readOnly checked />
        </div>
        <div className="teacher">
          <div className="teacher-line">{t.teacher}</div>
          <StampSvg className="stamp" stamp="cheer" />
        </div>
      </article>
      {onRetry ? (
        <button type="button" className="btn" onClick={onRetry}>
          다시 해 보기
        </button>
      ) : (
        <Link href="/" className="btn">
          오늘 일기 쓰러 가기
        </Link>
      )}
      <Link href="/diary" className="btn plain">
        내 일기장 보기
      </Link>
    </main>
  );
}
