import { Suspense } from "react";
import HomeGate from "@/components/HomeGate";

// 처음 온 사람은 인트로(표지 → 쓰는 법 → 이름표), 그다음부터는 그날 처음만 표지 → 그림일기 쓰기.
// 로고(참 잘했어요)는 /?cover=1 → 언제든 표지. HomeGate 가 주소(?cover)를 읽어서 Suspense 로 감싼다 (Next 16 빌드 규칙)
export default function Home() {
  return (
    <Suspense fallback={<main className="app intro-wait" aria-busy="true" />}>
      <HomeGate />
    </Suspense>
  );
}
