"use client";

// 게시판 일기 하나: 카드 그림 + 친구 도장·스티커 + 신고

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useMe } from "@/lib/me";
import { REPORT_REASONS } from "@/lib/social";
import type { BoardItem } from "./BoardPage";
import { LoginSheet } from "./LoginBox";
import Reactions from "./Reactions";
import Sheet from "./Sheet";

type Detail = { item: BoardItem; status: string; note: string | null; mine: boolean; myReactions: string[]; loggedIn: boolean };

export default function BoardDetail({ id }: { id: string }) {
  const { me } = useMe();
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [login, setLogin] = useState(false);
  const [report, setReport] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    api<Detail>(`/api/board/${id}`)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "일기를 못 찾았어요"));
  }, [id, me?.id]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const sendReport = async (reason: string) => {
    try {
      await api(`/api/board/${id}/report`, { method: "POST", json: { reason } });
      setToast("알려 줘서 고마워요. 선생님이 확인할게요");
    } catch (e) {
      setToast(e instanceof Error ? e.message : "신고하지 못했어요");
    }
    setReport(false);
  };

  return (
    <main className="app">
      <header className="topbar">
        <Link href="/board" className="toplink">
          ← 게시판
        </Link>
      </header>
      {error && <div className="empty">{error}</div>}
      {!data && !error && <div className="empty">일기를 펼치는 중…</div>}
      {data && (
        <>
          <p className="received" style={{ marginBottom: 4 }}>
            {data.item.nameTag}의 그림일기
          </p>
          {data.item.topic && <p className="topic-chip">오늘의 숙제로 쓴 일기</p>}
          {data.status !== "visible" && <p className="care-note">{data.note ?? "지금은 게시판에 보이지 않아요"}</p>}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="board-card" src={data.item.cardUrl} alt={`${data.item.title} 그림일기`} />
          {data.mine ? (
            <p className="note" style={{ textAlign: "center" }}>
              내 일기예요. 친구들이 찍어 준 도장 {Object.values(data.item.reactions).reduce<number>((a, b) => a + (b ?? 0), 0)}개
            </p>
          ) : (
            <>
              <Reactions
                diaryId={id}
                initial={data.item.reactions}
                mine={data.myReactions}
                canReact={!!me}
                onNeedLogin={() => setLogin(true)}
                onToast={setToast}
              />
              <p className="note" style={{ textAlign: "center" }}>
                <button type="button" className="linkish" onClick={() => (me ? setReport(true) : setLogin(true))}>
                  게시판 약속에 안 맞아요 (신고)
                </button>
              </p>
            </>
          )}
        </>
      )}
      <LoginSheet open={login} onClose={() => setLogin(false)} next={`/board/${id}`} why="친구 일기에 도장을 찍으려면 이름표가 필요해요." />
      <Sheet open={report} onClose={() => setReport(false)} label="신고하기">
        <h2>어떤 점이 문제인가요?</h2>
        <div className="plans">
          {REPORT_REASONS.map((r) => (
            <button key={r} type="button" className="plan" onClick={() => sendReport(r)}>
              <span>{r}</span>
            </button>
          ))}
        </div>
      </Sheet>
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </main>
  );
}
