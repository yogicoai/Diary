// 이 기기 일기 ↔ 서버. 이 기기가 먼저(local-first): 로그인 안 해도 다 된다.
// 로그인하면 (1) 서버에 없는 이 기기 일기를 올리고 (2) 서버 일기를 이 기기로 받아 합친다.

import { api } from "./api";
import { listDiaries, saveDiary, type Diary } from "./store";

export type AwardInfo = { id: string; kind: string; label: string; detail: string; rank: number | null; at: number };

type ServerDiary = Diary & { serverId: string };

export async function pushDiary(d: Diary): Promise<{ diary: ServerDiary; awards: AwardInfo[] }> {
  const res = await api<{ diary: ServerDiary; awards: AwardInfo[] }>("/api/diaries", { method: "POST", json: d });
  await saveDiary({ ...d, ...pickServer(res.diary) });
  return res;
}

/** 서버가 정하는 값만 이 기기 일기에 덮는다 */
function pickServer(s: ServerDiary): Partial<Diary> {
  return { serverId: s.serverId, board: s.board ?? null, classIds: s.classIds ?? [], reactions: s.reactions ?? {} };
}

let running: Promise<void> | null = null;

export function syncAll(userId: string): Promise<void> {
  running ??= (async () => {
    try {
      const local = await listDiaries();
      const flag = `chamjal.synced.${userId}`;
      let first = false;
      try {
        first = !localStorage.getItem(flag);
      } catch {
        /* 못 읽으면 매번 올려 본다 (서버가 기기 id 로 겹치지 않게 막는다) */
        first = true;
      }
      if (first) {
        for (const d of local.filter((x) => !x.serverId)) await pushDiary(d).catch(() => {});
        try {
          localStorage.setItem(flag, "1");
        } catch {
          /* 무시 */
        }
      }
      const { diaries } = await api<{ diaries: ServerDiary[] }>("/api/diaries");
      const byId = new Map((await listDiaries()).map((d) => [d.id, d]));
      for (const s of diaries) {
        const mine = byId.get(s.id);
        await saveDiary(mine ? { ...mine, ...pickServer(s) } : s);
      }
    } catch {
      /* 서버가 안 되면 다음에 다시 */
    } finally {
      running = null;
    }
  })();
  return running;
}
