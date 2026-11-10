"use client";

// 첫 화면 문지기 (11-09 사용자: "처음 접근 시 겉표지가 나와야").
//  · 그날 처음 열면 누구나 90년대 그림일기장 표지부터. 같은 날 다시 오면 바로 그림일기 쓰기.
//  · 처음 온 사람(로그인 안 했고 이 기기에서 처음): 표지 → 쓰는 법 3장 → 이름표 → 쓰기
//  · 다시 온 사람: 표지(로그인했으면 이름 칸에 이름표) → [일기장 펼치기] → 쓰기
//  · 주소에 ?cover=1 이면 언제든 표지 (시험·시연용)

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useMe } from "@/lib/me";
import { kidChoice, setReadVoice } from "@/lib/readAloud";
import { coverShownToday, introSeen, markCoverToday, setIntroSeen } from "@/lib/prefs";
import DiaryEditor from "./DiaryEditor";
import Intro from "./Intro";

export default function HomeGate() {
  const { me, loading, refresh } = useMe();
  const [boot, setBoot] = useState<{ seen: boolean; today: boolean; force: boolean } | null>(null);
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 이 기기에서 표지·인트로를 봤는지 한 번 읽는다
    setBoot({ seen: introSeen(), today: coverShownToday(), force: new URLSearchParams(location.search).get("cover") === "1" });
  }, []);
  useEffect(() => {
    if (!me) return;
    setIntroSeen();
    const local = kidChoice();
    if (me.kid) {
      if (local !== me.kid) setReadVoice(me.kid);
    } else if (local) {
      void api("/api/me", { method: "PATCH", json: { kid: local } })
        .then(() => refresh())
        .catch(() => {});
    }
  }, [me, refresh]);

  const first = !!boot && !boot.seen && !loading && !me;
  const cover = !!boot && !opened && (boot.force || !boot.today || first);

  // 표지·인트로 동안엔 아래 메뉴(탭)를 감춘다
  useEffect(() => {
    const html = document.documentElement;
    if (cover) html.dataset.intro = "1";
    else delete html.dataset.intro;
    return () => {
      delete html.dataset.intro;
    };
  }, [cover]);

  // 처음 온 사람인지 알려면 로그인 확인을 기다린다 (다시 온 사람은 바로 표지)
  if (!boot || (!boot.seen && loading)) return <main className="app intro-wait" aria-busy="true" />;

  if (cover) {
    const open = () => {
      markCoverToday();
      setOpened(true);
    };
    return (
      <Intro
        first={first}
        me={me ? { nickname: me.nickname, age: me.age } : null}
        onSaveTag={async (nickname, age) => {
          await api("/api/me", { method: "PATCH", json: { nickname, age } });
          await refresh();
        }}
        onOpen={open}
        onGuest={() => {
          setIntroSeen();
          open();
        }}
      />
    );
  }
  return <DiaryEditor />;
}
