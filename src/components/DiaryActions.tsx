"use client";

// 일기 하나로 할 수 있는 참여: 교실 뒤 게시판에 붙이기 / 우리 반에 보내기
// 쓰기 화면(낸 뒤)과 내 일기장 양쪽에서 쓴다.

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { renderCard } from "@/lib/card";
import { useMe } from "@/lib/me";
import { saveDiary, track, type Diary } from "@/lib/store";
import { pushDiary } from "@/lib/sync";
import { canvasBlob, renderThumb } from "@/lib/thumb";
import { LoginSheet } from "./LoginBox";
import Sheet from "./Sheet";

type Props = { diary: Diary; onChange: (d: Diary) => void; onToast: (m: string) => void };

async function ensureServer(d: Diary): Promise<Diary> {
  if (d.serverId) return d;
  const res = await pushDiary(d);
  return { ...d, serverId: res.diary.serverId };
}

export default function DiaryActions({ diary, onChange, onToast }: Props) {
  const { me } = useMe();
  const [sheet, setSheet] = useState<null | "board" | "class" | "login-board" | "login-class">(null);
  const onBoard = diary.board?.status === "visible";
  const here = typeof window === "undefined" ? "/diary" : location.pathname;

  return (
    <>
      <div className="btn-row">
        <button type="button" className="btn plain" onClick={() => setSheet(me ? "board" : "login-board")}>
          {onBoard ? "게시판에 붙어 있어요" : "게시판에 붙이기"}
        </button>
        <button type="button" className="btn plain" onClick={() => setSheet(me ? "class" : "login-class")}>
          우리 반에 보내기
        </button>
      </div>
      <PublishSheet open={sheet === "board"} diary={diary} onClose={() => setSheet(null)} onChange={onChange} onToast={onToast} />
      <ClassShareSheet open={sheet === "class"} diary={diary} onClose={() => setSheet(null)} onChange={onChange} onToast={onToast} />
      <LoginSheet
        open={sheet === "login-board" || sheet === "login-class"}
        onClose={() => setSheet(null)}
        next={here === "/" ? "/diary" : here}
        why={sheet === "login-board" ? "교실 뒤 게시판에 붙이려면 이름표가 필요해요." : "우리 반에 보내려면 이름표가 필요해요."}
      />
    </>
  );
}

function PublishSheet({ open, diary, onClose, onChange, onToast }: Props & { open: boolean; onClose: () => void }) {
  const [mode, setMode] = useState<"drawing" | "full">("drawing");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const board = diary.board;

  const publish = async () => {
    setBusy(true);
    setError(null);
    try {
      const d = await ensureServer(diary);
      // 그림만 붙일 땐 카드의 글씨를 크레파스로 가린다
      const [card, thumb] = await Promise.all([
        renderCard({ ...d, secret: mode === "drawing" ? true : d.secret }).then((c) => canvasBlob(c, "image/webp", 0.85)),
        renderThumb(d).then((c) => canvasBlob(c, "image/webp", 0.82)),
      ]);
      const fd = new FormData();
      fd.set("mode", mode);
      fd.set("card", card, "card.webp");
      fd.set("thumb", thumb, "thumb.webp");
      const res = await fetch(`/api/diaries/${d.serverId}/publish`, { method: "POST", body: fd });
      const data = (await res.json().catch(() => ({}))) as { diary?: Diary; message?: string };
      if (!res.ok || !data.diary) throw new ApiError(res.status, "publish", data.message ?? "붙이지 못했어요");
      const next = { ...d, board: data.diary.board };
      await saveDiary(next);
      onChange(next);
      track("board_publish", { mode, status: data.diary.board?.status });
      onToast(data.diary.board?.status === "pending" ? "선생님이 확인하고 붙여 줄게요" : "교실 뒤 게시판에 붙였어요");
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "붙이지 못했어요");
    } finally {
      setBusy(false);
    }
  };

  const unpublish = async () => {
    if (!diary.serverId) return;
    setBusy(true);
    try {
      await api(`/api/diaries/${diary.serverId}/publish`, { method: "DELETE" });
      const next = { ...diary, board: null };
      await saveDiary(next);
      onChange(next);
      onToast("게시판에서 뗐어요");
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "떼지 못했어요");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} label="교실 뒤 게시판">
      <h2>교실 뒤 게시판</h2>
      {diary.secret ? (
        <p>비밀 일기는 게시판에 붙일 수 없어요. 우리 반에는 글을 가리고 보낼 수 있어요.</p>
      ) : board ? (
        <>
          <p>
            {board.status === "visible" && "게시판에 붙어 있어요. 친구들이 도장을 찍어 줄 거예요."}
            {board.status === "pending" && (board.note ?? "선생님이 확인하고 붙여 줄게요.")}
            {board.status === "hidden" && (board.note ?? "지금은 게시판에서 내려가 있어요.")}
          </p>
          <div className="btn-row">
            {board.status === "visible" && diary.serverId ? (
              <Link className="btn" href={`/board/${diary.serverId}`}>
                게시판에서 보기
              </Link>
            ) : (
              <span />
            )}
            <button type="button" className="btn plain" onClick={unpublish} disabled={busy}>
              게시판에서 떼기
            </button>
          </div>
        </>
      ) : (
        <>
          <p>모두가 보는 게시판이에요. 어떻게 붙일까요?</p>
          <div className="plans" role="radiogroup" aria-label="붙이는 방법">
            {(
              [
                ["drawing", "그림만 붙이기", "글씨는 크레파스로 가리고 그림과 제목만"],
                ["full", "글까지 붙이기", "그림·제목·일기·선생님 한 줄까지"],
              ] as const
            ).map(([v, t, s]) => (
              <button key={v} type="button" role="radio" aria-checked={mode === v} className="plan" onClick={() => setMode(v)}>
                <span>
                  <b style={{ fontSize: 19 }}>{t}</b>
                  <small>{s}</small>
                </span>
              </button>
            ))}
          </div>
          {error && <p className="form-error">{error}</p>}
          <button type="button" className="btn" onClick={publish} disabled={busy}>
            {busy ? "선생님이 살펴보는 중…" : "게시판에 붙이기"}
          </button>
          <p className="note">
            붙이기 전에 AI 선생님(미국 Anthropic 의 Claude)이 붙일 그림과 글을 보고 게시판 약속을 확인해요. 전화번호·주소·실명과 회사처럼
            누군지 알 수 있는 내용은 빼 주세요.
          </p>
        </>
      )}
    </Sheet>
  );
}

type ClassLite = { id: string; name: string; members: number };

function ClassShareSheet({ open, diary, onClose, onChange, onToast }: Props & { open: boolean; onClose: () => void }) {
  const [classes, setClasses] = useState<ClassLite[] | null>(null);
  const [picked, setPicked] = useState<string[]>(diary.classIds ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    api<{ classes: ClassLite[] }>("/api/classes")
      .then((r) => alive && setClasses(r.classes))
      .catch(() => alive && setClasses([]));
    return () => {
      alive = false;
    };
  }, [open]);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const d = await ensureServer(diary);
      const res = await api<{ diary: Diary }>(`/api/diaries/${d.serverId}`, { method: "PATCH", json: { classIds: picked } });
      const next = { ...d, classIds: res.diary.classIds };
      await saveDiary(next);
      onChange(next);
      track("class_share", { n: picked.length });
      onToast(picked.length ? "우리 반에 보냈어요" : "우리 반에서 거뒀어요");
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "보내지 못했어요");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} label="우리 반에 보내기">
      <h2>우리 반에 보내기</h2>
      <p>반 친구들만 볼 수 있어요.{diary.secret ? " 비밀 일기라 글은 가리고 그림만 보여요." : ""}</p>
      {classes === null && <p style={{ marginTop: 14 }}>반 목록을 가져오는 중…</p>}
      {classes?.length === 0 && (
        <p style={{ marginTop: 14, color: "var(--ink)" }}>
          아직 반이 없어요. <Link href="/class">우리 반 만들기</Link>
        </p>
      )}
      {!!classes?.length && (
        <div className="plans">
          {classes.map((c) => {
            const on = picked.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                role="checkbox"
                aria-checked={on}
                className="plan"
                onClick={() => setPicked((p) => (on ? p.filter((x) => x !== c.id) : [...p, c.id]))}
              >
                <span>
                  <b style={{ fontSize: 19 }}>{c.name}</b>
                  <small>친구 {c.members}명</small>
                </span>
                <span className="price">{on ? "보내기" : ""}</span>
              </button>
            );
          })}
        </div>
      )}
      {error && <p className="form-error">{error}</p>}
      {!!classes?.length && (
        <button type="button" className="btn" onClick={save} disabled={busy}>
          {busy ? "보내는 중…" : "보내기"}
        </button>
      )}
    </Sheet>
  );
}
