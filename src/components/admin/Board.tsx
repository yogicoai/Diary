"use client";

// 게시판 검사: 확인할 것(검사 대기·신고된 것) / 숨긴 것 / 보이는 중

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { useAdmin } from "./AdminShell";
import DiaryDrawer from "./DiaryDrawer";
import { Badge, ErrorBox, fmtAgo, fmtDateKey, Loading, PageHead, useAdminGet } from "./kit";

type Tab = "todo" | "hidden" | "visible";
type Item = {
  id: string;
  userId: string;
  nameTag: string;
  date: string;
  title: string;
  body: string;
  mode: "drawing" | "full";
  thumbUrl: string;
  status: "visible" | "pending" | "hidden";
  checked: boolean;
  note: string | null;
  at: number;
  reactions: number;
  reports: string[];
};

const TABS: { key: Tab; label: string }[] = [
  { key: "todo", label: "확인할 것" },
  { key: "hidden", label: "숨긴 것" },
  { key: "visible", label: "보이는 중" },
];
const STATUS = { visible: ["green", "보이는 중"], pending: ["amber", "검사 대기"], hidden: ["red", "숨김"] } as const;

export default function Board() {
  const params = useSearchParams();
  const first = params.get("tab");
  const [tab, setTab] = useState<Tab>(first === "hidden" || first === "visible" ? first : "todo");
  const { say, refreshMe } = useAdmin();
  const { data, error, at, loading, reload } = useAdminGet<{ counts: Record<Tab, number>; items: Item[] }>(`/api/admin/board?tab=${tab}`, true);
  const [opened, setOpened] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const act = async (id: string, action: "approve" | "hide") => {
    if (busy) return;
    setBusy(id);
    try {
      await api(`/api/admin/board/${id}`, { method: "POST", json: { action } });
      say(action === "approve" ? "게시판에 보이게 했어요" : "게시판에서 내렸어요");
      reload();
      refreshMe();
    } catch (e) {
      say(e instanceof Error ? e.message : "처리하지 못했어요", "error");
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <PageHead title="게시판 검사" desc="AI 검사를 못 거친 일기와 신고된 일기를 여기서 확인해요. 신고가 3건 모이면 저절로 숨겨져요." />
      <div className="adm-tabs" role="tablist" aria-label="게시판 검사">
        {TABS.map((t) => (
          <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} className="adm-tab" onClick={() => setTab(t.key)}>
            {t.label}
            {data && <span>{data.counts[t.key]}</span>}
          </button>
        ))}
      </div>
      {error && <ErrorBox msg={error} retry={reload} />}
      {!data && !error && <Loading rows={2} />}
      {data && data.items.length === 0 && (
        <p className="adm-empty">{tab === "todo" ? "확인할 일기가 없어요. 깨끗해요!" : tab === "hidden" ? "숨긴 일기가 없어요" : "게시판에 보이는 일기가 없어요"}</p>
      )}
      {data && data.items.length > 0 && (
        <div className="adm-posts" aria-busy={loading}>
          {data.items.map((it) => {
            const [tone, word] = STATUS[it.status];
            return (
              <article key={it.id} className="adm-post">
                <button type="button" className="adm-post-open" onClick={() => setOpened(it.id)} aria-label={`${it.title || "제목 없는"} 일기 펼쳐 보기`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {it.thumbUrl ? <img className="adm-post-thumb" src={it.thumbUrl} alt="" loading="lazy" /> : <div className="adm-post-thumb" />}
                </button>
                <div className="adm-post-body">
                  <span className="adm-badges">
                    <Badge tone={tone}>{word}</Badge>
                    {!it.checked && <Badge tone="amber">AI 검사 못 함</Badge>}
                    {it.reports.length > 0 && <Badge tone="red">신고 {it.reports.length}</Badge>}
                  </span>
                  <span className="adm-post-title">{it.title || "제목 없음"}</span>
                  <span className="adm-sub" style={{ marginTop: 0 }}>
                    <Link href={`/admin/members/${it.userId}`}>{it.nameTag}</Link> · {fmtDateKey(it.date)} · {fmtAgo(it.at, at)}에 붙임 · 도장 {it.reactions}
                  </span>
                  {it.body && <p className="adm-post-text">{it.body}</p>}
                  {it.reports.length > 0 && (
                    <span className="adm-badges">
                      {it.reports.map((r, i) => (
                        <span key={i} className="adm-chip">
                          {r}
                        </span>
                      ))}
                    </span>
                  )}
                  {it.note && <span className="adm-sub">{it.note}</span>}
                  <div className="adm-post-actions">
                    {(it.status !== "visible" || it.reports.length > 0) && (
                      <button type="button" className="adm-btn sm primary" disabled={busy === it.id} onClick={() => void act(it.id, "approve")}>
                        {it.status === "visible" ? "괜찮아요" : "보이기"}
                      </button>
                    )}
                    {it.status !== "hidden" && (
                      <button type="button" className="adm-btn sm danger" disabled={busy === it.id} onClick={() => void act(it.id, "hide")}>
                        내리기
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
      <DiaryDrawer id={opened} onClose={() => setOpened(null)} onChanged={reload} />
    </>
  );
}
