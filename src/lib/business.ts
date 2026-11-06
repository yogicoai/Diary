// 판매 설정 한곳. 결제가 붙기 전까지 가격표는 "이 가격이면 살래요" 반응만 모은다.
// 가격·묶음은 docs/revenue 조사 결과로 다시 정한다.

export const SALES_READY = false; // true 가 되면 실제 결제 흐름으로 바뀐다

export type Pack = { id: string; credits: number; price: number; best?: boolean };

// 원본(chamjal-diary) 가설 가격 그대로. 1크레딧 = AI 그림 1장
export const PACKS: Pack[] = [
  { id: "p5", credits: 5, price: 2900 },
  { id: "p15", credits: 15, price: 6900, best: true },
  { id: "p40", credits: 40, price: 14900 },
];

export function won(n: number) {
  return n.toLocaleString("ko-KR") + "원";
}
