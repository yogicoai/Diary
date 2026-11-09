"use client";

// 관리자: 오늘의 숙제 — 선생님(운영자)이 날짜별로 숙제·한마디를 걸고, 숙제마다 몇 명이 썼는지 본다.
// 안 걸어 둔 날은 lib/topics.ts 의 그날만의 숙제·요일 숙제가 자동으로 나간다.

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { WEEKDAY_NAMES, WEEKDAY_TOPICS, type TopicKind } from "@/lib/topics";
import { useAdmin } from "./AdminShell";
import { Badge, Card, Confirm, ErrorBox, fmtDateKey, Loading, PageHead, Stat, useAdminGet } from "./kit";

type Up = { date: string; weekday: number; text: string; kind: TopicKind; subject: string | null; note: string | null };
type Past = { date: string; weekday: number; text: string; kind: TopicKind; written: number; board: number };
type Shared = {
  id: string;
  userId: string;
  nameTag?: string;
  date: string;
  mission: string;
  text: string;
  thumbUrl: string | null;
  photoUrl: string | null;
  status: "visible" | "pending" | "hidden";
  checked: boolean;
};
type Data = { today: string; todayWritten: number; upcoming: Up[]; past: Past[]; best: Past[]; shared: Shared[] };

const KIND: Record<TopicKind, { tone: "blue" | "amber" | "gray"; word: string }> = {
  teacher: { tone: "blue", word: "선생님" },
  special: { tone: "amber", word: "그날만의 숙제" },
  weekday: { tone: "gray", word: "요일 숙제" },
  legacy: { tone: "gray", word: "예전 돌림" },
};

const day = (d: string, w: number) => `${fmtDateKey(d)} (${WEEKDAY_NAMES[w]})`;

export default function Topics() {
  const { say, refreshMe } = useAdmin();
  const [judging, setJudging] = useState<string | null>(null);

  const judge = async (id: string, action: "approve" | "hide") => {
    setJudging(id);
    try {
      await api(`/api/admin/homework/${id}`, { method: "POST", json: { action } });
      say(action === "approve" ? "게시판에 보이게 했어요" : "게시판에서 내렸어요");
      reload();
      refreshMe();
    } catch (x) {
      say(x instanceof Error ? x.message : "처리하지 못했어요", "error");
    } finally {
      setJudging(null);
    }
  };
  const { data, error, reload } = useAdminGet<Data>("/api/admin/topics");
  const [form, setForm] = useState<{ date: string; text: string; note: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [undo, setUndo] = useState<Up | null>(null);

  const f = form ?? { date: data?.today ?? "", text: "", note: "" };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await api("/api/admin/topics", { method: "POST", json: f });
      say(`${fmtDateKey(f.date)} 숙제를 걸었어요`);
      setForm(null);
      reload();
    } catch (x) {
      say(x instanceof Error ? x.message : "걸지 못했어요", "error");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!undo) return;
    setBusy(true);
    try {
      await api(`/api/admin/topics?date=${undo.date}`, { method: "DELETE" });
      say(`${fmtDateKey(undo.date)}은 요일 숙제로 돌아갔어요`);
      setUndo(null);
      reload();
    } catch (x) {
      say(x instanceof Error ? x.message : "되돌리지 못했어요", "error");
    } finally {
      setBusy(false);
    }
  };

  const today = data?.upcoming[0];

  return (
    <>
      <PageHead
        title="숙제 내기"
        desc="오늘의 숙제는 그날의 어른이 미션이에요. 학생들은 사진 한 장이나 한 줄로 숙제 검사를 받고 칭찬 스티커를 모아요. 선생님이 날짜별로 숙제를 걸어 둘 수 있고, 안 걸어 둔 날은 그날만의 숙제·요일 숙제가 나가요."
      />
      {error && <ErrorBox msg={error} retry={reload} />}
      {!data && !error && <Loading rows={3} />}
      {data && today && (
        <>
          <div className="adm-stats">
            <Stat label="오늘 숙제" value={today.text} sub={today.note ?? KIND[today.kind].word} />
            <Stat label="오늘 숙제 한 사람" value={`${data.todayWritten}명`} sub="숙제 검사를 받은 학생" />
            <Stat
              label="최근 30일 가장 반응 좋은 숙제"
              value={data.best[0] ? `${data.best[0].written}명` : "—"}
              sub={data.best[0] ? `${data.best[0].text} · ${fmtDateKey(data.best[0].date)}` : "아직 숙제를 한 학생이 없어요"}
            />
          </div>

          <Card title="숙제 걸기" aside="숙제 칸에서 안 잘리게 14자 안쪽이 좋아요" className="adm-section">
            <form className="adm-topic-form" onSubmit={(e) => void save(e)}>
              <label className="adm-field">
                <span>날짜</span>
                <input className="adm-input" type="date" min={data.today} value={f.date} onChange={(e) => setForm({ ...f, date: e.target.value })} required />
              </label>
              <label className="adm-field grow">
                <span>
                  숙제 <em className={f.text.length > 14 ? "warn" : ""}>{f.text.length}/24</em>
                </span>
                <input className="adm-input" value={f.text} maxLength={24} onChange={(e) => setForm({ ...f, text: e.target.value })} placeholder="예: 빼빼로 주고 싶은 사람" required />
              </label>
              <label className="adm-field grow">
                <span>
                  선생님 한마디 (빨간 펜, 없어도 돼요) <em>{f.note.length}/40</em>
                </span>
                <input className="adm-input" value={f.note} maxLength={40} onChange={(e) => setForm({ ...f, note: e.target.value })} placeholder="예: 한 상자 다 먹어도 오늘은 봐줄게요." />
              </label>
              <button type="submit" className="adm-btn primary" disabled={busy || !f.date || f.text.trim().length < 2}>
                숙제 걸기
              </button>
            </form>
          </Card>

          <Card title="앞으로 3주" aside="누가 정한 숙제인지" className="adm-section">
            <div className="adm-table-wrap">
              <table className="adm-table narrow">
                <thead>
                  <tr>
                    <th>날짜</th>
                    <th>숙제</th>
                    <th>정한 곳</th>
                    <th>선생님 한마디</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {data.upcoming.map((u) => (
                    <tr key={u.date}>
                      <td className="nowrap">
                        {day(u.date, u.weekday)}
                        {u.date === data.today && <span className="adm-sub">오늘</span>}
                      </td>
                      <td>
                        <b>{u.text}</b>
                      </td>
                      <td className="nowrap">
                        <Badge tone={KIND[u.kind].tone}>{KIND[u.kind].word}</Badge>
                        {u.kind === "weekday" && u.subject && <span className="adm-sub">{u.subject}</span>}
                      </td>
                      <td className="adm-muted" style={{ fontSize: 13 }}>
                        {u.note ?? "—"}
                      </td>
                      <td className="nowrap" style={{ textAlign: "right" }}>
                        <button type="button" className="adm-btn sm" onClick={() => setForm({ date: u.date, text: u.kind === "teacher" ? u.text : "", note: u.kind === "teacher" ? (u.note ?? "") : "" })}>
                          {u.kind === "teacher" ? "고치기" : "바꾸기"}
                        </button>{" "}
                        {u.kind === "teacher" && (
                          <button type="button" className="adm-btn sm danger" onClick={() => setUndo(u)}>
                            되돌리기
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="adm-grid2">
            <Card title="반응 좋은 숙제" aside="최근 30일, 숙제 한 사람 수">
              {data.best.length === 0 ? (
                <p className="adm-empty" style={{ padding: "16px 0" }}>
                  아직 숙제를 한 학생이 없어요
                </p>
              ) : (
                <ul className="adm-list">
                  {data.best.map((b, i) => (
                    <li key={b.date}>
                      <span className="adm-badge blue">{i + 1}등</span>
                      <span className="grow">
                        <b>{b.text}</b>
                        <span className="adm-sub">{day(b.date, b.weekday)}</span>
                      </span>
                      <span className="val">{b.written}명</span>
                      <span className="end">게시판 {b.board}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card title="지난 숙제" aside="최근 30일">
              <ul className="adm-list" style={{ maxHeight: 360, overflowY: "auto" }}>
                {data.past.map((p) => (
                  <li key={p.date}>
                    <span className="nowrap adm-muted" style={{ fontSize: 13, minWidth: 92 }}>
                      {day(p.date, p.weekday)}
                    </span>
                    <span className="grow">{p.text}</span>
                    <span className="val">{p.written}명</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <Card title="보여 주기 숙제 검사" aside="게시판 '오늘의 숙제'에 보여 주기로 낸 것 (최근 30개)" className="adm-section">
            {data.shared.length === 0 ? (
              <p className="adm-empty" style={{ padding: "16px 0" }}>
                아직 보여 주기로 낸 숙제가 없어요
              </p>
            ) : (
              <div className="adm-posts">
                {data.shared.map((h) => (
                  <article key={h.id} className="adm-post">
                    {h.thumbUrl ? (
                      <a href={h.photoUrl ?? h.thumbUrl} target="_blank" rel="noreferrer" className="adm-post-open">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img className="adm-post-thumb" src={h.thumbUrl} alt="" loading="lazy" />
                      </a>
                    ) : null}
                    <div className="adm-post-body">
                      <span className="adm-badges">
                        <Badge tone={h.status === "visible" ? "green" : h.status === "pending" ? "amber" : "red"}>
                          {h.status === "visible" ? "보이는 중" : h.status === "pending" ? "검사 대기" : "숨김"}
                        </Badge>
                        {!h.checked && <Badge tone="amber">AI 검사 못 함</Badge>}
                      </span>
                      <span className="adm-post-title">{h.mission}</span>
                      {h.text && <p className="adm-post-text">{h.text}</p>}
                      <span className="adm-sub">
                        <Link href={`/admin/members/${h.userId}`}>{h.nameTag}</Link> · {fmtDateKey(h.date)}
                      </span>
                      <div className="adm-post-actions">
                        {h.status !== "visible" && (
                          <button type="button" className="adm-btn sm primary" disabled={judging === h.id} onClick={() => void judge(h.id, "approve")}>
                            보이기
                          </button>
                        )}
                        {h.status !== "hidden" && (
                          <button type="button" className="adm-btn sm danger" disabled={judging === h.id} onClick={() => void judge(h.id, "hide")}>
                            내리기
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </Card>

          <Card title="요일별 숙제 묶음" aside="안 걸어 둔 날 자동으로 나가는 숙제 (주마다 돌아가요)" className="adm-section">
            <ul className="adm-list">
              {WEEKDAY_TOPICS.map((g, i) => (
                <li key={g.subject} style={{ alignItems: "flex-start" }}>
                  <span className="adm-badge" style={{ minWidth: 92, justifyContent: "center" }}>
                    {WEEKDAY_NAMES[i]} · {g.subject}
                  </span>
                  <span className="grow">
                    {g.list.map(([t, n]) => (
                      <span key={t} className="adm-chip" title={n}>
                        {t}
                      </span>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
      {undo && (
        <Confirm
          title={`${fmtDateKey(undo.date)} 선생님 숙제를 되돌릴까요?`}
          body={`"${undo.text}" 대신 그날의 요일 숙제가 나가요. 이미 이 숙제로 낸 일기는 그대로예요.`}
          yes="되돌리기"
          danger
          busy={busy}
          onYes={() => void remove()}
          onNo={() => setUndo(null)}
        />
      )}
    </>
  );
}
