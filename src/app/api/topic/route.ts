// 그날의 숙제 (누구나): ?date=YYYY-MM-DD. 선생님이 건 숙제 → 그날만의 숙제 → 요일 숙제

import { NextResponse, type NextRequest } from "next/server";
import { handle, HttpError } from "@/lib/server/http";
import { DATE_KEY, resolveTopic } from "@/lib/server/topics";

export async function GET(req: NextRequest) {
  return handle(async () => {
    const date = req.nextUrl.searchParams.get("date") ?? "";
    if (!DATE_KEY.test(date)) throw new HttpError(400, "date");
    const topic = await resolveTopic(date);
    return NextResponse.json(topic, { headers: { "Cache-Control": "public, max-age=60" } });
  });
}
