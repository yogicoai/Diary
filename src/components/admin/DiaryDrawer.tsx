"use client";

// 일기 한 편 펼쳐 보기 (오른쪽 서랍). 남에게 보여 준 일기만 — 혼자 쓴 일기는 날짜만 보인다.

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { REACTIONS } from "@/lib/social";
import type { Stroke } from "@/lib/crayon";
import { renderThumb } from "@/lib/thumb";
import { weatherById, type WeatherId } from "@/lib/weather";
import { useAdmin } from "./AdminShell";
import { Badge, ErrorBox, fmtAgo, fmtDateKey, Icon, Loading, useAdminGet } from "./kit";

type Opened =
  | { private: true; id: string; date: string; createdAt: number; owner: { id: string; nameTag: string } }
  | {
      private: false;
      id: string;
      owner: { id: string; nameTag: string };
      date: string;
      createdAt: number;
      weather: WeatherId | null;
      title: string;
      body: string;
      bodyHidden: boolean;
      secret: boolean;
      late: boolean;
      teacher: string;
      teacherBy: "ai" | "rule";
      strokes: Stroke[];
      bg: string | null;
      board: { status: "visible" | "pending" | "hidden"; mode: "drawing" | "full"; cardUrl: string; checked: boolean; note: string | null } | null;
      classes: { id: string; name: string }[];
      reactions: Partial<Record<string, number>>;
      notes: { id: string; by: string; text: string; at: number }[];
      reports: string[];
    };

const BOARD_LABEL = { visible: "게시판에 보이는 중", pending: "게시판 검사 대기", hidden: "게시판에서 숨김" } as const;

export default function DiaryDrawer({ id, onClose, onChanged }: { id: string | null; onClose: () => void; onChanged?: () => void }) {
  const { say, refreshMe } = useAdmin();
  const { data, error, at, reload } = useAdminGet<Opened>(id ? `/api/admin/diaries/${id}` : null);
  const [img, setImg] = useState<{ id: string; src: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const closeBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!id) return;
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [id, onClose]);

  // 그림은 획 그대로 다시 그린다 (게시판 카드와 같은 그림칸)
  useEffect(() => {
    if (!data || data.private) return;
    let alive = true;
    void renderThumb({ strokes: data.strokes, bg: data.bg }, 640, 480).then((c) => alive && setImg({ id: data.id, src: c.toDataURL("image/webp", 0.9) }));
    return () => {
      alive = false;
    };
  }, [data]);

  if (!id) return null;

  const act = async (action: "approve" | "hide") => {
    if (!data || busy) return;
    setBusy(true);
    try {
      await api(`/api/admin/board/${data.id}`, { method: "POST", json: { action } });
      say(action === "approve" ? "게시판에 다시 보이게 했어요" : "게시판에서 내렸어요");
      reload();
      refreshMe();
      onChanged?.();
    } catch (e) {
      say(e instanceof Error ? e.message : "처리하지 못했어요", "error");
    } finally {
      setBusy(false);
    }
  };

  const open = data && !data.private ? data : null;
  const w = open ? weatherById(open.weather) : undefined;

  return (
    <>
      <div className="adm-scrim" onClick={onClose} />
      <aside className="adm-drawer" role="dialog" aria-modal="true" aria-labelledby="adm-drawer-title">
        <div className="adm-drawer-head">
          <h2 id="adm-drawer-title">{data ? `${fmtDateKey(data.date)} 일기` : "일기"}</h2>
          <button type="button" className="adm-x" onClick={onClose} ref={closeBtn} aria-label="닫기">
            <Icon name="close" />
          </button>
        </div>
        <div className="adm-drawer-body">
          {error && <ErrorBox msg={error} retry={reload} />}
          {!data && !error && <Loading rows={2} />}
          {data && (
            <p style={{ margin: 0, fontSize: 14 }}>
              <Link href={`/admin/members/${data.owner.id}`} className="adm-name" onClick={onClose}>
                {data.owner.nameTag}
              </Link>{" "}
              <span className="adm-muted">· {fmtAgo(data.createdAt, at)}에 씀</span>
            </p>
          )}
          {data?.private && (
            <p className="adm-note">
              <Icon name="lock" size={16} />
              <span>혼자 쓴 일기예요. 게시판에도 반에도 보여 주지 않아서 운영자는 날짜만 볼 수 있어요.</span>
            </p>
          )}
          {open && (
            <>
              <div className="adm-badges">
                {open.board && <Badge tone={open.board.status === "visible" ? "green" : open.board.status === "pending" ? "amber" : "red"}>{BOARD_LABEL[open.board.status]}</Badge>}
                {open.board && <Badge>{open.board.mode === "full" ? "글까지 붙임" : "그림만 붙임"}</Badge>}
                {open.classes.map((c) => (
                  <Badge key={c.id} tone="blue">
                    {c.name} 반에 냄
                  </Badge>
                ))}
                {open.secret && <Badge>비밀 일기</Badge>}
                {open.late && <Badge>밀린 숙제</Badge>}
                {w && <Badge>날씨 {w.label}</Badge>}
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {img?.id === open.id ? <img className="adm-drawing" src={img.src} alt={`${open.title || "제목 없는"} 그림`} /> : <div className="adm-drawing" />}
              <div>
                <h3 className="adm-diary-title">{open.title || "제목 없음"}</h3>
                {open.body ? (
                  <p className="adm-diary-text" style={{ marginTop: 8 }}>
                    {open.body}
                  </p>
                ) : (
                  open.bodyHidden && (
                    <p className="adm-muted" style={{ margin: "8px 0 0", fontSize: 14 }}>
                      글은 남에게 보여 주지 않아서 운영자도 볼 수 없어요.
                    </p>
                  )
                )}
              </div>
              {open.teacher && (
                <div>
                  <p className="adm-h3">선생님 한 줄 {open.teacherBy === "ai" ? "(AI)" : "(기본)"}</p>
                  <p className="adm-teacher">{open.teacher}</p>
                </div>
              )}
              <div>
                <p className="adm-h3">받은 도장·스티커</p>
                <div className="adm-badges">
                  {REACTIONS.map((r) => (
                    <span key={r.kind} className="adm-chip">
                      {r.label} <em>{open.reactions[r.kind] ?? 0}</em>
                    </span>
                  ))}
                </div>
              </div>
              {open.reports.length > 0 && (
                <div>
                  <p className="adm-h3">신고 {open.reports.length}건</p>
                  <div className="adm-badges">
                    {open.reports.map((r, i) => (
                      <Badge key={i} tone="red">
                        {r}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {open.board?.note && <p className="adm-note">{open.board.note}</p>}
              {open.notes.length > 0 && (
                <div>
                  <p className="adm-h3">짝꿍 한마디 {open.notes.length}개</p>
                  <ul className="adm-notes">
                    {open.notes.map((n) => (
                      <li key={n.id}>
                        {n.text}
                        <small>
                          {n.by} · {fmtAgo(n.at, at)}
                        </small>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
        {open?.board && (
          <div className="adm-drawer-foot">
            {open.board.status !== "visible" || open.reports.length > 0 ? (
              <button type="button" className="adm-btn primary" disabled={busy} onClick={() => void act("approve")}>
                {open.board.status === "visible" ? "괜찮아요 (신고 지우기)" : "게시판에 보이기"}
              </button>
            ) : null}
            {open.board.status !== "hidden" && (
              <button type="button" className="adm-btn danger" disabled={busy} onClick={() => void act("hide")}>
                게시판에서 내리기
              </button>
            )}
          </div>
        )}
      </aside>
    </>
  );
}
