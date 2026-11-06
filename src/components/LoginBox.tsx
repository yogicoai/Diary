"use client";

import { useState } from "react";
import { useMe } from "@/lib/me";
import Sheet from "./Sheet";

/** 로그인 버튼 묶음 (구글 + 개발 중엔 개발용 로그인) */
export function LoginButtons({ next }: { next: string }) {
  const { flags } = useMe();
  const [name, setName] = useState("");
  return (
    <div className="login-box">
      <a className="btn google" href={`/api/auth/google?next=${encodeURIComponent(next)}`}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3Z" />
          <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.5l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22Z" />
          <path fill="#FBBC05" d="M6.4 13.9a6 6 0 0 1 0-3.8V7.5H3.1a10 10 0 0 0 0 9l3.3-2.6Z" />
          <path fill="#EA4335" d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.5l3.3 2.6C7.2 7.8 9.4 6 12 6Z" />
        </svg>
        구글로 시작하기
      </a>
      {flags && !flags.google && <p className="note">구글 로그인 키가 아직 없어요 (.env.local 의 GOOGLE_CLIENT_ID).</p>}
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
