"use client";

// 첫 화면 문지기: 로그인 안 했고 이 기기에서 인트로를 처음 보면 인트로 → 이름표 → 그림일기 쓰기.
// 로그인한 사람, 한 번 본 사람은 바로 그림일기 쓰기.

import { useEffect, useState } from "react";
import { useMe } from "@/lib/me";
import { introSeen, setIntroSeen } from "@/lib/prefs";
import DiaryEditor from "./DiaryEditor";
import Intro from "./Intro";

export default function HomeGate() {
  const { me, loading } = useMe();
  const [seen, setSeen] = useState<boolean | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 이 기기에서 인트로를 봤는지 한 번 읽는다
    setSeen(introSeen());
  }, []);
  useEffect(() => {
    if (me) setIntroSeen();
  }, [me]);

  const intro = seen === false && !loading && !me;

  // 인트로 동안엔 아래 메뉴(탭)를 감춘다
  useEffect(() => {
    const html = document.documentElement;
    if (intro) html.dataset.intro = "1";
    else delete html.dataset.intro;
    return () => {
      delete html.dataset.intro;
    };
  }, [intro]);

  if (seen === null || (seen === false && loading)) return <main className="app intro-wait" aria-busy="true" />;
  if (intro) {
    return (
      <Intro
        onGuest={() => {
          setIntroSeen();
          setSeen(true);
        }}
      />
    );
  }
  return <DiaryEditor />;
}
