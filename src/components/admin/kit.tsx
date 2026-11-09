"use client";

// 관리자 페이지 부품: 불러오기 훅 · 날짜 글자 · 꼬리표 · 화면 머리 · 숫자 칸 · 아이콘 · 되묻기 창

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/api";

/* ── 불러오기: 주소가 바뀌면 다시 부른다. 그리는 중엔 Date.now() 를 부르지 않게 받은 시각(at)을 같이 준다 ── */
export function useAdminGet<T>(url: string | null, keepStale = false) {
  const [st, setSt] = useState<{ url: string; data?: T; error?: string; at: number } | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!url) return;
    let alive = true;
    api<T>(url, { cache: "no-store" }).then(
      (data) => alive && setSt({ url, data, at: Date.now() }),
      (e: unknown) => alive && setSt({ url, error: e instanceof Error ? e.message : "못 불러왔어요", at: Date.now() }),
    );
    return () => {
      alive = false;
    };
  }, [url, tick]);
  const mine = st && st.url === url ? st : null;
  return {
    data: mine?.data ?? (keepStale ? st?.data : undefined),
    error: mine?.error,
    at: st?.at ?? 0,
    loading: !!url && !mine,
    reload: () => setTick((t) => t + 1),
  };
}

/* ── 날짜 (한국 시각) ── */
const dayFmt = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" });

export function fmtDay(ms: number | null | undefined): string {
  if (!ms) return "—";
  const p = Object.fromEntries(dayFmt.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return `${p.year}.${p.month}.${p.day}`;
}

/** 일기 날짜 "2026-11-09" → "11월 9일" */
export function fmtDateKey(key: string): string {
  const [, m, d] = key.split("-").map(Number);
  return m && d ? `${m}월 ${d}일` : key;
}

export function fmtAgo(ms: number | null | undefined, now: number): string {
  if (!ms) return "—";
  const s = Math.max(0, (now - ms) / 1000);
  if (s < 60) return "방금";
  if (s < 3600) return `${Math.floor(s / 60)}분 전`;
  if (s < 86400) return `${Math.floor(s / 3600)}시간 전`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}일 전`;
  return fmtDay(ms);
}

/* ── 꼬리표 ── */
export function Badge({ tone = "gray", children }: { tone?: "gray" | "blue" | "green" | "amber" | "red"; children: ReactNode }) {
  return <span className={`adm-badge ${tone}`}>{children}</span>;
}

export type Person = {
  login: "google" | "id" | "dev";
  email: string | null;
  loginId: string | null;
  staff: "developer" | "company" | null;
  banned: boolean;
};

export function PersonBadges({ p }: { p: Pick<Person, "staff" | "banned"> }) {
  if (!p.staff && !p.banned) return null;
  return (
    <span className="adm-badges">
      {p.staff && <Badge tone="blue">운영자 · {p.staff === "developer" ? "개발자" : "회사"}</Badge>}
      {p.banned && <Badge tone="red">정지</Badge>}
    </span>
  );
}

export function loginText(p: Pick<Person, "login" | "email" | "loginId">): { kind: string; detail: string } {
  if (p.login === "id") return { kind: "아이디", detail: p.loginId ?? "" };
  if (p.login === "dev") return { kind: "개발용", detail: "개발 중 시험 로그인" };
  return { kind: "구글", detail: p.email ?? "" };
}

/* ── 화면 머리 · 숫자 칸 · 카드 ── */
export function PageHead({ title, desc, right, back }: { title: ReactNode; desc?: ReactNode; right?: ReactNode; back?: { href: string; label: string } }) {
  return (
    <>
      {back && (
        <Link href={back.href} className="adm-back">
          <Icon name="back" size={16} /> {back.label}
        </Link>
      )}
      <header className="adm-page-head">
        <div>
          <h1>{title}</h1>
          {desc && <p>{desc}</p>}
        </div>
        {right}
      </header>
    </>
  );
}

export function Stat({ label, value, sub, href, alert }: { label: string; value: ReactNode; sub?: string; href?: string; alert?: boolean }) {
  const inner = (
    <>
      <b>{label}</b>
      <strong>{value}</strong>
      {sub && <small title={sub}>{sub}</small>}
    </>
  );
  const cls = `adm-stat${alert ? " alert" : ""}`;
  return href ? (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

export function Card({ title, aside, children, className = "" }: { title?: ReactNode; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`adm-card ${className}`}>
      {(title || aside) && (
        <div className="adm-card-head">
          {title && <h2>{title}</h2>}
          {aside && <span>{aside}</span>}
        </div>
      )}
      {children}
    </section>
  );
}

export function Loading({ rows = 1 }: { rows?: number }) {
  return (
    <div style={{ display: "grid", gap: 12 }} aria-busy="true" aria-label="불러오는 중">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="adm-skel" />
      ))}
    </div>
  );
}

export function ErrorBox({ msg, retry }: { msg: string; retry?: () => void }) {
  return (
    <div className="adm-error" role="alert">
      {msg}{" "}
      {retry && (
        <button type="button" onClick={retry} style={{ textDecoration: "underline", marginLeft: 6 }}>
          다시 불러오기
        </button>
      )}
    </div>
  );
}

export function Privacy({ children }: { children: ReactNode }) {
  return (
    <p className="adm-note">
      <Icon name="lock" size={16} />
      <span>{children}</span>
    </p>
  );
}

export function Pager({ page, total, size, onPage }: { page: number; total: number; size: number; onPage: (p: number) => void }) {
  const last = Math.max(0, Math.ceil(total / size) - 1);
  if (last === 0) return null;
  return (
    <nav className="adm-pager" aria-label="쪽 넘기기">
      <button type="button" className="adm-btn sm" disabled={page <= 0} onClick={() => onPage(page - 1)}>
        이전
      </button>
      <span>
        {page + 1} / {last + 1}
      </span>
      <button type="button" className="adm-btn sm" disabled={page >= last} onClick={() => onPage(page + 1)}>
        다음
      </button>
    </nav>
  );
}

/* ── 되묻기 창 ── */
export function Confirm({
  title,
  body,
  yes,
  danger,
  busy,
  onYes,
  onNo,
}: {
  title: string;
  body: ReactNode;
  yes: string;
  danger?: boolean;
  busy?: boolean;
  onYes: () => void;
  onNo: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onNo();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onNo]);
  return (
    <>
      <div className="adm-scrim top" onClick={onNo} />
      <div className="adm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="adm-confirm-title">
        <h2 id="adm-confirm-title">{title}</h2>
        <p>{body}</p>
        <div className="adm-dialog-actions">
          <button type="button" className="adm-btn" onClick={onNo}>
            그만두기
          </button>
          <button type="button" className={`adm-btn ${danger ? "danger solid" : "primary"}`} onClick={onYes} disabled={busy} autoFocus>
            {yes}
          </button>
        </div>
      </div>
    </>
  );
}

/* ── 아이콘 (선 하나 굵기 1.8) ── */
export type IconName = "dashboard" | "users" | "class" | "board" | "pencil" | "external" | "logout" | "key" | "search" | "close" | "back" | "lock" | "chevron";

const PATHS: Record<IconName, ReactNode> = {
  dashboard: (
    <>
      <rect x="3.5" y="3.5" width="7" height="8" rx="2" />
      <rect x="13.5" y="3.5" width="7" height="5" rx="2" />
      <rect x="13.5" y="11.5" width="7" height="9" rx="2" />
      <rect x="3.5" y="14.5" width="7" height="6" rx="2" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5" />
      <path d="M15.5 4.8a3.5 3.5 0 0 1 0 6.4M18 14.8c2 .7 3.2 2.4 3.6 5.2" />
    </>
  ),
  class: (
    <>
      <rect x="3.5" y="4.5" width="17" height="12" rx="2" />
      <path d="M8 20.5h8M12 16.5v4M7.5 9.5h5M7.5 12.5h8" />
    </>
  ),
  board: (
    <>
      <rect x="3.5" y="5.5" width="17" height="14" rx="2" />
      <path d="M12 2.8v2.7M7.5 10.5h4v4h-4zM14.5 10.5h3M14.5 13.5h3" />
    </>
  ),
  pencil: <path d="M4.5 19.5 5.6 15 15.8 4.8a2 2 0 0 1 2.8 0l.6.6a2 2 0 0 1 0 2.8L9 18.4zM13.8 6.8l3.4 3.4" />,
  external: <path d="M14 4.5h5.5V10M19.5 4.5 11 13M17 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 4 18.5v-10A1.5 1.5 0 0 1 5.5 7H10" />,
  logout: <path d="M14 4.5h4a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5h-4M10 16.5 5.5 12 10 7.5M5.5 12H15" />,
  key: (
    <>
      <circle cx="8" cy="14" r="4" />
      <path d="M11 11 19.5 2.5M16.5 5.5l2.5 2.5M14 8l2 2" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6 6 18" />,
  back: <path d="M15 5.5 8.5 12l6.5 6.5" />,
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="10" rx="2" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    </>
  ),
  chevron: <path d="m9 5.5 6.5 6.5L9 18.5" />,
};

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name]}
    </svg>
  );
}
