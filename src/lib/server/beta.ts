// 베타 서버 스위치 (11-10 사용자: "지금은 베타라 개발자 모드로 이미 로그인된 상태로 보여 주기", "이후 없앨 거라").
//
//   켜지는 때: lib/business.ts BETA = true 이고 운영 빌드(배포한 서버)일 때 — 환경변수 없이 올리면 켜진다.
//   환경변수 BETA=1 이면 어디서든 켜고(로컬 시험), BETA=0 이면 끈다. 로컬 개발 서버(next dev)는 기본으로 꺼짐.
//   켜지면 →
//     · 운영에서도 개발용 로그인을 연다: 화면에선 "이름만 적고 시작하기" (구글 로그인 전까지)
//     · 처음 온 사람은 예제 일기장(fe = 3학년 8반 길동, scripts/demo.mjs build)으로 로그인된 채 둘러본다
//   둘러보기 세션은 읽기만 된다: 쓰기 API 는 requireUser 가 모두 막고, 교무실 권한도 없다 (lib/server/session.ts).
//   여러 사람이 같은 예제 일기장을 같이 보기 때문 — 직접 써 보려면 "내 이름으로 시작하기".
//
//   정식 출시 전에 lib/business.ts BETA = false (docs/ROADMAP.md '출시 전에 꼭 할 것'). 끄면 둘러보기 세션은 로그아웃된 것으로 본다.

import { BETA } from "@/lib/business";

export const betaOn = () => {
  if (process.env.BETA === "1") return true;
  if (process.env.BETA === "0") return false;
  return BETA && process.env.NODE_ENV === "production";
};

/** 개발용 로그인(이름만으로 들어가기): 개발(DEV_LOGIN=1, 운영 아님) 또는 베타 서버 */
export const devLoginOn = () => betaOn() || (process.env.NODE_ENV !== "production" && process.env.DEV_LOGIN === "1");

/** 둘러보기 계정 = 예제가 만들어진 fe (demo.mjs build 가 demoBackup 을 남긴다. 예제가 없으면 둘러보기도 없다) */
export const DEMO_SUB = "id:fe";

export const DEMO_READONLY = "예제 일기장은 둘러보기만 돼요. 내 이름으로 시작하면 직접 써 볼 수 있어요";
