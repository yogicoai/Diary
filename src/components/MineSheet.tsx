"use client";

// 내가 예전에 그린 그림 가져오기: 지난 일기의 배경 + 크레파스 그림을 오늘 그림칸으로 (이어 그리기)

import { useEffect, useState } from "react";
import { shortDate } from "@/lib/date";
import { listDiaries, type Diary } from "@/lib/store";
import { renderThumb } from "@/lib/thumb";
import Sheet from "./Sheet";

function Thumb({ d }: { d: Diary }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    renderThumb(d, 240, 180).then((c) => alive && setSrc(c.toDataURL("image/webp", 0.8)));
    return () => {
      alive = false;
    };
  }, [d]);
  // eslint-disable-next-line @next/next/no-img-element
  return <span className="mine-thumb">{src && <img src={src} alt="" />}</span>;
}

export default function MineSheet({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (d: Diary) => void;
}) {
  const [list, setList] = useState<Diary[] | null>(null);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    listDiaries().then((all) => alive && setList(all.filter((d) => d.strokes.length > 0 || d.bg)));
    return () => {
      alive = false;
    };
  }, [open]);

  return (
    <Sheet open={open} onClose={onClose} label="내 그림 가져오기">
      <h2>내 그림 가져오기</h2>
      <p>예전에 그린 그림을 오늘 그림칸에 깔고 이어서 그려요. 배경과 크레파스 그림이 같이 와요.</p>
      {list === null && <p style={{ marginTop: 14 }}>일기장을 넘기는 중…</p>}
      {list?.length === 0 && <p style={{ marginTop: 14, color: "var(--ink)" }}>아직 그린 그림이 없어요. 오늘 첫 그림을 그려 볼까요?</p>}
      <div className="mine-grid">
        {list?.map((d) => (
          <button key={d.id} type="button" className="mine-item" onClick={() => onPick(d)}>
            <Thumb d={d} />
            <span className="mine-title">{d.title || "제목 없는 날"}</span>
            <span className="mine-date">{shortDate(d.date)}</span>
          </button>
        ))}
      </div>
    </Sheet>
  );
}
