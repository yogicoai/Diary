"use client";

// 로그인한 나 (이름표). 모든 화면이 같이 쓴다. 로그인하면 이 기기 일기를 서버와 맞춘다.

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "./api";
import { syncAll } from "./sync";

export type Me = {
  id: string;
  nickname: string;
  entryYear: number | null;
  classNo: number;
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
