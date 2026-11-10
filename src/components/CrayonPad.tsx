"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BACKGROUNDS, bgById, bgSrc, bgThumb, BG_PACKS } from "@/lib/backgrounds";
import { CRAYONS, drawStroke, type Point, type Stroke } from "@/lib/crayon";
import { addWear, newCrayon, wearMap } from "@/lib/crayonWear";
import { crayonStroke, pencilTick } from "@/lib/feel";
import { CrayonStick, PencilIcon } from "./Icons";

const SIZES = [0.012, 0.022, 0.04]; // 그림칸 너비 대비 굵기

type Props = {
  strokes: Stroke[];
  onChange: (next: Stroke[]) => void;
  bg?: string | null; // null = 직접 그리기(흰 종이)
  onBg?: (id: string | null) => void;
  readOnly?: boolean;
  onPickMine?: () => void; // 내가 예전에 그린 그림 가져오기
};

export default function CrayonPad({ strokes, onChange, bg = null, onBg, readOnly, onPickMine }: Props) {
  const bgItem = bgById(bg);
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef<Stroke | null>(null);
  const strokesRef = useRef(strokes);
  const feelRef = useRef<ReturnType<typeof crayonStroke> | null>(null);
  const lastMove = useRef({ x: 0, y: 0, t: 0 });
  const [color, setColor] = useState<string>(CRAYONS[0].hex);
  const [size, setSize] = useState(1);
  const [erase, setErase] = useState(false);
  const [pack, setPack] = useState(""); // 상황별 배경 묶음 ("" = 전체)
  // 몽당 크레파스: 색마다 닳은 정도 (0~1)
  const [wear, setWear] = useState<Record<string, number>>({});
  const drawnPx = useRef(0);
  // 손끝을 따라다니는 크레파스
  const cursorRef = useRef<HTMLDivElement>(null);
  const crayonId = CRAYONS.find((c) => c.hex === color)?.id ?? "black";
  // 크게 그리기 (11-10 사용자: "모바일에서 그림칸이 약해서 가로로 크게, 전체 화면 가로 모드"):
  // 화면 가득 가로로 그림칸을 키운다. 휴대폰이 세로면 화면을 90도 돌려서 보여 준다(rot) — 폰을 옆으로 들면 똑바로 보인다.
  // 아이폰은 웹에서 방향을 못 바꿔서 이 방식이 모두에게 같다. 안드로이드는 전체 화면 + 가로 고정도 해 본다.
  const [big, setBig] = useState(false);
  const [rot, setRot] = useState(false);
  const fsOn = useRef(false);
  const turned = big && rot;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 이 기기에 남은 크레파스 길이를 읽는다
    setWear(wearMap());
  }, []);

  const closeBig = useCallback(() => {
    setBig(false);
    try {
      (screen.orientation as unknown as { unlock?: () => void } | undefined)?.unlock?.();
    } catch {
      /* 가로 고정을 못 풀어도 그대로 */
    }
    if (fsOn.current && document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    fsOn.current = false;
  }, []);

  const openBig = () => {
    setRot(window.innerHeight > window.innerWidth);
    setBig(true);
    // 손가락 기기면 전체 화면 + 가로 고정 (안드로이드 크롬). 안 되면(아이폰 등) 화면을 돌려 보여 주는 것으로 충분
    if (!window.matchMedia("(pointer: coarse)").matches) return;
    const p = document.documentElement.requestFullscreen?.({ navigationUI: "hide" });
    if (!p) return;
    p.then(() => {
      fsOn.current = true;
      return (screen.orientation as unknown as { lock?: (o: string) => Promise<void> }).lock?.("landscape");
    }).catch(() => {});
  };

  useEffect(() => {
    if (!big) return;
    const onResize = () => setRot(window.innerHeight > window.innerWidth);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeBig();
    // 뒤로 가기 등으로 전체 화면이 풀리면 크게 그리기도 닫는다
    const onFs = () => {
      if (!document.fullscreenElement && fsOn.current) closeBig();
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("keydown", onKey);
    document.addEventListener("fullscreenchange", onFs);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("fullscreenchange", onFs);
      document.body.style.overflow = prev;
    };
  }, [big, closeBig]);

  // 크레파스 끝(뷰박스 y = 3 + 39×닳음)을 손끝(0,0)에 두고 그 점을 중심으로 기울인다
  const tipStyle = (w: number) => {
    const tip = (3 + 39 * w) * 1.3;
    return { top: -tip, transformOrigin: `19.5px ${tip}px` };
  };

  const moveCursor = (e: React.PointerEvent, show: boolean) => {
    const el = cursorRef.current;
    const box = boxRef.current;
    if (!el || !box || readOnly) return;
    const r = box.getBoundingClientRect();
    // 화면을 90도 돌려 보여 줄 땐 그림칸 안 좌표도 돌려서 (그림칸의 위쪽 = 화면 오른쪽)
    const x = turned ? e.clientY - r.top : e.clientX - r.left;
    const y = turned ? r.right - e.clientX : e.clientY - r.top;
    el.style.transform = `translate(${x}px, ${y}px)`;
    el.style.opacity = show ? "1" : "0";
  };

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
      // 화면에 놓인 크기(돌려 보여 줘도 그대로인 레이아웃 크기)
      c.width = Math.round((c.offsetWidth || box.clientWidth) * dpr);
      c.height = Math.round((c.offsetHeight || box.clientHeight) * dpr);
      redraw(strokesRef.current);
    };
    const ro = new ResizeObserver(fit);
    ro.observe(box);
    fit();
    return () => ro.disconnect();
  }, [redraw, big]);

  useEffect(() => {
    strokesRef.current = strokes;
    redraw(strokes);
  }, [strokes, redraw]);

  const toPoint = (e: React.PointerEvent): Point => {
    const r = canvasRef.current!.getBoundingClientRect();
    // 90도 돌린 그림칸: 그림의 가로 = 화면 아래쪽, 그림의 세로 = 화면 왼쪽
    if (turned) return { x: (e.clientY - r.top) / r.height, y: (r.right - e.clientX) / r.width };
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
  };

  const onDown = (e: React.PointerEvent) => {
    if (readOnly) return;
    e.preventDefault();
    (e.target as Element).setPointerCapture(e.pointerId);
    drawing.current = { color, size: SIZES[size] * (erase ? 1.6 : 1), points: [toPoint(e)], erase };
    drawnPx.current = 0;
    moveCursor(e, true);
    feelRef.current = crayonStroke(erase);
    lastMove.current = { x: e.clientX, y: e.clientY, t: e.timeStamp };
    paintLive();
  };

  const onMove = (e: React.PointerEvent) => {
    const s = drawing.current;
    // 마우스는 누르지 않아도 크레파스가 따라온다, 손가락은 그릴 때만
    if (s || e.pointerType === "mouse") moveCursor(e, true);
    if (!s) return;
    const p = toPoint(e);
    const last = s.points[s.points.length - 1];
    if (Math.hypot(p.x - last.x, p.y - last.y) < 0.003) return;
    s.points.push(p);
    // 긋는 속도만큼 사각사각 + 짧은 진동
    const lm = lastMove.current;
    const step = Math.hypot(e.clientX - lm.x, e.clientY - lm.y);
    feelRef.current?.move(step / Math.max(8, e.timeStamp - lm.t), step);
    if (!s.erase) drawnPx.current += step;
    lastMove.current = { x: e.clientX, y: e.clientY, t: e.timeStamp };
    paintLive();
  };

  const onUp = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") moveCursor(e, false);
    const s = drawing.current;
    if (!s) return;
    drawing.current = null;
    if (drawnPx.current > 0) {
      addWear(crayonId, drawnPx.current);
      setWear(wearMap());
    }
    feelRef.current?.end();
    feelRef.current = null;
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

  const drawBox = (
    <div
      className="draw-box"
      ref={boxRef}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onPointerLeave={(e) => moveCursor(e, false)}
      aria-label="그림칸. 손가락으로 그려요"
    >
      {bgItem && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="draw-bg" src={bgSrc(bgItem.id)} alt="" draggable={false} />
      )}
      <canvas ref={canvasRef} />
      {!readOnly && (
        <div className="crayon-cursor" ref={cursorRef} aria-hidden="true">
          {erase ? (
            <svg className="cc-eraser" viewBox="0 0 40 24">
              <rect x="1" y="1" width="38" height="22" rx="4" fill="#f4b6c2" stroke="rgba(0,0,0,.3)" />
              <rect x="1" y="1" width="14" height="22" rx="4" fill="#5aa9e6" stroke="rgba(0,0,0,.3)" />
            </svg>
          ) : (
            <span className="cc-stick" style={tipStyle(wear[crayonId] ?? 0)}>
              <CrayonStick color={color} selected={false} wear={wear[crayonId] ?? 0} />
            </span>
          )}
        </div>
      )}
      {empty && !readOnly && !bgItem && (
        <div className="draw-hint">
          <div>
            여기에 오늘을 그려요
            <small>못 그려도 괜찮아요. 그게 그림일기니까요</small>
          </div>
        </div>
      )}
      {empty && !readOnly && bgItem && <div className="draw-hint-chip">배경 위에 오늘의 나를 그려 넣어요</div>}
      {!readOnly && !big && (
        // 그림칸 귀퉁이 단추 — 누른 손가락이 그림으로 번지지 않게 막는다
        <button type="button" className="draw-big" aria-label="크게 그리기 (가로 전체 화면)" onPointerDown={(e) => e.stopPropagation()} onClick={openBig}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
          </svg>
          크게
        </button>
      )}
    </div>
  );

  const crayonBox = (
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
          <CrayonStick color={c.hex} selected={!erase && color === c.hex} wear={wear[c.id] ?? 0} />
        </button>
      ))}
    </div>
  );

  const tools = (
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
      <button type="button" className="tool" aria-label="되돌리기" disabled={empty} onClick={() => onChange(strokes.slice(0, -1))}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 7 4.5 11.5 9 16M5 11.5h9.5a5 5 0 0 1 0 10H12" />
        </svg>
      </button>
      {!erase && (wear[crayonId] ?? 0) >= 0.96 && (
        <button
          type="button"
          className="tool new-crayon"
          onClick={() => {
            newCrayon(crayonId);
            setWear(wearMap());
            pencilTick();
          }}
        >
          새 크레파스 꺼내기
        </button>
      )}
    </div>
  );

  return (
    <div>
      {big ? (
        // 크게 그리는 동안 제자리는 크기만 지킨다 (돌아오면 그린 것이 그대로 다시 그려진다)
        <div className="draw-box draw-away" aria-hidden="true">
          <div className="draw-hint">
            <div>크게 그리는 중이에요</div>
          </div>
        </div>
      ) : (
        drawBox
      )}

      {!readOnly && BACKGROUNDS.length > 0 && (
        <div className="bg-packs" role="group" aria-label="상황별 배경">
          {[{ id: "", name: "전체" }, ...BG_PACKS.filter((p) => BACKGROUNDS.some((b) => b.pack === p.id))].map((p) => (
            <button key={p.id || "all"} type="button" aria-pressed={pack === p.id} onClick={() => setPack(p.id)}>
              {p.name}
            </button>
          ))}
        </div>
      )}
      {!readOnly && BACKGROUNDS.length > 0 && (
        <div className="bg-tray" role="radiogroup" aria-label="배경 고르기">
          <button
            type="button"
            role="radio"
            aria-checked={!bgItem}
            className="bg-tile blank"
            onClick={() => onBg?.(null)}
          >
            <span className="bg-thumb">
              <PencilIcon />
            </span>
            <span className="bg-name">직접 그리기</span>
          </button>
          {onPickMine && (
            <button type="button" className="bg-tile blank mine" onClick={onPickMine}>
              <span className="bg-thumb">
                <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 3.5h11.5a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H6 M6 3.5v17 M3.5 7h4M3.5 12h4M3.5 17h4 M10.5 8h5M10.5 11h4" />
                </svg>
              </span>
              <span className="bg-name">내 그림</span>
            </button>
          )}
          {BACKGROUNDS.filter((b) => !pack || b.pack === pack).map((b) => (
            <button
              key={b.id}
              type="button"
              role="radio"
              aria-checked={bgItem?.id === b.id}
              className="bg-tile"
              onClick={() => onBg?.(b.id)}
            >
              <span className="bg-thumb">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={bgThumb(b.id)} alt="" loading="lazy" />
              </span>
              <span className="bg-name">{b.name}</span>
            </button>
          ))}
        </div>
      )}

      {!readOnly && !big && (
        <>
          {crayonBox}
          {tools}
        </>
      )}

      {/* 크게 그리기: 화면 가득 가로. 세로 휴대폰이면 90도 돌려 보여 준다 (.rot) */}
      {big &&
        createPortal(
          <div className={`pad-full${rot ? " rot" : ""}`} role="dialog" aria-modal="true" aria-label="크게 그리기">
            <div className="pf-stage">
              {drawBox}
              <div className="pf-side">
                {/* 세로로 든 휴대폰: 무대를 시계 방향으로 돌렸으니 폰을 왼쪽으로 눕히면 똑바로 보인다 */}
                {rot && <p className="pf-turn">폰을 왼쪽으로 눕혀서 그려요</p>}
                {crayonBox}
                {tools}
                <button type="button" className="btn pf-done" onClick={closeBig}>
                  다 그렸어요
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
