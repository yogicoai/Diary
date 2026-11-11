// 그림 통로: 저장소(카페24)의 AI 그림을 우리 사이트 주소로 건네준다 (11-11).
// 카페24 는 CORS 를 주지 않아서, 카드·게시판 미리보기 캔버스에 AI 그림을 그리려면 같은 사이트 주소여야 한다 (lib/backgrounds.ts bgImage).
// 이 앱이 올린 AI 그림(ai/ 폴더, 우리가 만든 이름 모양)만 건넨다. 그림 이름은 바뀌지 않으니 하루 캐시
// (지운 그림이 오래 남지 않게 길게 두지 않는다).

import type { NextRequest } from "next/server";
import { isStoredImage } from "@/lib/server/storage";

export async function GET(req: NextRequest) {
  const u = req.nextUrl.searchParams.get("u") ?? "";
  if (!u.startsWith("https://") || !isStoredImage(u, "ai")) return new Response("not found", { status: 404 });
  const r = await fetch(u, { signal: AbortSignal.timeout(10_000) }).catch(() => null);
  if (!r?.ok || !r.body) return new Response("not found", { status: 404 });
  return new Response(r.body, {
    headers: {
      "Content-Type": r.headers.get("content-type") ?? "image/webp",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
