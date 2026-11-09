// Typecast 시험: 아이 목소리 후보 찾기 / 일기 읽기 견본 만들기
// 키는 하온이 한글나라(Desktop/todo/.env.local)의 TYPECAST_API_KEY 를 빌려 쓴다 — 복사하지 않는다 (11-09 사용자: "이미 연결되어 있는데")
//   node --env-file=../todo/.env.local scripts/typecast.mjs list            아이·선생님 후보 목록 (크레딧 안 씀)
//   node --env-file=../todo/.env.local scripts/typecast.mjs sample <voice_id,...> [--teacher <voice_id,...>]
// 같은 계정을 보이스동화·한글나라와 같이 쓴다: 이번 달 사용이 안전선(19만)을 넘으면 멈춘다. 1글자 = 1크레딧.
import fs from "node:fs";

const API = "https://api.typecast.ai";
const MODEL = "ssfm-v30";
const SAFE_LIMIT = 190_000;
const KEY = process.env.TYPECAST_API_KEY;
if (!KEY) throw new Error("TYPECAST_API_KEY 가 없어요 (--env-file 확인)");

const DIARY =
  "2026년 11월 9일 월요일. 날씨, 맑음. 제목, 떡볶이 먹은 날. 퇴근하고 친구랑 떡볶이를 먹었다. 너무 맛있어서 웃음이 났다.";
const TEACHER = "배부르면 마음도 든든해요. 참 잘했어요!";

async function voices() {
  const res = await fetch(`${API}/v3/voices?model=${MODEL}`, { headers: { "X-API-KEY": KEY } });
  if (!res.ok) throw new Error(`보이스 목록 ${res.status}`);
  return res.json();
}

async function used() {
  const res = await fetch(`${API}/v1/users/me/subscription`, { headers: { "X-API-KEY": KEY } });
  if (!res.ok) return null;
  const d = await res.json();
  return Number(d.credits?.used_credits ?? 0);
}

async function speak(voice, text) {
  const res = await fetch(`${API}/v1/text-to-speech`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-KEY": KEY },
    body: JSON.stringify({ voice_id: voice, text, model: MODEL, language: "kor", output: { audio_format: "mp3" } }),
  });
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 200)}`);
  return Buffer.from(await res.arrayBuffer());
}

const cmd = process.argv[2];
if (cmd === "list") {
  const all = await voices();
  const ages = {};
  for (const v of all) ages[v.age ?? "-"] = (ages[v.age ?? "-"] ?? 0) + 1;
  console.log("나이대별 개수:", JSON.stringify(ages));
  const kid = all.filter((v) => /child|kid|teen/i.test(v.age ?? ""));
  console.log(`아이 목소리 후보 ${kid.length}개:`);
  for (const v of kid) {
    const em = v.models.find((m) => m.version === MODEL)?.emotions ?? [];
    console.log(`  ${v.voice_name.kor} (${v.voice_name.eng}) ${v.voice_id} · ${v.gender}/${v.age} · ${em.join(",")} · ${v.preview_url ?? ""}`);
  }
  console.log(`이번 달 사용 ${(await used())?.toLocaleString() ?? "?"} 크레딧`);
} else if (cmd === "sample") {
  // voice_id(tc_…) 또는 한국어 이름(수아·민정…)
  const all = await voices();
  const toId = (x) => (x.startsWith("tc_") ? x : all.find((v) => v.voice_name.kor === x)?.voice_id ?? "");
  const kids = (process.argv[3] ?? "").split(",").filter(Boolean).map(toId).filter(Boolean);
  const ti = process.argv.indexOf("--teacher");
  const teachers = ti > 0 ? process.argv[ti + 1].split(",").filter(Boolean).map(toId).filter(Boolean) : [];
  const nameOf = (id) => all.find((v) => v.voice_id === id)?.voice_name.kor ?? id;
  const cost = kids.length * [...DIARY].length + teachers.length * [...TEACHER].length;
  const before = await used();
  console.log(`이번에 쓸 크레딧 약 ${cost} · 이번 달 사용 ${before?.toLocaleString() ?? "?"} / 안전선 ${SAFE_LIMIT.toLocaleString()}`);
  if (before !== null && before + cost > SAFE_LIMIT) throw new Error("안전선을 넘어요 — 멈춰요");
  fs.mkdirSync("drafts/voice", { recursive: true });
  for (const v of kids) {
    fs.writeFileSync(`drafts/voice/아이-${nameOf(v)}.mp3`, await speak(v, DIARY));
    console.log(`✓ 아이 ${nameOf(v)}`);
  }
  for (const v of teachers) {
    fs.writeFileSync(`drafts/voice/선생님-${nameOf(v)}.mp3`, await speak(v, TEACHER));
    console.log(`✓ 선생님 ${nameOf(v)}`);
  }
  console.log(`이번 달 사용 ${(await used())?.toLocaleString() ?? "?"} 크레딧`);
} else {
  console.log("node --env-file=../todo/.env.local scripts/typecast.mjs list | sample <id,...> [--teacher <id,...>]");
}
