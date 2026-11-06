// 공유 링크 (서버 없이): 일기를 압축해 주소 # 뒤에 담는다.
// # 뒤는 서버로 가지 않는다. 카톡 미리보기용 그림은 2단계(서버 저장 + next/og)에서 만든다.
// 형식을 바꾸면 v 를 올리고 옛 형식도 읽게 둔다.

import type { Stroke } from "./crayon";
import type { Diary } from "./store";
import type { WeatherId } from "./weather";

type Packed = {
  v: 1;
  d: string; // 날짜
  w: WeatherId | null;
  t: string; // 제목
  b: string | null; // 본문 (비밀이면 null)
  c: string; // 선생님 한 줄
  s: [string, number, number[], 0 | 1][]; // [색, 굵기×1000, 점들(0~4095, x,y 번갈아), 지우개]
};

const Q = 4095;

function pack(d: Diary): Packed {
  return {
    v: 1,
    d: d.date,
    w: d.weather,
    t: d.title,
    b: d.secret ? null : d.body,
    c: d.teacher,
    s: d.strokes.map((st) => [
      st.color,
      Math.round(st.size * 1000),
      st.points.flatMap((p) => [Math.round(p.x * Q), Math.round(p.y * Q)]),
      st.erase ? 1 : 0,
    ]),
  };
}

function unpack(p: Packed): Diary {
  const strokes: Stroke[] = p.s.map(([color, size, pts, erase]) => {
    const points = [];
    for (let i = 0; i + 1 < pts.length; i += 2) points.push({ x: pts[i] / Q, y: pts[i + 1] / Q });
    return { color, size: size / 1000, points, erase: erase === 1 };
  });
  return {
    id: "shared",
    date: p.d,
    weather: p.w,
    title: p.t,
    body: p.b ?? "",
    strokes,
    teacher: p.c,
    secret: p.b === null,
    createdAt: 0,
  };
}

function toB64url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function deflate(text: string): Promise<Uint8Array> {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function inflate(bytes: Uint8Array): Promise<string> {
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return await new Response(stream).text();
}

export async function shareUrl(d: Diary): Promise<string> {
  const data = await deflate(JSON.stringify(pack(d)));
  return `${location.origin}/d#${toB64url(data)}`;
}

export async function readShared(hash: string): Promise<Diary | null> {
  try {
    const raw = hash.replace(/^#/, "");
    if (!raw) return null;
    const p = JSON.parse(await inflate(fromB64url(raw))) as Packed;
    if (p.v !== 1) return null;
    return unpack(p);
  } catch {
    return null;
  }
}
