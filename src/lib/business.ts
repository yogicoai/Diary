// 판매 설정 한곳. 결제가 붙기 전까지는 반응만 모은다.
// 11-09 사용자: "대신 그려 줘"(AI 그림 크레딧)는 뺀다 — 그림은 본인이 그린다.
// 팔 것: 배경 팩·스티커 팩, 그림일기 책, 아이 목소리 읽기·영상 (docs/revenue/수익구조.md)

export const SALES_READY = false; // true 가 되면 실제 결제 흐름으로 바뀐다

// 실물 그림일기 책: 50장이 한 권. 가격은 인쇄 견적 전 가설
export const BOOK = { pages: 50, priceFrom: 24900, priceTo: 29900 };

export function won(n: number) {
  return n.toLocaleString("ko-KR") + "원";
}
