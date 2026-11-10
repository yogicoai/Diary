"use client";

// 화면 오류 → 일기장 한 쪽 모양 "앗, 크레파스가 부러졌어요" + 다시 해 보기 (기본 영어 화면 대신)

import { useEffect } from "react";
import OopsPage from "@/components/OopsPage";

export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <>
      <title>잠깐 멈췄어요 · 참 잘했어요</title>
      <OopsPage kind="error" onRetry={retry} />
    </>
  );
}
