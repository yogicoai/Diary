"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api, ApiError } from "@/lib/api";
import { useMe } from "@/lib/me";
import Sheet from "./Sheet";

/** 기본 로그인: 아이디로 들어가기 / 가입하기 (구글 아래). 선생님 아이디(fe·yogico)는 실제 서버에서 가입 코드가 필요하다 */
function IdLogin({ next }: { next: string }) {
  const { refresh } = useMe();
  const router = useRouter();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [code, setCode] = useState("");
  const [needCode, setNeedCode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (mode === "up" && pw !== pw2) return setErr("비밀번호 두 칸이 서로 달라요");
    setBusy(true);
    setErr(null);
    try {
      if (mode === "up") await api("/api/auth/signup", { method: "POST", json: { id, password: pw, code } });
      else await api("/api/auth/password", { method: "POST", json: { id, password: pw } });
      await refresh();
      router.replace(next);
    } catch (x) {
      if (x instanceof ApiError && x.code === "need_code") setNeedCode(true);
      setErr(x instanceof Error ? x.message : "들어가지 못했어요");
      setBusy(false);
    }
  };

  const pick = (m: "in" | "up") => {
    setMode(m);
    setErr(null);
  };

  return (
    <div className="basic-login">
      <p className="or-line">
        <span>또는 아이디로</span>
      </p>
      <div className="login-seg" role="tablist" aria-label="아이디로">
        <button type="button" role="tab" aria-selected={mode === "in"} onClick={() => pick("in")}>
          들어가기
        </button>
        <button type="button" role="tab" aria-selected={mode === "up"} onClick={() => pick("up")}>
          가입하기
        </button>
      </div>
      <form className="id-login" onSubmit={(e) => void submit(e)}>
        <input
          value={id}
          onChange={(e) => setId(e.target.value.toLowerCase())}
          placeholder={mode === "up" ? "아이디 (영문 소문자·숫자 2~20자)" : "아이디"}
          aria-label="아이디"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
        />
        <input
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          type="password"
          placeholder={mode === "up" ? "비밀번호 (8자 이상)" : "비밀번호"}
          aria-label="비밀번호"
          autoComplete={mode === "up" ? "new-password" : "current-password"}
          required
        />
        {mode === "up" && (
          <input value={pw2} onChange={(e) => setPw2(e.target.value)} type="password" placeholder="비밀번호 한 번 더" aria-label="비밀번호 한 번 더" autoComplete="new-password" required />
        )}
        {mode === "up" && needCode && (
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="선생님 가입 코드" aria-label="선생님 가입 코드" autoComplete="off" required />
        )}
        {err && (
          <p className="note id-login-err" role="alert">
            {err}
          </p>
        )}
        <button type="submit" className="btn plain" disabled={busy || !id || !pw || (mode === "up" && !pw2)}>
          {busy ? "확인하는 중…" : mode === "up" ? "가입하고 시작하기" : "아이디로 들어가기"}
        </button>
        {mode === "up" && <p className="note">이메일 없이 만드는 아이디라 비밀번호를 잊으면 찾을 수 없어요. 꼭 기억해 두세요.</p>}
      </form>
    </div>
  );
}

/** 로그인 버튼 묶음 (구글 + 기본 로그인(아이디 들어가기·가입) + 개발 중엔 개발용 로그인) */
export function LoginButtons({ next }: { next: string }) {
  const { flags } = useMe();
  const [name, setName] = useState("");
  return (
    <div className="login-box">
      <a
        className={`btn google${flags && !flags.google ? " off" : ""}`}
        href={`/api/auth/google?next=${encodeURIComponent(next)}`}
        aria-disabled={flags && !flags.google ? true : undefined}
        onClick={(e) => flags && !flags.google && e.preventDefault()}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3Z" />
          <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.5l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22Z" />
          <path fill="#FBBC05" d="M6.4 13.9a6 6 0 0 1 0-3.8V7.5H3.1a10 10 0 0 0 0 9l3.3-2.6Z" />
          <path fill="#EA4335" d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.5l3.3 2.6C7.2 7.8 9.4 6 12 6Z" />
        </svg>
        구글로 시작하기
      </a>
      {flags && !flags.google && <p className="note">구글 로그인은 준비 중이에요.</p>}
      <IdLogin next={next} />
      {flags?.devLogin && (
        <form
          className="dev-login"
          onSubmit={(e) => {
            e.preventDefault();
            // 쿠키를 받으려면 API 주소로 통째로 이동해야 한다
            // eslint-disable-next-line @next/next/no-location-assign-relative-destination
            location.href = `/api/auth/dev?name=${encodeURIComponent(name || "시험")}&next=${encodeURIComponent(next)}`;
          }}
        >
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="개발용 이름" aria-label="개발용 이름" />
          <button type="submit" className="btn plain">
            개발용 로그인
          </button>
        </form>
      )}
    </div>
  );
}

export function LoginSheet({ open, onClose, next, why }: { open: boolean; onClose: () => void; next: string; why: string }) {
  return (
    <Sheet open={open} onClose={onClose} label="가입하기">
      <h2>이름표를 만들어요</h2>
      <p>{why} 가입하면 일기가 서버에도 보관돼서 휴대폰을 바꿔도 그대로예요.</p>
      <LoginButtons next={next} />
    </Sheet>
  );
}
