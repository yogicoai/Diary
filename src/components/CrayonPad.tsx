"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CRAYONS, drawStroke, type Point, type Stroke } from "@/lib/crayon";
import { CrayonStick } from "./Icons";

const SIZES = [0.012, 0.022, 0.04]; // 그림칸 너비 대비 굵기

type Props = {
  strokes: Stroke[];
  onChange: (next: Stroke[]) => void;
  readOnly?: boolean;
  onAskAi: () => void;
};

export default function CrayonPad({ strokes, onChange, readOnly, onAskAi }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef<Stroke | null>(null);
  const strokesRef = useRef(strokes);
  const [color, setColor] = useState<string>(CRAYONS[0].hex);
  const [size, setSize] = useState(1);
  const [erase, setErase] = useState(false);

  // 캔버스 크기 = 화면 크기 × 화소 비율
  const redraw = useCallback(
    (list: Stroke[]) => {
      const c = canvasRef.current;
      if (!c) return;
      const ctx = c.getContext("2d")!;
      ctx.clearRect(0, 0, c.width, c.height);
      for (const s of list) drawStroke(ctx, s, c.width, c.height, Math.min(2, window.devicePixelRatio || 1));
    },
    [],
  );

  useEffect(() => {
    const box = boxRef.current;
    const c = canvasRef.current;
    if (!box || !c) return;
    const fit = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const r = box.getBoundingClientRect();
      c.width = Math.round(r.width * dpr);
      c.height = Math.round(r.height * dpr);
      redraw(strokesRef.current);
    };
    const ro = new ResizeObserver(fit);
    ro.observe(box);
    fit();
    return () => ro.disconnect();
  }, [redraw]);

  useEffect(() => {
    strokesRef.current = strokes;
    redraw(strokes);
  }, [strokes, redraw]);

  const toPoint = (e: React.PointerEvent): Point => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
  };

  const onDown = (e: React.PointerEvent) => {
    if (readOnly) return;
    e.preventDefault();
    (e.target as Element).setPointerCapture(e.pointerId);
    drawing.current = { color, size: SIZES[size] * (erase ? 1.6 : 1), points: [toPoint(e)], erase };
    paintLive();
  };

  const onMove = (e: React.PointerEvent) => {
    const s = drawing.current;
    if (!s) return;
    const p = toPoint(e);
    const last = s.points[s.points.length - 1];
    if (Math.hypot(p.x - last.x, p.y - last.y) < 0.003) return;
    s.points.push(p);
    paintLive();
  };

  const onUp = () => {
    const s = drawing.current;
    if (!s) return;
    drawing.current = null;
    onChange([...strokesRef.current, s]);
  };

  // 그리는 중에는 전체를 다시 그려서 겹침 질감을 맞춘다
  const paintLive = () => {
    const c = canvasRef.current;
    const s = drawing.current;
    if (!c || !s) return;
    redraw(strokesRef.current);
    drawStroke(c.getContext("2d")!, s, c.width, c.height, Math.min(2, window.devicePixelRatio || 1));
  };

  const empty = strokes.length === 0;

  return (
    <div>
      <div
        className="draw-box"
        ref={boxRef}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        aria-label="그림칸. 손가락으로 그려요"
      >
        <canvas ref={canvasRef} />
        {empty && !readOnly && (
          <div className="draw-hint">
            <div>
              여기에 오늘을 그려요
              <small>못 그려도 괜찮아요. 그게 그림일기니까요</small>
            </div>
          </div>
        )}
      </div>

      {!readOnly && (
        <>
          <div className="crayon-box" role="toolbar" aria-label="크레파스">
            {CRAYONS.map((c) => (
              <button
                key={c.id}
                type="button"
                className="crayon"
                aria-label={c.name}
                aria-pressed={!erase && color === c.hex}
                onClick={() => {
                  setColor(c.hex);
                  setErase(false);
                }}
              >
                <CrayonStick color={c.hex} selected={!erase && color === c.hex} />
              </button>
            ))}
          </div>
          <div className="tools">
            <button
              type="button"
              className="tool"
              aria-label={`굵기: ${["가늘게", "보통", "굵게"][size]} (누르면 바뀜)`}
              onClick={() => setSize((s) => (s + 1) % SIZES.length)}
            >
              <span className="dot" style={{ width: 4 + size * 5, height: 4 + size * 5 }} />
            </button>
            <button type="button" className="tool" aria-pressed={erase} onClick={() => setErase((v) => !v)}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8.5 19.5 3.8 14.8a1.6 1.6 0 0 1 0-2.3l8.2-8.2a1.6 1.6 0 0 1 2.3 0l5.4 5.4a1.6 1.6 0 0 1 0 2.3l-7.8 7.8M8.5 19.5h11M7 11.4l6.1 6.1" />
              </svg>
              지우개
            </button>
            <button
              type="button"
              className="tool"
              aria-label="되돌리기"
              disabled={empty}
              onClick={() => onChange(strokes.slice(0, -1))}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M9 7 4.5 11.5 9 16M5 11.5h9.5a5 5 0 0 1 0 10H12" />
              </svg>
            </button>
            <span className="tool-spacer" />
            <button type="button" className="tool ai" onClick={onAskAi}>
              대신 그려 줘
            </button>
          </div>
        </>
      )}
    </div>
  );
}
