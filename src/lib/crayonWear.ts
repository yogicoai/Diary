// 몽당 크레파스: 많이 칠한 색일수록 짧아지고 끝이 뭉툭해진다 (11-09 사용자)
// 이 기기에만 저장. 다 닳으면 "새 크레파스 꺼내기" (나중에 크레파스 팩 상품과 이어진다)

const KEY = "chamjal.crayonWear";
/** 이만큼(화면 px) 칠하면 다 닳는다. 그림 열 장쯤 */
const LIFE = 45_000;

function read(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<string, number>;
  } catch {
    return {};
  }
}

function write(v: Record<string, number>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(v));
  } catch {
    /* 무시 */
  }
}

/** 0 = 새것, 1 = 다 닳음 */
export function wearMap(): Record<string, number> {
  const raw = read();
  return Object.fromEntries(Object.entries(raw).map(([k, px]) => [k, Math.min(1, px / LIFE)]));
}

export function addWear(id: string, px: number) {
  const raw = read();
  raw[id] = (raw[id] ?? 0) + px;
  write(raw);
}

export function newCrayon(id: string) {
  const raw = read();
  delete raw[id];
  write(raw);
}
