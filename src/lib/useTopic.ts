"use client";

// 그날의 숙제 (화면): 기본 숙제(요일·달력)를 바로 보여 주고, 서버에 선생님이 건 숙제가 있으면 바꿔 끼운다.
// 서버가 없거나 못 물어보면 기본 숙제 그대로.

import { useEffect, useMemo, useState } from "react";
import { builtInTopic, type Topic } from "./topics";

const cache = new Map<string, Promise<Topic | null>>();

function fetchTopic(date: string): Promise<Topic | null> {
  let p = cache.get(date);
  if (!p) {
    p = fetch(`/api/topic?date=${date}`)
      .then((r) => (r.ok ? (r.json() as Promise<Topic>) : null))
      .catch(() => null);
    cache.set(date, p);
    // 선생님이 숙제를 바꿀 수 있으니 1분 지나면 다시 묻는다
    setTimeout(() => cache.delete(date), 60_000);
  }
  return p;
}

export function useTopic(date: string | null): Topic | null {
  const base = useMemo(() => (date ? builtInTopic(date) : null), [date]);
  const [server, setServer] = useState<Topic | null>(null);
  useEffect(() => {
    if (!date) return;
    let alive = true;
    void fetchTopic(date).then((t) => alive && t && setServer(t));
    return () => {
      alive = false;
    };
  }, [date]);
  return server && server.date === date ? server : base;
}
