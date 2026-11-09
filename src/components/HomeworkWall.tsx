"use client";

// 교실 뒤 게시판 '오늘의 숙제' 칸: 오늘 숙제 + 몇 명이 했나 + 보여 주기로 낸 숙제 검사(사진·한 줄)
// 다른 어른이들은 짝꿍에게 빼빼로를 줬을까? 구경하는 재미.

import Link from "next/link";
import { useHomework } from "@/lib/homework";
import { StickerSvg } from "./PraiseStickers";

export default function HomeworkWall() {
  const { data } = useHomework(null);
  if (!data) return <div className="empty">숙제 검사함을 여는 중…</div>;
  return (
    <section className="hw-wall" aria-label="오늘의 숙제">
      <div className="hw-wall-head">
        <p className="tb-row">
          <span className={`tb-label${data.mission.kind === "teacher" ? " by-teacher" : ""}`}>{data.mission.kind === "teacher" ? "선생님 숙제" : "오늘의 숙제"}</span>
          <b className="tb-topic">{data.mission.text}</b>
        </p>
        {data.mission.note && <p className="tb-note">{data.mission.note}</p>}
        <p className="tb-extra">
          오늘 {data.count}명이 숙제를 했어요{data.shared.length ? ` · ${data.shared.length}명이 보여 줬어요` : ""}
        </p>
        <Link href="/" className="btn plain">
          {data.mine ? "내 숙제 보러 가기" : "나도 숙제 하러 가기"}
        </Link>
      </div>
      {data.shared.length === 0 ? (
        <div className="empty">
          아직 보여 준 숙제가 없어요.
          <br />첫 번째로 보여 줄까요?
        </div>
      ) : (
        <div className="hw-grid">
          {data.shared.map((h, i) => (
            <figure key={h.id} className="hw-card" style={{ rotate: `${((i * 37) % 5) - 2}deg` }}>
              <span className="tape" aria-hidden="true" />
              {h.thumbUrl ? (
                <a href={h.photoUrl ?? h.thumbUrl} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={h.thumbUrl} alt={h.text || `${h.nameTag}의 숙제 사진`} loading="lazy" />
                </a>
              ) : (
                <p className="hw-card-text">{h.text}</p>
              )}
              <figcaption>
                {h.thumbUrl && h.text && <span className="hw-card-line">{h.text}</span>}
                <span className="hw-card-who">{h.nameTag}</span>
              </figcaption>
              <span className="hw-card-sticker">
                <StickerSvg id={h.sticker} size={40} />
              </span>
            </figure>
          ))}
        </div>
      )}
    </section>
  );
}
