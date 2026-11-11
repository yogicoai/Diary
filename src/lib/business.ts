// 판매 설정 한곳. 결제가 붙기 전까지는 반응만 모은다.
// 11-09 사용자: "대신 그려 줘"(AI 그림 크레딧)는 뺀다 — 그림은 본인이 그린다.
// 팔 것: 배경 팩·스티커 팩, 그림일기 책, 아이 목소리 읽기·영상 (docs/revenue/수익구조.md)

export const SALES_READY = false; // true 가 되면 실제 결제 흐름으로 바뀐다

// 아이 목소리 읽어 주기 (Typecast — 읽는 글자만큼 돈이 든다). 무료판에선 끈다
// (11-10 사용자: "무료 버전으로 풀 거라 그 부분까지 쓰면 우리 쪽 손해"). 꺼져 있으면 서버가 Typecast 를 부르지 않고,
// 소리 내어 읽기 단추와 가입할 때 남자아이·여자아이 고르기도 안 보인다. 유료판에서 켜려면 true + 이 앱 전용 TYPECAST_API_KEY.
export const READ_ALOUD = false;

// AI 그림 = 일기 글로 크레파스 그림 그려 받기 (11-11 클라이언트 피드백 "글을 쓰면 AI 가 그림을", 사용자 결정: 고르는 단추로·하루 1장·GPT 낮은 품질).
// 기본은 그대로 직접 그리기. 한 장 약 6원(그림 gpt-image-1-mini 낮은 품질 + 장면 정리 Claude) — 이름표 있는 사람만 하루 perDay 장,
// 하루 전체 dailyCap 장(약 1,800원)이 넘으면 그날은 멈춘다 (lib/server/picture.ts)
export const AI_PICTURE = { perDay: 1, dailyCap: 300 };

// 베타 (11-10 사용자: "서버 올릴 땐 그냥 개발자 모드 활성화", "베타라 이후 없앨 것"): 배포한 서버(운영 빌드)에서
// "이름만 적고 시작하기"(개발용 로그인)를 열고, 처음 온 사람은 예제 일기장(fe = 3학년 8반 길동)으로 로그인된 채 둘러본다(읽기만).
// 환경변수 없이 배포하면 켜진다. 로컬 개발 서버(next dev)는 꺼진 채 (인트로 시험). 환경변수 BETA=1/0 이 있으면 그게 먼저.
// 정식 출시 전에 false (docs/ROADMAP.md '출시 전에 꼭 할 것') — 자세한 규칙은 lib/server/beta.ts
export const BETA = true;

// 실물 그림일기 책: 50장이 한 권. 가격은 인쇄 견적 전 가설
export const BOOK = { pages: 50, priceFrom: 24900, priceTo: 29900 };

export function won(n: number) {
  return n.toLocaleString("ko-KR") + "원";
}
