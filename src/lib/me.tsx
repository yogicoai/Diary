"use client";

// 로그인한 나 (이름표). 모든 화면이 같이 쓴다. 로그인하면 이 기기 일기를 서버와 맞춘다.

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { api } from "./api";
import { diaryOwner, forgetSynced, notifyDiaries, setDiaryOwner } from "./store";
import { syncAll } from "./sync";

export type Me = {
  id: string;
  nickname: string;
  age: number | null; // 올해 나이(올해 - 태어난 해) → 어른이 초등학교 학년·반, 해마다 1월 1일 진급 (lib/social.ts ageOf·gradeClass)
  birth: string | null; // 생년월일 YYYY-MM-DD (생일엔 선생님이 축하)
  kid: "girl" | "boy" | null; // 가입할 때 고른 나 (읽어 주는 목소리)
  email: string;
  nameTag: string;
  admin: boolean;
  demo: boolean; // 베타 둘러보기 = 예제 일기장을 읽기만 (lib/server/beta.ts). 쓰면 이 기기에만 남는다
};
export type MeStats = { diaries: number; stamps: number; board: number; streak: number };
export type Flags = { google: boolean; devLogin: boolean; beta: boolean; server: boolean };

type Ctx = {
  me: Me | null;
  stats: MeStats | null;
  flags: Flags | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  startDemo: () => Promise<void>;
};

const MeContext = createContext<Ctx>({
  me: null,
  stats: null,
  flags: null,
  loading: true,
  refresh: async () => {},
  logout: async () => {},
  startDemo: async () => {},
});

// 베타 서버 (11-10 사용자: "개발자 모드로 이미 로그인된 상태로 보여 주기"): 처음 온 사람은 예제 일기장으로 한 번 저절로 들어간다.
// 이 기기에서 한 번만 — 로그아웃하면 다시 들어가지 않는다 (로그인 화면의 '예제 일기장 둘러보기'로 다시 볼 수 있다)
const AUTO_DEMO = "chamjal.betaDemo";
function autoDemoOk() {
  try {
    if (localStorage.getItem(AUTO_DEMO)) return false;
  } catch {
    return false;
  }
  // 교무실·로그인·반 초대·공유 링크로 온 사람은 그 일을 바로 하게 둔다
  return !/^\/(admin|login|join|d)(\/|$)/.test(location.pathname);
}
function markAutoDemo() {
  try {
    localStorage.setItem(AUTO_DEMO, "1");
  } catch {
    /* 못 적으면 다음에 또 둘러보기로 */
  }
}

type MeRes = { user: Me | null; stats?: MeStats; flags: Flags };

export function MeProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [stats, setStats] = useState<MeStats | null>(null);
  const [flags, setFlags] = useState<Flags | null>(null);
  const [loading, setLoading] = useState(true);
  const meRef = useRef<Me | null>(null); // 로그아웃 때 둘러보기였는지

  const refresh = useCallback(async () => {
    try {
      let data = await api<MeRes>("/api/me");
      if (!data.user && data.flags.beta && autoDemoOk()) {
        markAutoDemo();
        const ok = await api("/api/auth/demo", { method: "POST" }).then(
          () => true,
          () => false, // 예제 일기장이 없으면 손님 그대로
        );
        if (ok) data = await api<MeRes>("/api/me");
      }
      // 이 기기 일기장 주인 = 로그인한 사람 (없으면 손님 칸). 인터넷이 안 되면(catch) 그대로 둔다 — 오프라인에도 내 일기
      setDiaryOwner(data.user ? data.user.id : null);
      meRef.current = data.user;
      setMe(data.user);
      setStats(data.stats ?? null);
      setFlags(data.flags);
      // 둘러보기는 받아 오기만 (올리기·손님 일기 합치기 없음)
      if (data.user) void syncAll(data.user.id, data.user.demo);
    } catch {
      setMe(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await api("/api/auth/logout", { method: "POST" }).catch(() => {});
    const owner = diaryOwner();
    const demo = meRef.current?.demo === true;
    setDiaryOwner(null); // 손님 칸으로
    // 서버에 간 일기 사본은 이 기기에서 지운다 (공용 컴퓨터) — 못 올린 일기만 남아 다음 로그인 때 올라간다.
    // 둘러보기에서 쓴 일기는 손님 일기장으로 옮긴다 → 내 이름으로 시작하면 내 일기장으로 합쳐진다
    if (owner) await forgetSynced(owner, demo).catch(() => {});
    if (demo) notifyDiaries();
    meRef.current = null;
    setMe(null);
    setStats(null);
  }, []);

  /** 베타: 예제 일기장 둘러보기 (로그인 화면) */
  const startDemo = useCallback(async () => {
    markAutoDemo();
    await api("/api/auth/demo", { method: "POST" });
    await refresh();
  }, [refresh]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 처음 한 번 서버에 내가 누군지 묻는다
    void refresh();
  }, [refresh]);

  return <MeContext.Provider value={{ me, stats, flags, loading, refresh, logout, startDemo }}>{children}</MeContext.Provider>;
}

export function useMe() {
  return useContext(MeContext);
}
