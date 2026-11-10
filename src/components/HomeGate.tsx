"use client";

// 첫 화면 문지기 (11-09 사용자: "처음 접근 시 겉표지가 나와야").
//  · 그날 처음 열면 누구나 90년대 그림일기장 표지부터. 같은 날 다시 오면 바로 그림일기 쓰기.
//  · 처음 온 사람(로그인 안 했고 이 기기에서 처음): 표지 → 쓰는 법 3장 → 이름표 → 쓰기
//  · 다시 온 사람(회원도): 표지(로그인했으면 이름 칸에 이름표) → [일기장 펼치기] → 쓰기
//  · 주소에 ?cover=1 이면 언제든 표지. 머리의 '참 잘했어요' 로고가 /?cover=1 (11-10 사용자: "누르면 일기장이 아니라 표지로")
//    표지를 덮으면 주소를 / 로 되돌린다. 쓰던 일기는 표지 뒤에 숨겨 둘 뿐이라 그대로 남는다.

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { READ_ALOUD } from "@/lib/business";
import { useMe } from "@/lib/me";
import { kidChoice, setReadVoice } from "@/lib/readAloud";
import { coverShownToday, introSeen, markCoverToday, setIntroSeen } from "@/lib/prefs";
import { releaseToGuest, setDiaryOwner } from "@/lib/store";
import { setConsent } from "@/lib/teacherAi";
import DiaryEditor from "./DiaryEditor";
import Intro from "./Intro";
import Sheet from "./Sheet";

export default function HomeGate() {
  const { me, loading, refresh } = useMe();
  const router = useRouter();
  const force = useSearchParams().get("cover") === "1"; // 로고를 누르면 언제든 표지
  const [boot, setBoot] = useState<{ seen: boolean; today: boolean } | null>(null);
  const [bye, setBye] = useState(false); // 만 14살 미만이라 가입 정보를 지운 뒤 인사

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 이 기기에서 표지·인트로를 봤는지 한 번 읽는다
    setBoot({ seen: introSeen(), today: coverShownToday() });
  }, []);
  useEffect(() => {
    if (!me) return;
    setIntroSeen();
    if (!READ_ALOUD) return; // 남자아이·여자아이(읽어 주는 목소리)는 읽어 주기를 켤 때만
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
  // 가입한 뒤 이름표(이름·생년월일)를 아직 안 썼으면 쓸 때까지 표지에서 받는다 (11-10 사용자: "가입 후에 생년월일과 이름은 필요"). 선생님 아이디는 빼고
  const needsTag = !!me && !me.birth && !me.admin;
  const cover = !!boot && (force || !boot.today || first || needsTag);

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

  // 표지 덮기 = 일기장 펼치기: 오늘 표지를 봤다고 적고, 로고로 왔으면(?cover=1) 주소를 / 로
  const open = () => {
    markCoverToday();
    setBoot((b) => (b ? { ...b, today: true } : b));
    if (force) router.replace("/", { scroll: false });
    window.scrollTo({ top: 0 });
  };

  return (
    <>
      {cover && (
        <Intro
          first={first}
          me={me ? { nickname: me.nickname, age: me.age, birth: me.birth, admin: me.admin } : null}
          onSaveTag={async (nickname, birth) => {
            await api("/api/me", { method: "PATCH", json: { nickname, birth } });
            await refresh();
          }}
          onUnder14={async (birth) => {
            if (!me) return;
            const uid = me.id;
            // 서버: 가입 정보(이름표·올린 일기)를 바로 지우고 로그인도 끊는다. 생년월일은 저장하지 않는다
            await api("/api/me", { method: "PATCH", json: { birth, under14: true } });
            await releaseToGuest(uid).catch(() => {}); // 이 기기 일기는 손님 일기장으로 (기기에만)
            setConsent("no"); // 만 14살 미만이 확인된 기기: 일기 글을 국외 AI 로 보내지 않고 기본 한 줄로
            setDiaryOwner(null);
            await refresh();
            setBye(true);
          }}
          onOpen={open}
          onGuest={() => {
            setIntroSeen();
            setBoot((b) => (b ? { ...b, seen: true } : b));
            open();
          }}
        />
      )}
      {/* 처음 온 사람(인트로 중)이 아니면 일기 쓰기를 미리 펼쳐 두고 표지 동안엔 숨긴다 → 로고로 표지를 봐도 쓰던 것이 남는다 */}
      {!first && (
        <div hidden={cover}>
          <DiaryEditor />
        </div>
      )}
      <Sheet open={bye} onClose={() => setBye(false)} label="이름표를 지웠어요">
        <h2>이름표를 지웠어요</h2>
        <p>구글에서 받은 이름·이메일과 서버에 올라간 일기를 모두 지웠어요. 만 14살이 되면 다시 만나요!</p>
        <p style={{ marginTop: 8 }}>이 기기에 쓴 일기는 이 기기에만 남아 있어요. 선생님 한 줄은 미리 준비된 한 줄로 드릴게요.</p>
        <button type="button" className="btn" onClick={() => setBye(false)}>
          알겠어요
        </button>
      </Sheet>
    </>
  );
}
