"use client";

// 반 목록 · 반 하나 (반장·친구들·반에 낸 일기·짝꿍 한마디·반 숙제)

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import DiaryDrawer from "./DiaryDrawer";
import { Badge, Card, ErrorBox, fmtAgo, fmtDateKey, fmtDay, Icon, Loading, PageHead, Pager, Stat, useAdminGet } from "./kit";

type Row = {
  id: string;
  name: string;
  code: string;
  owner: { id: string; nameTag: string } | null;
  members: number;
  diaries: number;
  lastDiaryAt: number | null;
  homework: { date: string; text: string } | null;
  createdAt: number;
};

export function ClassesList() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(q.trim());
      setPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const { data, error, at, loading, reload } = useAdminGet<{ total: number; pageSize: number; rows: Row[] }>(
    `/api/admin/classes?q=${encodeURIComponent(query)}&page=${page}`,
    true,
  );

  return (
    <>
      <PageHead title="반" desc="친구끼리 만든 반이에요. 한 반은 30명까지, 초대 코드로 들어와요." right={data && <span className="total">{data.total}개</span>} />
      <div className="adm-toolbar">
        <label className="adm-search">
          <Icon name="search" size={18} />
          <input className="adm-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="반 이름·초대 코드로 찾기" aria-label="반 찾기" />
        </label>
      </div>
      {error && <ErrorBox msg={error} retry={reload} />}
      {!data && !error && <Loading rows={2} />}
      {data && (
        <div className="adm-table-wrap" aria-busy={loading}>
          <table className="adm-table">
            <thead>
              <tr>
                <th>반 이름</th>
                <th>반장</th>
                <th className="num">친구</th>
                <th className="num">반에 낸 일기</th>
                <th>최근 일기</th>
                <th>최근 반 숙제</th>
                <th>만든 날</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="adm-empty">
                    {query ? "맞는 반이 없어요" : "아직 만든 반이 없어요"}
                  </td>
                </tr>
              )}
              {data.rows.map((r) => (
                <tr key={r.id} className="click" onClick={() => router.push(`/admin/classes/${r.id}`)}>
                  <td>
                    <Link href={`/admin/classes/${r.id}`} className="adm-name" onClick={(e) => e.stopPropagation()}>
                      {r.name}
                    </Link>
                    <span className="adm-sub">코드 {r.code}</span>
                  </td>
                  <td>
                    {r.owner ? (
                      <Link href={`/admin/members/${r.owner.id}`} onClick={(e) => e.stopPropagation()}>
                        {r.owner.nameTag}
                      </Link>
                    ) : (
                      <span className="muted">나간 반장</span>
                    )}
                  </td>
                  <td className="num">{r.members}/30</td>
                  <td className="num">{r.diaries}편</td>
                  <td className="nowrap">{fmtAgo(r.lastDiaryAt, at)}</td>
                  <td>{r.homework ? <span title={r.homework.text}>{fmtDateKey(r.homework.date)} · {r.homework.text.slice(0, 16)}</span> : <span className="muted">—</span>}</td>
                  <td className="nowrap">{fmtDay(r.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && <Pager page={page} total={data.total} size={data.pageSize} onPage={setPage} />}
    </>
  );
}

type Detail = {
  class: { id: string; name: string; code: string; createdAt: number; homework: { date: string; text: string } | null; ownerId: string };
  members: { id: string; nameTag: string; login: "google" | "id" | "dev"; owner: boolean; banned: boolean; diaries: number; lastDiaryAt: number | null; lastSeenAt: number }[];
  diaries: { id: string; userId: string; nameTag: string; date: string; createdAt: number; title: string; body: string; secret: boolean; reactions: number; notes: number }[];
  notes: { id: string; diaryId: string; by: string; text: string; at: number }[];
};

const LOGIN = { google: "구글", id: "아이디", dev: "개발용" } as const;

export function ClassDetail({ id }: { id: string }) {
  const { data, error, at, reload } = useAdminGet<Detail>(`/api/admin/classes/${id}`);
  const [opened, setOpened] = useState<string | null>(null);

  if (error || !data) {
    return (
      <>
        <PageHead title="반" back={{ href: "/admin/classes", label: "반 목록" }} />
        {error ? <ErrorBox msg={error} retry={reload} /> : <Loading rows={3} />}
      </>
    );
  }
  const c = data.class;
  const owner = data.members.find((m) => m.owner);
  const writers = data.members.filter((m) => m.diaries > 0).length;

  return (
    <>
      <PageHead title={c.name} desc={`초대 코드 ${c.code} · ${fmtDay(c.createdAt)}에 만듦`} back={{ href: "/admin/classes", label: "반 목록" }} />
      <div className="adm-stats">
        <Stat label="친구" value={`${data.members.length}/30명`} sub={owner ? `반장 ${owner.nameTag}` : "반장이 나갔어요"} />
        <Stat label="반에 낸 일기" value={`${data.diaries.length}편`} sub={`일기를 낸 친구 ${writers}명`} />
        <Stat label="짝꿍 한마디" value={`${data.notes.length}개`} sub={c.homework ? `최근 반 숙제 ${fmtDateKey(c.homework.date)}` : "반 숙제 없음"} />
      </div>

      {c.homework && (
        <Card title="최근 반 숙제" aside={fmtDateKey(c.homework.date)} className="adm-section">
          <p style={{ margin: 0 }}>{c.homework.text}</p>
        </Card>
      )}

      <Card title="친구들" aside={`${data.members.length}명`} className="adm-section">
        <div className="adm-table-wrap">
          <table className="adm-table narrow">
            <thead>
              <tr>
                <th>이름표</th>
                <th>로그인</th>
                <th className="num">이 반에 낸 일기</th>
                <th>최근 낸 날</th>
                <th>최근 출석</th>
              </tr>
            </thead>
            <tbody>
              {data.members.map((m) => (
                <tr key={m.id}>
                  <td>
                    <Link href={`/admin/members/${m.id}`} className="adm-name">
                      {m.nameTag}
                    </Link>{" "}
                    {m.owner && <Badge tone="blue">반장</Badge>} {m.banned && <Badge tone="red">정지</Badge>}
                  </td>
                  <td>{LOGIN[m.login]}</td>
                  <td className="num">{m.diaries}편</td>
                  <td className="nowrap">{fmtAgo(m.lastDiaryAt, at)}</td>
                  <td className="nowrap">{fmtAgo(m.lastSeenAt, at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="adm-grid2">
        <Card title="반에 낸 일기" aside="최근 60편">
          {data.diaries.length === 0 ? (
            <p className="adm-empty" style={{ padding: "16px 0" }}>
              아직 반에 낸 일기가 없어요
            </p>
          ) : (
            <ul className="adm-list">
              {data.diaries.map((d) => (
                <li key={d.id}>
                  <button type="button" className="grow" style={{ textAlign: "left" }} onClick={() => setOpened(d.id)}>
                    <b>{d.title || "제목 없음"}</b>
                    <span className="adm-sub">
                      {d.nameTag} · {fmtDateKey(d.date)}
                      {d.secret ? " · 비밀 일기(글 안 보임)" : d.body ? ` · ${d.body}` : ""}
                    </span>
                  </button>
                  <span className="end">
                    도장 {d.reactions} · 한마디 {d.notes}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="짝꿍 한마디" aside="최근 40개">
          {data.notes.length === 0 ? (
            <p className="adm-empty" style={{ padding: "16px 0" }}>
              아직 남긴 한마디가 없어요
            </p>
          ) : (
            <ul className="adm-notes">
              {data.notes.map((n) => (
                <li key={n.id}>
                  {n.text}
                  <small>
                    {n.by} · {fmtAgo(n.at, at)}
                  </small>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      <DiaryDrawer id={opened} onClose={() => setOpened(null)} onChanged={reload} />
    </>
  );
}
