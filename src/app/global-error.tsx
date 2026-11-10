"use client";

// 맨 바깥(레이아웃)까지 멈췄을 때: 레이아웃이 없어 일기장 테마·글꼴이 안 들어오므로 아주 단순한 종이 화면으로 (기본 영어 화면 대신)

import { useEffect } from "react";

export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <html lang="ko">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#efe6d2",
          color: "#2b2622",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <title>잠깐 멈췄어요 · 참 잘했어요</title>
        <main style={{ maxWidth: 360, padding: 24, textAlign: "center" }}>
          <p style={{ fontSize: 22, fontWeight: 700, margin: "0 0 10px" }}>앗, 크레파스가 부러졌어요</p>
          <p style={{ margin: "0 0 22px", lineHeight: 1.6 }}>잠깐 문제가 생겼어요. 저장한 일기는 그대로 있어요.</p>
          <button
            type="button"
            onClick={() => retry()}
            style={{
              minHeight: 52,
              padding: "0 28px",
              border: "2.5px solid #2b2622",
              borderRadius: 18,
              background: "#f6c945",
              color: "#2b2622",
              fontSize: 18,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            다시 해 보기
          </button>
        </main>
      </body>
    </html>
  );
}
