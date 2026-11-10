"use client";

// 일기장 로그인: 구글로만 가입·로그인한다 (11-09 사용자: "이후는 모두 구글 가입만, 덜 헷갈리게").
// 아이디 로그인은 선생님(fe·yogico) 전용이라 교무실(/admin) 들어가는 곳에만 있다.
// 베타 서버(BETA=1)에선 구글 대신 "이름만 적고 시작하기" + "예제 일기장 둘러보기" (lib/server/beta.ts, 베타 끝나면 사라짐)

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMe } from "@/lib/me";
import Sheet from "./Sheet";

/** 로그인 버튼 묶음 (구글 + 개발 중엔 개발용 로그인 / 베타 서버엔 이름만 적고 시작하기) */
export function LoginButtons({ next }: { next: string }) {
  const { flags } = useMe();
  const [name, setName] = useState("");
  const beta = !!flags?.beta;
  // 베타 서버에서 구글이 아직 안 켜졌으면 구글 단추는 감춘다 (이름만 적고 시작하기가 맨 위)
  const showGoogle = !(beta && flags && !flags.google);
  return (
    <div className="login-box">
      {beta && <BetaLogin next={next} />}
      {showGoogle && (
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
      )}
      {showGoogle && flags && !flags.google && <p className="note">구글 로그인은 준비 중이에요.</p>}
      {/* 만 14세 미만은 보호자 동의가 필요해서 받지 않는다 (이름표 생년월일에서도 막는다). 구글에서는 이름·이메일만 받는다 */}
      <p className="note login-age">
        만 14살 이상만 가입할 수 있어요{showGoogle ? " · 구글에서는 이름과 이메일만 받아요" : " · 구글 로그인은 정식 출시 때 열려요"}
      </p>
      {!beta && (
        flags?.devLogin && (
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
        )
      )}
    </div>
  );
}

/** 베타: 이름만 적고 시작하기 (개발용 로그인) + 예제 일기장 둘러보기 */
function BetaLogin({ next }: { next: string }) {
  const { me, startDemo } = useMe();
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const start = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = name.replace(/[^\p{L}\p{N}]/gu, "");
    if (clean.length < 2 || clean.length > 8) return setError("이름은 띄어쓰기 없이 2~8자로 적어 주세요");
    if (clean.startsWith("데모")) return setError("'데모'로 시작하는 이름은 예제 친구들이 쓰고 있어요");
    // 쿠키를 받으려면 API 주소로 통째로 이동해야 한다
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    location.href = `/api/auth/dev?name=${encodeURIComponent(clean)}&next=${encodeURIComponent(next)}`;
  };

  const look = async () => {
    setBusy(true);
    setError(null);
    try {
      await startDemo();
      router.push("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "잠시 문제가 생겼어요");
      setBusy(false);
    }
  };

  return (
    <div className="beta-login">
      <p className="beta-login-h">
        <span className="beta-tag">베타</span>지금은 이름만 적고 들어와요
      </p>
      <form className="dev-login" onSubmit={start}>
        <input
          value={name}
          maxLength={8}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
          placeholder="내 이름 (2~8자)"
          aria-label="내 이름"
        />
        <button type="submit" className="btn plain">
          시작하기
        </button>
      </form>
      {error && <p className="form-error">{error}</p>}
      <p className="note">같은 이름을 적으면 같은 일기장이 열려요. 나만 아는 이름으로 적어 주세요. 베타 때 쓴 일기는 정식 출시 때 정리될 수 있어요.</p>
      {!me && (
        <button type="button" className="linkish beta-look" onClick={() => void look()} disabled={busy}>
          {busy ? "펼치는 중…" : "예제 일기장 먼저 둘러보기"}
        </button>
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
