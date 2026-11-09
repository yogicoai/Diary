"use client";

// 관리자 페이지 겉틀 — 문지기 + 틀 (보이스 동화 관리실과 같은 짜임)
//  · 들어오자마자 /api/admin/me 를 부른다. 200 일 때만 메뉴와 화면을 그린다 (그 전엔 어떤 화면도 데이터를 안 부름).
//  · 401 → 운영자 아이디 로그인 상자 · 403 → "운영자만 들어올 수 있어요" · 연결 실패 → 다시 시도
//  · 실제로 막는 것은 서버(/api/admin/* 의 requireStaff)다. 여기는 안내일 뿐.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { api, ApiError } from "@/lib/api";
import { useMe } from "@/lib/me";
import { Icon, type IconName } from "./kit";

export type AdminMe = { name: string; role: string; roleLabel: string; idAccount: boolean; seesSystem: boolean; todo: number };

type Ctx = { me: AdminMe; say: (msg: string, tone?: "info" | "error") => void; refreshMe: () => void };
const AdminCtx = createContext<Ctx | null>(null);

export function useAdmin(): Ctx {
  const c = useContext(AdminCtx);
  if (!c) throw new Error("AdminShell 안에서만 써요");
  return c;
}

const NAV: { href: string; label: string; icon: IconName; todo?: boolean }[] = [
  { href: "/admin", label: "대시보드", icon: "dashboard" },
  { href: "/admin/members", label: "회원", icon: "users" },
  { href: "/admin/classes", label: "반", icon: "class" },
  { href: "/admin/topics", label: "오늘의 숙제", icon: "pencil" },
  { href: "/admin/board", label: "게시판 검사", icon: "board", todo: true },
];

function activeHref(path: string | null): string | null {
  if (!path) return null;
  const p = path.replace(/\/+$/, "") || "/";
  if (p === "/admin") return "/admin";
  let best: string | null = null;
  for (const n of NAV) if (n.href !== "/admin" && (p === n.href || p.startsWith(`${n.href}/`)) && (!best || n.href.length > best.length)) best = n.href;
  return best;
}

function Brand() {
  return (
    <span className="adm-brand">
      <span className="adm-mark" aria-hidden="true">
        참
      </span>
      참 잘했어요 관리
    </span>
  );
}

type Gate = "checking" | "login" | "forbidden" | "error" | "ok";

export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const site = useMe();
  const [gate, setGate] = useState<Gate>("checking");
  const [me, setMe] = useState<AdminMe | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let alive = true;
    api<AdminMe>("/api/admin/me", { cache: "no-store" }).then(
      (m) => {
        if (!alive) return;
        setMe(m);
        setGate("ok");
      },
      (e: unknown) => {
        if (!alive) return;
        const st = e instanceof ApiError ? e.status : 0;
        setGate(st === 401 ? "login" : st === 403 ? "forbidden" : "error");
      },
    );
    return () => {
      alive = false;
    };
  }, [nonce]);
  const refreshMe = useCallback(() => setNonce((n) => n + 1), []);

  /* 알림: 2.8초 뒤 저절로 사라진다 */
  const [toast, setToast] = useState<{ msg: string; tone: "info" | "error"; n: number } | null>(null);
  const say = useCallback((msg: string, tone: "info" | "error" = "info") => setToast((t) => ({ msg, tone, n: (t?.n ?? 0) + 1 })), []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  const siteLogout = site.logout;
  const siteRefresh = site.refresh;
  const logout = useCallback(async () => {
    await siteLogout();
    setMe(null);
    setGate("login");
  }, [siteLogout]);
  const onLoggedIn = useCallback(() => {
    void siteRefresh();
    refreshMe();
  }, [siteRefresh, refreshMe]);

  const ctx = useMemo<Ctx | null>(() => (me ? { me, say, refreshMe } : null), [me, say, refreshMe]);

  if (gate !== "ok" || !me || !ctx) {
    return (
      <div className="adm adm-center">
        {gate === "checking" && <p className="adm-muted">확인하는 중…</p>}
        {gate === "login" && <LoginCard onDone={onLoggedIn} />}
        {gate === "forbidden" && (
          <div className="adm-login">
            <Brand />
            <h1>운영자만 들어올 수 있어요</h1>
            <p>지금 들어온 계정은 운영자가 아니에요. 운영자 아이디(fe·yogico)로 다시 들어가 주세요.</p>
            <button type="button" className="adm-btn primary block" onClick={() => void logout()}>
              다른 아이디로 들어가기
            </button>
            <div className="adm-login-foot">
              <Link href="/">일기장으로</Link>
            </div>
          </div>
        )}
        {gate === "error" && (
          <div className="adm-login">
            <Brand />
            <h1>서버에 연결하지 못했어요</h1>
            <p>잠시 뒤에 다시 해 주세요. 계속 안 되면 서버 저장소(MongoDB) 연결을 확인해 주세요.</p>
            <button type="button" className="adm-btn primary block" onClick={refreshMe}>
              다시 시도
            </button>
          </div>
        )}
      </div>
    );
  }

  const active = activeHref(pathname);
  const todo = me.todo;

  return (
    <AdminCtx.Provider value={ctx}>
      <div className="adm">
        <nav className="adm-side" aria-label="관리 메뉴">
          <Link href="/admin">
            <Brand />
          </Link>
          <div className="adm-navgroup">
            <p>운영</p>
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="adm-navlink" aria-current={active === n.href ? "page" : undefined}>
                <Icon name={n.icon} />
                <span>{n.label}</span>
                {n.todo && todo > 0 && (
                  <span className="adm-count">
                    {todo}
                    <span className="sr-only">건 확인할 것</span>
                  </span>
                )}
              </Link>
            ))}
          </div>
          <div className="adm-side-foot">
            <Link href="/" className="adm-navlink">
              <Icon name="external" />
              <span>일기장으로</span>
            </Link>
          </div>
        </nav>

        <div className="adm-body">
          <div className="adm-top">
            <div className="adm-topbar">
              <Link href="/admin">
                <Brand />
              </Link>
              <Account me={me} onLogout={() => void logout()} onSaid={say} />
            </div>
            <nav className="adm-pills" aria-label="관리 메뉴">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="adm-pill" aria-current={active === n.href ? "page" : undefined}>
                  {n.label}
                  {n.todo && todo > 0 && <span className="adm-count">{todo}</span>}
                </Link>
              ))}
            </nav>
          </div>
          <main className="adm-main">{children}</main>
        </div>

        {toast && (
          <div className={`adm-toast ${toast.tone === "error" ? "error" : ""}`} role="status">
            {toast.msg}
          </div>
        )}
      </div>
    </AdminCtx.Provider>
  );
}

/* ── 아이디 로그인 상자 ── */
function LoginCard({ onDone }: { onDone: () => void }) {
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErr(null);
    try {
      await api("/api/auth/password", { method: "POST", json: { id, password: pw } });
      onDone();
    } catch (x) {
      setErr(x instanceof Error ? x.message : "들어가지 못했어요");
      setBusy(false);
    }
  };

  return (
    <form className="adm-login" onSubmit={(e) => void submit(e)}>
      <Brand />
      <h1>관리자 페이지</h1>
      <p>운영자 아이디로 들어가 주세요.</p>
      <label className="adm-field">
        <span>아이디</span>
        <input className="adm-input" value={id} onChange={(e) => setId(e.target.value)} autoComplete="username" autoCapitalize="none" spellCheck={false} required />
      </label>
      <label className="adm-field">
        <span>비밀번호</span>
        <input className="adm-input" type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" required />
      </label>
      {err && (
        <p className="adm-form-error" role="alert">
          {err}
        </p>
      )}
      <button type="submit" className="adm-btn primary block" disabled={busy || !id || !pw}>
        {busy ? "확인하는 중…" : "들어가기"}
      </button>
      <div className="adm-login-foot">
        <Link href="/">일기장으로 돌아가기</Link>
      </div>
    </form>
  );
}

/* ── 오른쪽 위 계정 메뉴 (비밀번호 바꾸기 · 나가기) ── */
function Account({ me, onLogout, onSaid }: { me: AdminMe; onLogout: () => void; onSaid: (m: string) => void }) {
  const [open, setOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="adm-account" ref={box}>
      <button type="button" className="adm-account-btn" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        {me.name}
        <small>{me.roleLabel}</small>
      </button>
      {open && (
        <div className="adm-menu" role="menu">
          {me.idAccount && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                setPwOpen(true);
              }}
            >
              <Icon name="key" size={18} /> 비밀번호 바꾸기
            </button>
          )}
          <Link href="/" role="menuitem">
            <Icon name="external" size={18} /> 일기장으로
          </Link>
          <button type="button" role="menuitem" onClick={onLogout}>
            <Icon name="logout" size={18} /> 나가기
          </button>
        </div>
      )}
      {pwOpen && (
        <PasswordDialog
          onClose={() => setPwOpen(false)}
          onDone={() => {
            setPwOpen(false);
            onSaid("비밀번호를 바꿨어요");
          }}
        />
      )}
    </div>
  );
}

function PasswordDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (next !== again) return setErr("새 비밀번호 두 칸이 서로 달라요");
    setBusy(true);
    setErr(null);
    try {
      await api("/api/auth/password/change", { method: "POST", json: { current: cur, next } });
      onDone();
    } catch (x) {
      setErr(x instanceof Error ? x.message : "바꾸지 못했어요");
      setBusy(false);
    }
  };

  return (
    <>
      <div className="adm-scrim top" onClick={onClose} />
      <form className="adm-dialog" role="dialog" aria-modal="true" aria-labelledby="adm-pw-title" onSubmit={(e) => void submit(e)}>
        <h2 id="adm-pw-title">비밀번호 바꾸기</h2>
        <p>8자 이상으로 정해 주세요.</p>
        <label className="adm-field">
          <span>지금 비밀번호</span>
          <input className="adm-input" type="password" value={cur} onChange={(e) => setCur(e.target.value)} autoComplete="current-password" required autoFocus />
        </label>
        <label className="adm-field">
          <span>새 비밀번호</span>
          <input className="adm-input" type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" minLength={8} required />
        </label>
        <label className="adm-field">
          <span>새 비밀번호 한 번 더</span>
          <input className="adm-input" type="password" value={again} onChange={(e) => setAgain(e.target.value)} autoComplete="new-password" minLength={8} required />
        </label>
        {err && (
          <p className="adm-form-error" role="alert">
            {err}
          </p>
        )}
        <div className="adm-dialog-actions">
          <button type="button" className="adm-btn" onClick={onClose}>
            그만두기
          </button>
          <button type="submit" className="adm-btn primary" disabled={busy}>
            {busy ? "바꾸는 중…" : "바꾸기"}
          </button>
        </div>
      </form>
    </>
  );
}
