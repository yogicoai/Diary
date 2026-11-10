"use client";

// 베타 둘러보기 (11-10 사용자: "지금은 베타라 개발자 모드로 이미 로그인된 상태로 보여 주기", "이후 없앨 거라").
// 예제 일기장(fe = 3학년 8반 길동)으로 둘러보는 중이면 맨 위에 얇은 쪽지 → 누르면 안내 시트.
// 둘러보기는 읽기만 돼서 쓰기를 하려 하면(lib/api.ts 가 DEMO_EVENT 알림) 같은 시트가 열린다 → 내 이름으로 시작하기.
// 베타가 끝나면(BETA 지움) me.demo 가 없어서 아무것도 안 보인다.

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DEMO_EVENT } from "@/lib/api";
import { useMe } from "@/lib/me";
import Sheet from "./Sheet";

/** 둘러보기 안내 시트 열기 (쓰기 단추를 누르기 전에 먼저 알려 줄 때) */
export function openDemoSheet() {
  window.dispatchEvent(new Event(DEMO_EVENT));
}

/** 맨 위 쪽지 (레이아웃에서 화면 앞에) */
export function BetaBar() {
  const { me } = useMe();
  const path = usePathname();
  if (!me?.demo || path.startsWith("/admin")) return null;
  return (
    <div className="beta-bar">
      <button type="button" onClick={openDemoSheet}>
        <span className="beta-tag">둘러보기</span>
        <span className="beta-text">예제 일기장 보는 중</span>
        <span className="beta-go">내 이름으로 시작 ›</span>
      </button>
    </div>
  );
}

/** 안내 시트 (레이아웃 맨 뒤에 둬서 다른 시트 위에 뜬다) */
export function DemoSheetHost() {
  const { me, logout } = useMe();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener(DEMO_EVENT, show);
    return () => window.removeEventListener(DEMO_EVENT, show);
  }, []);
  if (!me?.demo) return null;

  const startMine = async () => {
    setBusy(true);
    await logout(); // 둘러보며 쓴 일기는 손님 일기장으로 → 내 이름으로 들어가면 합쳐진다
    setBusy(false);
    setOpen(false);
    router.push("/login?next=/");
  };

  return (
    <Sheet open={open} onClose={() => setOpen(false)} label="예제 일기장 둘러보기">
      <h2>예제 일기장을 둘러보는 중이에요</h2>
      <p>
        지금은 베타라서 처음 오면 예제 일기장({me.nameTag})으로 들어와 있어요. 여러 사람이 같이 보는 일기장이라 둘러보기만 돼요.
      </p>
      <p style={{ marginTop: 8 }}>
        일기를 써서 선생님 도장까지 받아 볼 수 있지만 이 기기에만 남아요. 내 이름으로 시작하면 게시판·우리 반·숙제 검사까지 다 해 볼 수
        있고, 둘러보며 쓴 일기도 그대로 옮겨 가요.
      </p>
      <button type="button" className="btn" onClick={() => void startMine()} disabled={busy}>
        {busy ? "나오는 중…" : "내 이름으로 시작하기"}
      </button>
      <div className="btn-row">
        <Link href="/about" className="btn plain" onClick={() => setOpen(false)}>
          이 앱은요?
        </Link>
        <button type="button" className="btn plain" onClick={() => setOpen(false)}>
          계속 둘러보기
        </button>
      </div>
    </Sheet>
  );
}
