// 아이 목소리로 일기 읽어 주기 (Typecast). 11-09 사용자: 여자아이 = 수아, 남자아이 = 태지.
// - 키: TYPECAST_API_KEY (서버 환경변수에만). 없으면 꺼짐 → 화면에 버튼이 안 보인다.
//   지금 계정은 보이스동화·한글나라와 같이 쓴다 → 운영에 켜려면 이 앱 전용 요금제·키가 필요 (CLAUDE.md)
// - 1글자 = 1크레딧. 이번 달 사용이 안전선을 넘으면 잠근다. 같은 글은 기기에 저장해 다시 부르지 않는다(lib/readAloud.ts).
// - Typecast(네오사피엔스)는 국내 회사라 국외 이전이 아니다. 개인정보 처리방침의 처리 위탁에 적는다.

import { z } from "zod";
import { READ_ALOUD } from "@/lib/business";
import { readScript, READ_TEMPO } from "@/lib/readScript";

const API = "https://api.typecast.ai";
const MODEL = "ssfm-v30";
const VOICES = {
  girl: "tc_6699eb5749dfac016c29445c", // 수아
  boy: "tc_660645fb8db3e2c06ff7070b", // 태지
} as const;
const SAFE_LIMIT = 190_000; // 같은 계정 전체(이번 달) 안전선


const Body = z.object({
  voice: z.enum(["girl", "boy"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weather: z.string().nullable(),
  title: z.string().max(30),
  body: z.string().max(240),
});

// 이번 달 사용량: 5분마다 한 번만 묻고, 그 사이엔 여기서 더해 간다
let sub: { at: number; used: number } | null = null;
let since = 0;
async function usedThisMonth(key: string): Promise<number | null> {
  if (sub && Date.now() - sub.at < 5 * 60 * 1000) return sub.used + since;
  try {
    const res = await fetch(`${API}/v1/users/me/subscription`, { headers: { "X-API-KEY": key } });
    if (!res.ok) return null;
    const d = (await res.json()) as { credits?: { used_credits?: number } };
    sub = { at: Date.now(), used: Number(d.credits?.used_credits ?? 0) };
    since = 0;
    return sub.used;
  } catch {
    return null;
  }
}

// 남용 막기 (서버 인스턴스마다 따로 셈)
const hits = new Map<string, number[]>();
function limited(ip: string): boolean {
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < 60 * 60 * 1000);
  list.push(now);
  hits.set(ip, list);
  return list.length > 12;
}

/** 버튼을 보여 줄지 (무료판은 꺼 둔다: lib/business.ts READ_ALOUD) */
export function GET() {
  return Response.json({ on: READ_ALOUD && !!process.env.TYPECAST_API_KEY });
}

export async function POST(req: Request) {
  const key = process.env.TYPECAST_API_KEY;
  if (!READ_ALOUD || !key) return Response.json({ error: "off" }, { status: 503 });

  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (origin && host && new URL(origin).host !== host) {
    return Response.json({ error: "origin" }, { status: 403 });
  }
  const ip = (req.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim();
  if (limited(ip)) return Response.json({ error: "too_many" }, { status: 429 });

  let input: z.infer<typeof Body>;
  try {
    input = Body.parse(await req.json());
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  const text = readScript(input);
  if (!input.title.trim() && !input.body.trim()) return Response.json({ error: "empty" }, { status: 400 });

  const used = await usedThisMonth(key);
  if (used !== null && used + text.length > SAFE_LIMIT) {
    return Response.json({ error: "month_limit" }, { status: 429 });
  }

  const res = await fetch(`${API}/v1/text-to-speech`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-KEY": key },
    body: JSON.stringify({
      voice_id: VOICES[input.voice],
      text,
      model: MODEL,
      language: "kor",
      output: { audio_format: "mp3", audio_tempo: READ_TEMPO[input.voice] }, // 빠르기는 output 안에만 먹는다 (보이스동화 실측)
    }),
  });
  if (!res.ok) {
    return Response.json({ error: res.status === 402 ? "credits" : "voice" }, { status: 502 });
  }
  since += text.length;
  return new Response(await res.arrayBuffer(), {
    headers: { "Content-Type": res.headers.get("content-type") ?? "audio/mpeg", "Cache-Control": "no-store" },
  });
}
