"use client";

// 회원 목록 · 회원 한 명 (이름표·로그인 방법·들어간 반·일기·짝꿍 한마디·상장, 정지하기)

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAdmin } from "./AdminShell";
import DiaryDrawer from "./DiaryDrawer";
import { gradeText } from "@/lib/social";
import {
  Badge,
  Card,
  Confirm,
  ErrorBox,
  fmtAgo,
  fmtDateKey,
  fmtDay,
  Icon,
  Loading,
  loginText,
  PageHead,
  Pager,
  PersonBadges,
  Privacy,
  Stat,
  useAdminGet,
  type Person,
} from "./kit";

type ClassChip = { id: string; name: string; owner: boolean };
type Row = Person & {
  id: string;
  nameTag: string;
  createdAt: number;
  lastSeenAt: number;
  diaries: number;
  board: number;
  classShared: number;
  lastDiaryAt: number | null;
  classes: ClassChip[];
};

export function MembersList() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"" | "staff" | "banned">("");
  const [sort, setSort] = useState<"new" | "active">("new");
  const [page, setPage] = useState(0);

  // 글자 칠 때마다 부르지 않게 잠깐 기다렸다가 찾는다
  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(q.trim());
      setPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const url = `/api/admin/members?q=${encodeURIComponent(query)}&kind=${kind}&sort=${sort}&page=${page}`;
  const { data, error, at, loading, reload } = useAdminGet<{ total: number; page: number; pageSize: number; rows: Row[] }>(url, true);

  return (
    <>
      <PageHead
        title="학생 명부"
        desc="로그인한 학생만 여기 보여요. 일기는 기기에 먼저 저장되고, 로그인하면 서버와 합쳐져요."
        right={data && <span className="total">{data.total}명</span>}
      />
      <div className="adm-toolbar">
        <label className="adm-search">
          <Icon name="search" size={18} />
          <input className="adm-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="별명·이메일·아이디로 찾기" aria-label="학생 찾기" />
        </label>
        <div className="adm-seg" role="group" aria-label="거르기">
          {(
            [
              ["", "전체"],
              ["staff", "선생님"],
              ["banned", "정지됨"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              aria-pressed={kind === k}
              onClick={() => {
                setKind(k);
                setPage(0);
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <select
          className="adm-select"
          value={sort}
          onChange={(e) => {
            setSort(e.target.value as "new" | "active");
            setPage(0);
          }}
          aria-label="줄 세우기"
        >
          <option value="new">새로 온 순</option>
          <option value="active">최근 들어온 순</option>
        </select>
      </div>

      {error && <ErrorBox msg={error} retry={reload} />}
      {!data && !error && <Loading rows={2} />}
      {data && (
        <div className="adm-table-wrap" aria-busy={loading}>
          <table className="adm-table">
            <thead>
              <tr>
                <th>이름표</th>
                <th>로그인</th>
                <th>들어간 반</th>
                <th className="num">일기</th>
                <th>입학</th>
                <th>최근 출석</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="adm-empty">
                    {query || kind ? "맞는 학생이 없어요" : "아직 학생이 없어요"}
                  </td>
                </tr>
              )}
              {data.rows.map((r) => {
                const lg = loginText(r);
                return (
                  <tr key={r.id} className="click" onClick={() => router.push(`/admin/members/${r.id}`)}>
                    <td>
                      <Link href={`/admin/members/${r.id}`} className="adm-name" onClick={(e) => e.stopPropagation()}>
                        {r.nameTag}
                      </Link>{" "}
                      <PersonBadges p={r} />
                    </td>
                    <td>
                      {lg.kind}
                      <span className="adm-sub">{lg.detail}</span>
                    </td>
                    <td>
                      {r.classes.length === 0 ? (
                        <span className="muted">—</span>
                      ) : (
                        <>
                          {r.classes.slice(0, 2).map((c) => (
                            <span key={c.id} className="adm-chip">
                              {c.owner && <em>반장</em>}
                              {c.name}
                            </span>
                          ))}
                          {r.classes.length > 2 && <span className="adm-chip">+{r.classes.length - 2}</span>}
                        </>
                      )}
                    </td>
                    <td className="num">
                      {r.diaries}편
                      <span className="adm-sub">게시판 {r.board} · 반 {r.classShared}</span>
                    </td>
                    <td className="nowrap">{fmtDay(r.createdAt)}</td>
                    <td className="nowrap">{fmtAgo(r.lastSeenAt, at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {data && <Pager page={page} total={data.total} size={data.pageSize} onPage={setPage} />}
    </>
  );
}

/* ── 회원 한 명 ── */
type DiaryRow = {
  id: string;
  date: string;
  createdAt: number;
  late: boolean;
  open: boolean;
  title: string | null;
  board: { status: "visible" | "pending" | "hidden"; mode: string; thumbUrl: string; reports: number } | null;
  classes: { id: string; name: string }[];
  reactions: number;
};
type Detail = {
  person: Person & { id: string; nameTag: string; nickname: string; age: number | null; createdAt: number; lastSeenAt: number };
  counts: { diaries: number; board: number; classShared: number; alone: number; stampsGot: number; stampsGiven: number; reportsOn: number; reportsMade: number };
  classes: { id: string; name: string; owner: boolean; members: number; code: string }[];
  diaries: DiaryRow[];
  awards: { id: string; label: string; detail: string; at: number }[];
  notes: { id: string; diaryId: string; text: string; at: number }[];
};

const BOARD_TONE = { visible: "green", pending: "amber", hidden: "red" } as const;
const BOARD_WORD = { visible: "게시판", pending: "게시판 검사 대기", hidden: "게시판 숨김" } as const;

export function MemberDetail({ id }: { id: string }) {
  const { say } = useAdmin();
  const { data, error, at, reload } = useAdminGet<Detail>(`/api/admin/members/${id}`);
  const [opened, setOpened] = useState<string | null>(null);
  const [ask, setAsk] = useState<"ban" | "unban" | null>(null);
  const [busy, setBusy] = useState(false);

  const doBan = async () => {
    if (!ask || busy) return;
    setBusy(true);
    try {
      const r = await api<{ hidden?: number }>(`/api/admin/members/${id}`, { method: "POST", json: { action: ask } });
      say(ask === "ban" ? `정지했어요${r.hidden ? ` · 게시판 일기 ${r.hidden}장을 내렸어요` : ""}` : "정지를 풀었어요");
      setAsk(null);
      reload();
    } catch (e) {
      say(e instanceof Error ? e.message : "처리하지 못했어요", "error");
    } finally {
      setBusy(false);
    }
  };

  if (error) {
    return (
      <>
        <PageHead title="학생" back={{ href: "/admin/members", label: "학생 명부" }} />
        <ErrorBox msg={error} retry={reload} />
      </>
    );
  }
  if (!data) {
    return (
      <>
        <PageHead title="학생" back={{ href: "/admin/members", label: "학생 명부" }} />
        <Loading rows={3} />
      </>
    );
  }

  const p = data.person;
  const lg = loginText(p);
  const c = data.counts;

  return (
    <>
      <PageHead title="학생" back={{ href: "/admin/members", label: "학생 명부" }} />
      <Card>
        <div className="adm-profile">
          <div>
            <h1>{p.nameTag}</h1>
            <span className="adm-badges">
              <Badge>{lg.kind} 로그인</Badge>
              {p.staff && <Badge tone="blue">{p.staff === "developer" ? "전산 선생님" : "교장 선생님"}</Badge>}
              {p.banned && <Badge tone="red">정지</Badge>}
            </span>
          </div>
          {!p.staff &&
            (p.banned ? (
              <button type="button" className="adm-btn" onClick={() => setAsk("unban")}>
                정지 풀기
              </button>
            ) : (
              <button type="button" className="adm-btn danger" onClick={() => setAsk("ban")}>
                정지하기
              </button>
            ))}
          <dl className="adm-dl">
            <div>
              <dt>{lg.kind === "구글" ? "구글 이메일" : lg.kind === "아이디" ? "아이디" : "로그인"}</dt>
              <dd>{lg.detail || "—"}</dd>
            </div>
            <div>
              <dt>이름표</dt>
              <dd>
                {p.age ? `올해 ${p.age}살 · ${gradeText(p.age)}` : "나이 안 적음"} · {p.nickname}
              </dd>
            </div>
            <div>
              <dt>입학</dt>
              <dd>{fmtDay(p.createdAt)}</dd>
            </div>
            <div>
              <dt>최근 출석</dt>
              <dd>{fmtAgo(p.lastSeenAt, at)}</dd>
            </div>
          </dl>
        </div>
      </Card>

      <div className="adm-stats five adm-section">
        <Stat label="올라온 일기" value={`${c.diaries}편`} sub={`혼자 ${c.alone} · 반 ${c.classShared} · 게시판 ${c.board}`} />
        <Stat label="받은 도장·스티커" value={`${c.stampsGot}개`} />
        <Stat label="찍어 준 도장·스티커" value={`${c.stampsGiven}개`} />
        <Stat label="신고 받음" value={`${c.reportsOn}건`} alert={c.reportsOn > 0} sub={`신고한 것 ${c.reportsMade}건`} />
        <Stat label="상장" value={`${data.awards.length}장`} sub={data.awards[0]?.label ?? "아직 없음"} />
      </div>

      <Card title="들어간 반" aside={`${data.classes.length}개`} className="adm-section">
        {data.classes.length === 0 ? (
          <p className="adm-empty" style={{ padding: "16px 0" }}>
            아직 들어간 반이 없어요
          </p>
        ) : (
          <ul className="adm-list">
            {data.classes.map((k) => (
              <li key={k.id}>
                <Link href={`/admin/classes/${k.id}`} className="grow adm-name">
                  {k.name}
                </Link>
                {k.owner ? <Badge tone="blue">반장</Badge> : <Badge>친구</Badge>}
                <span className="end">
                  {k.members}/30명 · 코드 {k.code}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="일기" aside={`${data.diaries.length}편`} className="adm-section">
        <Privacy>선생님도 남에게 보여 준 일기(게시판·반)만 펼쳐 볼 수 있어요. 혼자 쓴 일기는 날짜만 보여요.</Privacy>
        {data.diaries.length === 0 ? (
          <p className="adm-empty" style={{ padding: "16px 0" }}>
            올라온 일기가 없어요
          </p>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table narrow">
              <thead>
                <tr>
                  <th>날짜</th>
                  <th>어디에 냈나</th>
                  <th>제목</th>
                  <th className="num">도장</th>
                </tr>
              </thead>
              <tbody>
                {data.diaries.map((d) => (
                  <tr key={d.id} className={d.open ? "click" : ""} onClick={d.open ? () => setOpened(d.id) : undefined}>
                    <td className="nowrap">
                      {fmtDateKey(d.date)}
                      {d.late && <span className="adm-sub">밀린 숙제</span>}
                    </td>
                    <td>
                      {!d.open && <Badge>혼자</Badge>}
                      {d.board && <Badge tone={BOARD_TONE[d.board.status]}>{BOARD_WORD[d.board.status]}</Badge>}{" "}
                      {d.classes.map((k) => (
                        <span key={k.id} className="adm-chip">
                          {k.name}
                        </span>
                      ))}
                    </td>
                    <td>
                      {d.open ? (
                        <button type="button" className="adm-name" onClick={(e) => (e.stopPropagation(), setOpened(d.id))}>
                          {d.title || "제목 없음"}
                        </button>
                      ) : (
                        <span className="muted">
                          <Icon name="lock" size={14} /> 혼자 쓴 일기
                        </span>
                      )}
                    </td>
                    <td className="num">{d.reactions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="adm-grid2">
        <Card title="최근 짝꿍 한마디" aside="반 친구 일기에 남긴 것">
          {data.notes.length === 0 ? (
            <p className="adm-empty" style={{ padding: "16px 0" }}>
              남긴 한마디가 없어요
            </p>
          ) : (
            <ul className="adm-notes">
              {data.notes.map((n) => (
                <li key={n.id}>
                  {n.text}
                  <small>{fmtAgo(n.at, at)}</small>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="상장" aside={`${data.awards.length}장`}>
          {data.awards.length === 0 ? (
            <p className="adm-empty" style={{ padding: "16px 0" }}>
              아직 받은 상장이 없어요
            </p>
          ) : (
            <ul className="adm-list">
              {data.awards.map((a) => (
                <li key={a.id}>
                  <span className="grow">
                    <b>{a.label}</b>
                    <span className="adm-sub">{a.detail}</span>
                  </span>
                  <span className="end">{fmtDay(a.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <DiaryDrawer id={opened} onClose={() => setOpened(null)} onChanged={reload} />
      {ask && (
        <Confirm
          title={ask === "ban" ? `${p.nameTag} 님을 정지할까요?` : "정지를 풀까요?"}
          body={
            ask === "ban"
              ? "정지하면 이 계정으로 들어올 수 없고, 게시판에 보이던 일기도 모두 내려가요. 나중에 정지를 풀 수 있어요."
              : "다시 들어올 수 있게 돼요. 내려간 게시판 일기는 '게시판 검사'에서 하나씩 다시 보이게 할 수 있어요."
          }
          yes={ask === "ban" ? "정지하기" : "정지 풀기"}
          danger={ask === "ban"}
          busy={busy}
          onYes={() => void doBan()}
          onNo={() => setAsk(null)}
        />
      )}
    </>
  );
}
