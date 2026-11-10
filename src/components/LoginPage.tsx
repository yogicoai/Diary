"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useMe } from "@/lib/me";
import { BrandMark } from "./Icons";
import { LoginButtons } from "./LoginBox";

const ERRORS: Record<string, string> = {
  no_google: "구글 로그인이 아직 준비되지 않았어요.",
  state: "로그인이 오래 걸려서 끊겼어요. 다시 해 주세요.",
  token: "구글에서 확인을 못 받았어요. 다시 해 주세요.",
  email: "확인된 구글 이메일이 필요해요.",
  server: "잠시 문제가 생겼어요. 다시 해 주세요.",
};

export default function LoginPage() {
  const { me } = useMe();
  const [next, setNext] = useState("/me");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 주소창의 ?next= / ?error= 는 브라우저에서만 읽는다
    const sp = new URLSearchParams(location.search);
    const n = sp.get("next");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 주소창 값을 한 번 읽는다
    if (n && n.startsWith("/") && !n.startsWith("//")) setNext(n);
    const e = sp.get("error");
    if (e) setError(ERRORS[e] ?? ERRORS.server);
  }, []);

  return (
    <main className="app">
      <header className="topbar">
        <Link href="/?cover=1" className="brand">
          <BrandMark className="brand-mark" />
          <span>
            <span className="brand-name">이름표 만들기</span>
            <span className="brand-sub">참 잘했어요 어른이 그림일기</span>
          </span>
        </Link>
      </header>
      <section className="nametag" style={{ marginBottom: 16 }}>
        <span className="nt-hole" aria-hidden="true" />
        <span className="nt-label">이름표</span>
        <b className="nt-name">{me ? me.nickname : "○○○"}</b>
        <span className="nt-sub">{me ? "이미 이름표가 있어요" : "몇 년도에 입학했나요?"}</span>
      </section>
      {error && <p className="form-error">{error}</p>}
      {me ? (
        <Link href={next} className="btn">
          계속하기
        </Link>
      ) : (
        <LoginButtons next={next} />
      )}
      <p className="note">
        구글 계정 이메일은 로그인에만 쓰고 다른 사람에게 보이지 않아요. 게시판에는 직접 정한 별명과 입학 연도·반만 보여요.
      </p>
    </main>
  );
}
