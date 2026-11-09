// 이 기기 일기 ↔ 서버. 이 기기가 먼저(local-first): 로그인 안 해도 다 된다.
// 로그인하면 (1) 못 지운 일기를 서버에서 마저 지우고 (2) 서버에 없는 이 기기 일기를 올리고 (3) 서버 일기를 이 기기로 받아 합친다.

import { api, ApiError } from "./api";
import { deleteDiary, listDiaries, saveDiary, type Diary } from "./store";

export type AwardInfo = { id: string; kind: string; label: string; detail: string; rank: number | null; at: number };

type ServerDiary = Diary & { serverId: string };

export async function pushDiary(d: Diary): Promise<{ diary: ServerDiary; awards: AwardInfo[] }> {
  const res = await api<{ diary: ServerDiary; awards: AwardInfo[] }>("/api/diaries", { method: "POST", json: d });
  // 올리는 사이에 지웠으면 다시 저장하지 않는다 (서버 것은 지우기가 마저 지운다)
  if (!isGone(d.id)) await saveDiary({ ...d, ...pickServer(res.diary) });
  return res;
}

/** 서버가 정하는 값만 이 기기 일기에 덮는다 */
function pickServer(s: ServerDiary): Partial<Diary> {
  return { serverId: s.serverId, board: s.board ?? null, classIds: s.classIds ?? [], reactions: s.reactions ?? {} };
}

/* ---------- 일기 지우기 (11-09 사용자: "이야기 지우기") ----------
 * 이 기기에서 먼저 지우고 서버 것도 지운다. 서버에서 못 지웠으면(인터넷·로그인) 이 기기에 적어 두고
 * 다음 동기화 때 마저 지운다 → 동기화로 되살아나지 않는다. 서버도 지운 기기 id 를 기억해 늦게 온 올리기를 거절한다. */
const GONE_KEY = "chamjal.deleted.v1";
const goneNow = new Set<string>(); // 이 화면에서 방금 지운 것 (올리는 중·받는 중이던 일기가 다시 저장되지 않게)

function goneList(): string[] {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(GONE_KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function setGoneList(list: string[]) {
  try {
    localStorage.setItem(GONE_KEY, JSON.stringify(list.slice(-200)));
  } catch {
    /* 못 적으면 이 화면에서만 기억한다 */
  }
}

function isGone(id: string) {
  return goneNow.has(id) || goneList().includes(id);
}

/** 서버에서 지우기. true = 지웠거나 지울 게 없음, false = 다음에 다시 (인터넷·로그인·서버 문제) */
async function eraseOnServer(id: string): Promise<boolean> {
  try {
    await api(`/api/diaries?clientId=${encodeURIComponent(id)}`, { method: "DELETE" });
  } catch (e) {
    if (!(e instanceof ApiError) || e.status === 401 || e.status === 429 || e.status >= 500) return false;
  }
  setGoneList(goneList().filter((x) => x !== id));
  return true;
}

/** 일기 지우기. "done" = 서버까지 다 지움, "later" = 이 기기에선 지웠고 서버 것은 다음 동기화 때 지움 */
export async function removeDiary(d: Diary, signedIn: boolean): Promise<"done" | "later"> {
  await deleteDiary(d.id);
  goneNow.add(d.id);
  if (!signedIn && !d.serverId) return "done"; // 서버에 간 적 없는 일기
  setGoneList([...goneList().filter((x) => x !== d.id), d.id]);
  return (await eraseOnServer(d.id)) ? "done" : "later";
}

let running: Promise<void> | null = null;

export function syncAll(userId: string): Promise<void> {
  running ??= (async () => {
    try {
      for (const id of goneList()) await eraseOnServer(id); // 못 지운 일기 마저 지우기
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
        if (isGone(s.id)) continue; // 지운 일기는 다시 받지 않는다
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
