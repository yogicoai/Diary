// 관리자 페이지 겉틀이 맨 먼저 부른다: 누가 들어왔나 + 메뉴 옆 숫자(게시판 확인할 것)
//   로그인 안 함 → 401(아이디 로그인 상자) · 운영자 아님 → 403

import type { NextRequest } from "next/server";
import { adminJson, requireStaff, ROLE_LABEL, seesSystem } from "@/lib/server/admin";
import { cols } from "@/lib/server/db";
import { handle } from "@/lib/server/http";
import { nameTag } from "@/lib/social";

export async function GET(req: NextRequest) {
  return handle(async () => {
    const { user, role } = await requireStaff(req);
    const { diaries } = await cols();
    const todo = await diaries.countDocuments({
      $or: [{ "board.status": "pending" }, { "board.status": "visible", "board.reports": { $gt: 0 } }],
    });
    return adminJson({
      name: user.loginId ?? nameTag(user),
      role,
      roleLabel: ROLE_LABEL[role],
      idAccount: !!user.loginId,
      seesSystem: seesSystem(role),
      todo,
    });
  });
}
