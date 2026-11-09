// 교무실(/admin)에 들어오는 선생님 아이디 — 이 두 개뿐 (11-09 사용자: "fe 개발자·yogico 클라이언트 두 아이디만 접근").
// 일반 사용자는 구글로만 가입하고, 아이디 로그인은 이 두 선생님만 교무실 들어가는 곳에서 쓴다. 아이디 가입 길은 없다.

export type StaffRole = "developer" | "company";

export const STAFF_IDS: Record<string, StaffRole> = { fe: "developer", yogico: "company" };
export const STAFF_LOGIN_IDS = Object.keys(STAFF_IDS);

export const ROLE_LABEL: Record<StaffRole, string> = { developer: "전산 선생님", company: "교장 선생님" };

export function staffOfLoginId(id?: string | null): StaffRole | null {
  return id && Object.hasOwn(STAFF_IDS, id) ? STAFF_IDS[id] : null;
}
