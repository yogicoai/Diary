"use client";

// 선생님 확인함: 확인 대기·숨김·신고된 일기

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

type Item = {
  id: string;
  title: string;
  body: string;
  nameTag: string;
  thumbUrl: string;
  status: string;
  checked: boolean;
  note: string | null;
  reports: string[];
};

export default function AdminPage() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api<{ items: Item[] }>("/api/admin")
      .then((r) => setItems(r.items))
      .catch((e) => setError(e instanceof Error ? e.message : "못 불러왔어요"));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (id: string, action: "approve" | "hide") => {
    await api(`/api/admin/${id}`, { method: "POST", json: { action } }).catch(() => {});
    load();
  };

  return (
    <main className="app">
      <header className="topbar">
        <Link href="/me" className="toplink">
          ← 나
        </Link>
        <b>선생님 확인함</b>
      </header>
      {error && <div className="empty">{error}</div>}
      {items?.length === 0 && <div className="empty">확인할 일기가 없어요</div>}
      {items?.map((it) => (
        <article key={it.id} className="feed-item">
          <div className="feed-head">
            <b>{it.nameTag}</b>
            <span>
              {it.status === "pending" ? "확인 대기" : it.status === "hidden" ? "숨김" : "보이는 중"}
              {it.checked ? " · AI 검사함" : " · AI 검사 못 함"}
            </span>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {it.thumbUrl && <img src={it.thumbUrl} alt="" style={{ width: "100%", borderRadius: 6 }} />}
          <h3>{it.title || "제목 없음"}</h3>
          <p>{it.body}</p>
          {it.reports.length > 0 && <p className="form-error">신고 {it.reports.length}건: {it.reports.join(", ")}</p>}
          <div className="btn-row">
            <button type="button" className="btn" onClick={() => act(it.id, "approve")}>
              게시판에 보이기
            </button>
            <button type="button" className="btn plain" onClick={() => act(it.id, "hide")}>
              내리기
            </button>
          </div>
        </article>
      ))}
    </main>
  );
}
