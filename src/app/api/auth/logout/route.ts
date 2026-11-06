import { NextResponse, type NextRequest } from "next/server";
import { assertSameOrigin, handle } from "@/lib/server/http";
import { clearSession } from "@/lib/server/session";

export async function POST(req: NextRequest) {
  return handle(async () => {
    assertSameOrigin(req);
    const res = NextResponse.json({ ok: true });
    clearSession(res);
    return res;
  });
}
