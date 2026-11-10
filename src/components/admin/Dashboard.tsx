"use client";

// 대시보드: 오늘 숫자 · 최근 14일 막대 · 나이별(학년·반) · 참여 / 개발자 계정엔 연결 상태·처리 기록

import { Card, ErrorBox, fmtAgo, fmtDateKey, Loading, PageHead, Stat, useAdminGet } from "./kit";
import { gradeText } from "@/lib/social";

type Day = { date: string; n: number };
type Dash = {
  members: { total: number; today: number; week: number; activeToday: number; banned: number };
  diaries: { total: number; today: number; week: number; shared: number };
  board: { visible: number; pending: number; hidden: number; reported: number };
  classes: { total: number; avgMembers: number };
  reactions: number;
  notes: number;
  days: { diaries: Day[]; members: Day[] };
  cohorts: { age: number | null; n: number }[]; // 나이별 (어른이 초등학교 학년·반)
  system: {
    checks: { key: string; label: string; on: boolean; note: string }[];
    log: { at: number; by: string; action: "ban" | "unban" | "approve" | "hide"; target: string; note: string | null }[];
  } | null;
};

const ACTION: Record<string, string> = { ban: "학생 정지", unban: "정지 풀기", approve: "게시판 보이기", hide: "게시판 내리기", topic: "숙제 걸기", untopic: "숙제 되돌리기" };

export default function Dashboard() {
  const { data, error, at, reload } = useAdminGet<Dash>("/api/admin/dashboard");

  return (
    <>
      <PageHead title="교무 일지" desc="오늘 우리 학교 모습이에요. 오늘 숫자는 한국 시각 0시부터, 학생 수에서 선생님 아이디(fe·yogico)는 빠져요." />
      {error && <ErrorBox msg={error} retry={reload} />}
      {!data && !error && <Loading rows={3} />}
      {data && (
        <>
          <div className="adm-stats six">
            <Stat label="학생" value={`${data.members.total}명`} sub={`오늘 +${data.members.today} · 이번 주 +${data.members.week}`} href="/admin/members" />
            <Stat label="오늘 출석" value={`${data.members.activeToday}명`} sub={`정지 ${data.members.banned}명`} />
            <Stat label="올라온 일기" value={`${data.diaries.total}편`} sub={`오늘 ${data.diaries.today} · 이번 주 ${data.diaries.week}`} />
            <Stat label="게시판" value={`${data.board.visible}장`} sub={`숨긴 것 ${data.board.hidden}장`} href="/admin/board" />
            <Stat
              label="검사할 것"
              value={`${data.board.pending + data.board.reported}건`}
              sub={`검사 대기 ${data.board.pending} · 신고 ${data.board.reported}`}
              href="/admin/board"
              alert={data.board.pending + data.board.reported > 0}
            />
            <Stat label="반" value={`${data.classes.total}개`} sub={`한 반 평균 ${data.classes.avgMembers.toFixed(1)}명`} href="/admin/classes" />
          </div>

          <div className="adm-grid2">
            <Card title="쓴 일기" aside="최근 14일 · 올라온 것">
              <Bars rows={data.days.diaries} unit="편" />
            </Card>
            <Card title="새로 온 학생" aside="최근 14일">
              <Bars rows={data.days.members} unit="명" />
            </Card>
          </div>

          <div className="adm-grid2">
            <Card title="학년·반별 학생" aside="이름표의 나이 = 어른이 초등학교 학년·반">
              <Cohorts rows={data.cohorts} />
            </Card>
            <Card title="학교생활">
              <ul className="adm-list">
                <li>
                  <span className="grow">반·게시판에 보여 준 일기</span>
                  <span className="val">{data.diaries.shared}편</span>
                </li>
                <li>
                  <span className="grow">친구들이 찍어 준 도장·스티커</span>
                  <span className="val">{data.reactions}개</span>
                </li>
                <li>
                  <span className="grow">짝꿍 한마디</span>
                  <span className="val">{data.notes}개</span>
                </li>
                <li>
                  <span className="grow">혼자만 쓴 일기 (내용은 선생님도 못 봐요)</span>
                  <span className="val">{data.diaries.total - data.diaries.shared}편</span>
                </li>
              </ul>
            </Card>
          </div>

          {data.system && (
            <div className="adm-grid2">
              <Card title="시설 점검" aside="전산 선생님만 보여요">
                <ul className="adm-list">
                  {data.system.checks.map((c) => (
                    <li key={c.key}>
                      <span className={`adm-badge ${c.on ? "green" : "gray"}`}>{c.on ? "켜짐" : "꺼짐"}</span>
                      <span className="grow">{c.label}</span>
                      <span className="end">{c.note}</span>
                    </li>
                  ))}
                </ul>
              </Card>
              <Card title="교무 기록" aside="전산 선생님만 보여요">
                {data.system.log.length === 0 ? (
                  <p className="adm-empty" style={{ padding: "24px 0" }}>
                    아직 처리한 일이 없어요
                  </p>
                ) : (
                  <ul className="adm-list">
                    {data.system.log.map((l, i) => (
                      <li key={i}>
                        <span className="adm-badge">{ACTION[l.action] ?? l.action}</span>
                        <span className="grow" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {l.note ?? l.target}
                        </span>
                        <span className="end">
                          {l.by} · {fmtAgo(l.at, at)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          )}
        </>
      )}
    </>
  );
}

/** 한 가지 값의 최근 14일 막대 — 파랑 하나, 막대마다 마우스·키보드로 값이 뜬다 */
function Bars({ rows, unit }: { rows: Day[]; unit: string }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  const total = rows.reduce((a, r) => a + r.n, 0);
  const last = rows[rows.length - 1];
  return (
    <figure className="adm-bars">
      <div className="adm-bars-plot" role="list" aria-label={`최근 14일, 모두 ${total}${unit}`}>
        <span className="adm-bars-max" aria-hidden="true">
          {max}
          {unit}
        </span>
        {rows.map((r, i) => (
          <div
            key={r.date}
            role="listitem"
            tabIndex={0}
            aria-label={`${fmtDateKey(r.date)} ${r.n}${unit}`}
            className={`adm-bar${r.n === 0 ? " zero" : ""}${i < 3 ? " edge-l" : i > rows.length - 4 ? " edge-r" : ""}`}
          >
            <span className="adm-bar-fill" style={{ height: `${(r.n / max) * 100}%` }} />
            <span className="adm-bar-tip" aria-hidden="true">
              {fmtDateKey(r.date)} · {r.n}
              {unit}
            </span>
          </div>
        ))}
      </div>
      <figcaption className="adm-bars-axis">
        <span>{rows[0] ? fmtDateKey(rows[0].date) : ""}</span>
        <span>
          14일 합계 <b>{total}{unit}</b> · 오늘 <b>{last?.n ?? 0}{unit}</b>
        </span>
      </figcaption>
    </figure>
  );
}

function Cohorts({ rows }: { rows: { age: number | null; n: number }[] }) {
  if (!rows.length) return <p className="adm-empty">아직 학생이 없어요</p>;
  const top = rows.slice(0, 8);
  const max = Math.max(1, ...top.map((r) => r.n));
  return (
    <ul className="adm-hbars">
      {top.map((r) => (
        <li key={String(r.age)}>
          <span>{r.age ? `${gradeText(r.age)} (${r.age}살)` : "나이 안 적음"}</span>
          <span className="adm-hbar" style={{ width: `${(r.n / max) * 100}%` }} />
          <span className="n">{r.n}명</span>
        </li>
      ))}
    </ul>
  );
}
