// 교무실(/admin)에 들어오는 선생님 아이디 — 이 두 개뿐 (11-09 사용자: "fe·yogico 두 아이디만 접근").
// 권한은 아이디 이름으로 정한다. 그래서 이 두 아이디는 실제 서버에서 '선생님 가입 코드'(STAFF_SIGNUP_CODE)가 있어야만 가입된다.

export type StaffRole = "developer" | "company";

export const STAFF_IDS: Record<string, StaffRole> = { fe: "developer", yogico: "company" };
export const STAFF_LOGIN_IDS = Object.keys(STAFF_IDS);

export const ROLE_LABEL: Record<StaffRole, string> = { developer: "전산 선생님", company: "교장 선생님" };

export function staffOfLoginId(id?: string | null): StaffRole | null {
  return id && Object.hasOwn(STAFF_IDS, id) ? STAFF_IDS[id] : null;
}

/** 아무도 가입 못 하는 아이디 (헷갈리거나 사칭에 쓰일 만한 것) */
export const BLOCKED_IDS = ["admin", "root", "master", "teacher", "system", "chamjal", "support", "help", "staff"];

/** 아이디 규칙: 영문 소문자로 시작, 소문자·숫자·._- 2~20자 */
export const LOGIN_ID = /^[a-z][a-z0-9_.-]{1,19}$/;
