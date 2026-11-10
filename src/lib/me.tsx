"use client";

// 로그인한 나 (이름표). 모든 화면이 같이 쓴다. 로그인하면 이 기기 일기를 서버와 맞춘다.

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "./api";
import { setDiaryOwner } from "./store";
import { syncAll } from "./sync";

export type Me = {
  id: string;
  nickname: string;
  age: number | null; // 만 나이 → 어른이 초등학교 학년·반 (lib/social.ts gradeClass)
  birth: string | null; // 생년월일 YYYY-MM-DD (생일엔 선생님이 축하)
  kid: "girl" | "boy" | null; // 가입할 때 고른 나 (읽어 주는 목소리)
  email: string;
  nameTag: string;
  admin: boolean;
};
export type MeStats = { diaries: number; stamps: number; board: number; streak: number };
export type Flags = { google: boolean; devLogin: boolean; server: boolean };

type Ctx = {
  me: Me | null;
  stats: MeStats | null;
  flags: Flags | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const MeContext = createContext<Ctx>({
  me: null,
  stats: null,
  flags: null,
  loading: true,
  refresh: async () => {},
  logout: async () => {},
});

export function MeProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [stats, setStats] = useState<MeStats | null>(null);
  const [flags, setFlags] = useState<Flags | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await api<{ user: Me | null; stats?: MeStats; flags: Flags }>("/api/me");
      // 이 기기 일기장 주인 = 로그인한 사람 (없으면 손님 칸). 인터넷이 안 되면(catch) 그대로 둔다 — 오프라인에도 내 일기
      setDiaryOwner(data.user ? data.user.id : null);
      setMe(data.user);
      setStats(data.stats ?? null);
      setFlags(data.flags);
      if (data.user) void syncAll(data.user.id);
    } catch {
      setMe(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await api("/api/auth/logout", { method: "POST" }).catch(() => {});
    setDiaryOwner(null); // 손님 칸으로 — 방금 사람의 일기는 이 기기에 남아도 화면엔 안 나온다
    setMe(null);
    setStats(null);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 처음 한 번 서버에 내가 누군지 묻는다
    void refresh();
  }, [refresh]);

  return <MeContext.Provider value={{ me, stats, flags, loading, refresh, logout }}>{children}</MeContext.Provider>;
}

export function useMe() {
  return useContext(MeContext);
}
