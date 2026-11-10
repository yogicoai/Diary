"use client";

// 칭찬 스티커판 (11-10 사용자: "숙제 스티커는 월별로 관리, 달이 지나면 새 판, 지난 것은 월별로 확인, 이걸로 친구방에 자랑하기"):
// 달마다 달력 모양 판 한 장 — 오늘의 숙제를 검사받은 날 칸에 그날 받은 스티커가 붙는다. 다음 달 1일엔 새 빈 판, 지난 판은 ‹ 로 넘겨 본다.
// 이번 달 판은 우리 반에 자랑할 수 있다(반 화면 '칭찬 스티커 자랑', 숙제 내용은 빼고 스티커만).
// 숙제 10·30·100번 상장은 전체 횟수로 (서버 lib/server/homework.ts)

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Homework } from "@/lib/homework";
import { kstToday } from "@/lib/social";
import { StickerSvg } from "./PraiseStickers";
import Sheet from "./Sheet";

const WEEK = ["일", "월", "화", "수", "목", "금", "토"];

function shiftMonth(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}

export default function StickerBoard() {
  const [data, setData] = useState<{ count: number; list: Homework[] } | null>(null);
  const [today, setToday] = useState("");
  const [month, setMonth] = useState("");
  const [brag, setBrag] = useState(false);

  useEffect(() => {
    let alive = true;
    const t = kstToday();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 오늘·이번 달은 기기 시계 기준
    setToday(t);
    setMonth(t.slice(0, 7));
    api<{ count: number; list: Homework[] }>("/api/homework/mine", { cache: "no-store" })
      .then((d) => alive && setData(d))
      .catch(() => alive && setData({ count: 0, list: [] }));
    return () => {
      alive = false;
    };
  }, []);

  if (!data || !month) return null;
  const thisMonth = today.slice(0, 7);
  const first = data.list[0]?.date.slice(0, 7) ?? thisMonth; // 처음 숙제한 달부터 넘겨 볼 수 있다
  const byDate = new Map(data.list.filter((h) => h.date.startsWith(month)).map((h) => [h.date, h]));
  const got = byDate.size;
  const [y, m] = month.split("-").map(Number);
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const lead = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const n = data.count;
  const next = n < 10 ? 10 : n < 30 ? 30 : n < 100 ? 100 : null;
  const isNow = month === thisMonth;

  return (
    <section id="stickers" className="sticker-board" aria-label="칭찬 스티커판">
      <h2 className="section-title">칭찬 스티커판</h2>
      <div className="sb-card">
        <div className="sb-head">
          <button type="button" className="tool" aria-label="지난달 판" onClick={() => setMonth(shiftMonth(month, -1))} disabled={month <= first}>
            ‹
          </button>
          <p className="sb-title">
            {y}년 {m}월 <b>{got}장</b>
          </p>
          <button type="button" className="tool" aria-label="다음 달 판" onClick={() => setMonth(shiftMonth(month, 1))} disabled={isNow}>
            ›
          </button>
        </div>
        <div className="sb-cal">
          {WEEK.map((w, i) => (
            <span key={w} className={`sb-w${i === 0 ? " sun" : ""}`}>
              {w}
            </span>
          ))}
          {Array.from({ length: lead }, (_, i) => (
            <span key={`e${i}`} />
          ))}
          {Array.from({ length: days }, (_, i) => {
            const key = `${month}-${String(i + 1).padStart(2, "0")}`;
            const h = byDate.get(key);
            return (
              <span key={key} className={`sb-day${h ? " on" : ""}${key === today ? " today" : ""}${key > today ? " later" : ""}`} title={h ? `${m}월 ${i + 1}일 · ${h.mission}` : undefined}>
                {h ? <StickerSvg id={h.sticker} size={40} /> : <span className="sb-num">{i + 1}</span>}
              </span>
            );
          })}
        </div>
        <p className="note">
          {isNow
            ? got
              ? `이번 달에 ${got}장 모았어요. 다음 달 1일엔 새 판이 나와요. 지난 판은 ‹ 로 볼 수 있어요.`
              : "오늘의 숙제를 하고 숙제 검사를 받으면 그날 칸에 스티커를 붙여 줘요."
            : `${m}월에 ${got}장 모았어요.`}
          {n > 0 && (next ? ` 숙제 ${n}번째, 상장까지 ${next - n}번 남았어요.` : ` 숙제를 ${n}번이나 했어요. 숙제 대장!`)}
        </p>
        {isNow && got > 0 && (
          <button type="button" className="btn plain sb-brag" onClick={() => setBrag(true)}>
            우리 반에 자랑하기
          </button>
        )}
      </div>
      <BragSheet open={brag} onClose={() => setBrag(false)} month={m} count={got} />
    </section>
  );
}

/** 이번 달 스티커판을 우리 반에 걸기 (반마다 걸기·내리기) */
function BragSheet({ open, onClose, month, count }: { open: boolean; onClose: () => void; month: number; count: number }) {
  const [classes, setClasses] = useState<{ id: string; name: string }[] | null>(null);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    api<{ classes: { id: string; name: string; bragged?: boolean }[] }>("/api/classes")
      .then((r) => {
        if (!alive) return;
        setClasses(r.classes);
        setDone(new Set(r.classes.filter((c) => c.bragged).map((c) => c.id)));
      })
      .catch(() => alive && setClasses([]));
    return () => {
      alive = false;
    };
  }, [open]);

  const toggle = async (id: string) => {
    setError(null);
    const on = done.has(id);
    try {
      await api(`/api/classes/${id}/brag`, { method: on ? "DELETE" : "POST" });
      setDone((s) => {
        const n = new Set(s);
        if (on) n.delete(id);
        else n.add(id);
        return n;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "자랑하지 못했어요");
    }
  };

  return (
    <Sheet open={open} onClose={onClose} label="우리 반에 자랑하기">
      <h2>우리 반에 자랑하기</h2>
      <p>
        {month}월 칭찬 스티커 {count}장을 반 친구들에게 보여 줘요. 숙제 내용은 안 보이고 스티커만 보여요. 이번 달에 더 모으면 자랑판도 같이 늘어나요.
      </p>
      {classes === null && <p style={{ marginTop: 14 }}>반을 찾는 중…</p>}
      {classes?.length === 0 && (
        <>
          <p style={{ marginTop: 14, color: "var(--ink)" }}>아직 들어간 반이 없어요.</p>
          <Link href="/class" className="btn plain" onClick={onClose}>
            우리 반 만들러 가기
          </Link>
        </>
      )}
      <div className="brag-picks">
        {classes?.map((c) => (
          <button key={c.id} type="button" className={`btn plain${done.has(c.id) ? " on" : ""}`} aria-pressed={done.has(c.id)} onClick={() => void toggle(c.id)}>
            {done.has(c.id) ? `${c.name}에 걸었어요 (내리기)` : `${c.name}에 자랑하기`}
          </button>
        ))}
      </div>
      {error && <p className="form-error">{error}</p>}
    </Sheet>
  );
}
