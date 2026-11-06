// 원고지 칸 나누기. 화면 입력칸과 카드 그림이 같은 규칙을 쓴다.

export const COLS = 10;
export const ROWS = 6;
export const MAX_CHARS = COLS * ROWS;

/** 글을 칸 배열로. 줄바꿈은 그 줄 남은 칸을 비운다. 칸이 넘치면 잘린다. */
export function layoutCells(text: string, cols = COLS, rows = ROWS): string[] {
  const cells: string[] = [];
  const total = cols * rows;
  for (const ch of Array.from(text)) {
    if (cells.length >= total) break;
    if (ch === "\n") {
      const rest = cols - (cells.length % cols);
      if (rest !== cols || cells.length === 0) for (let i = 0; i < rest && cells.length < total; i++) cells.push("");
      continue;
    }
    cells.push(ch);
  }
  return cells;
}

/** 칸 수 기준 글자 수 (줄바꿈이 먹은 칸 포함) */
export function usedCells(text: string): number {
  return layoutCells(text, COLS, ROWS * 4).length;
}

/** 칸이 넘치지 않는 데까지만 자른다 */
export function clampText(text: string): string {
  let out = "";
  for (const ch of Array.from(text)) {
    const next = out + ch;
    if (usedCells(next) > MAX_CHARS) break;
    out = next;
  }
  return out;
}
