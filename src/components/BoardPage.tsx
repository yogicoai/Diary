"use client";

// 교실 뒤 게시판: 지난주 참 잘한 일기 + 전체 / 오늘의 숙제 / 같은 해 입학

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { shortDate } from "@/lib/date";
import { useMe } from "@/lib/me";
import { BrandMark } from "./Icons";
import { ReactionIcon, totalReactions } from "./Reactions";

export type BoardItem = {
  id: string;
  date: string;
  title: string;
  body: string;
  teacher: string;
  topic: string | null;
  topicText?: string | null;
  mode: "drawing" | "full";
  thumbUrl: string;
  cardUrl: string;
  at: number;
  nameTag: string;
  reactions: Partial<Record<string, number>>;
};

type Tab = "all" | "topic" | "year";
const TAB_NAMES: Record<Tab, string> = { all: "전체", topic: "오늘의 숙제", year: "같은 해 입학" };

export default function BoardPage() {
  const { me } = useMe();
  const [tab, setTab] = useState<Tab>("all");
  const [items, setItems] = useState<BoardItem[] | null>(null);
  const [more, setMore] = useState(false);
  const [topic, setTopic] = useState("");
  const [needYear, setNeedYear] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [winners, setWinners] = useState<{ rank: number; item: BoardItem }[]>([]);

  const load = useCallback(async (t: Tab, before?: number) => {
    try {
      const res = await api<{ items: BoardItem[]; topic: string; more?: boolean; needYear?: boolean }>(
        `/api/board?tab=${t}${before ? `&before=${before}` : ""}`,
      );
      setTopic(res.topic);
      setNeedYear(!!res.needYear);
      setMore(!!res.more);
      setItems((prev) => (before && prev ? [...prev, ...res.items] : res.items));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "게시판을 못 불러왔어요");
      setItems([]);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 탭이 바뀌면 처음부터 다시
    setItems(null);
    void load(tab);
  }, [tab, load]);

  useEffect(() => {
    api<{ winners: { rank: number; item: BoardItem }[] }>("/api/awards")
      .then((r) => setWinners(r.winners))
      .catch(() => {});
  }, []);

  return (
    <main className="app">
      <header className="topbar">
        <Link href="/" className="brand">
          <BrandMark className="brand-mark" />
          <span>
            <span className="brand-name">교실 뒤 게시판</span>
            <span className="brand-sub">친구들 그림일기에 도장을 찍어 줘요</span>
          </span>
        </Link>
      </header>

      {winners.length > 0 && (
        <section className="winners" aria-label="지난주 참 잘한 일기">
          <h2 className="section-title" style={{ marginTop: 0 }}>
            지난주 참 잘한 일기
          </h2>
          <div className="winner-row">
            {winners.map((w) => (
              <Link key={w.item.id} href={`/board/${w.item.id}`} className="winner">
                <span className={`medal m${w.rank}`}>{w.rank}등</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={w.item.thumbUrl} alt="" />
                <span className="w-name">{w.item.nameTag}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="tabs" role="tablist">
        {(Object.keys(TAB_NAMES) as Tab[]).map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} className="tab-btn" onClick={() => setTab(t)}>
            {TAB_NAMES[t]}
          </button>
        ))}
      </div>
      {tab === "topic" && topic && (
        <p className="topic-line">
          오늘의 숙제 <b>{topic}</b>
        </p>
      )}

      {error && <div className="empty">{error}</div>}
      {tab === "year" && needYear && (
        <div className="empty">
          {me ? "이름표에 입학 연도를 적으면 같은 해 입학한 친구들 일기를 모아 볼 수 있어요." : "가입하면 같은 해 입학한 친구들 일기를 모아 볼 수 있어요."}
          <Link href="/me" className="btn" style={{ marginTop: 16 }}>
            {me ? "이름표 고치기" : "이름표 만들기"}
          </Link>
        </div>
      )}
      {items === null && <div className="empty">게시판을 보는 중…</div>}
      {items && items.length === 0 && !needYear && !error && (
        <div className="empty">
          아직 붙은 일기가 없어요.
          <br />첫 번째로 붙여 볼까요?
          <Link href="/" className="btn" style={{ marginTop: 16 }}>
            오늘 쓰기
          </Link>
        </div>
      )}

      <div className="pinboard">
        {items?.map((it, i) => (
          <Link key={it.id} href={`/board/${it.id}`} className="pinned" style={{ rotate: `${((i * 37) % 5) - 2}deg` }}>
            <span className="pin" aria-hidden="true" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={it.thumbUrl} alt="" loading="lazy" />
            <span className="p-title">{it.title || "제목 없는 날"}</span>
            <span className="p-meta">
              {it.nameTag} · {shortDate(it.date)}
            </span>
            {totalReactions(it.reactions) > 0 && (
              <span className="p-stamps">
                <ReactionIcon kind="cham" size={18} />
                {totalReactions(it.reactions)}
              </span>
            )}
          </Link>
        ))}
      </div>
      {more && items && (
        <button type="button" className="btn plain" onClick={() => load(tab, items[items.length - 1]?.at)}>
          더 보기
        </button>
      )}
    </main>
  );
}
