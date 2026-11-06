// 그림칸 크레파스 배경. 그림은 public/bg/<id>.webp (scripts/gpt-bg.mjs 로 만든다)
// 저장된 일기와 공유 링크가 id 로 참조하니, id 를 바꾸거나 지우지 말고 새 배경은 끝에 추가한다.
// "직접 그리기" = 배경 없음(null) = 흰 종이.

export type Background = { id: string; name: string };

export const BACKGROUNDS: Background[] = [];

export function bgSrc(id: string): string {
  return `/bg/${id}.webp`;
}

export function bgThumb(id: string): string {
  return `/bg/thumb/${id}.webp`;
}

export function bgById(id: string | null | undefined): Background | undefined {
  if (!id) return undefined;
  return BACKGROUNDS.find((b) => b.id === id);
}

/** 새 일기의 첫 배경 (배경이 하나도 없으면 직접 그리기) */
export function defaultBg(): string | null {
  return BACKGROUNDS[0]?.id ?? null;
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`배경을 못 불러왔어요: ${src}`));
    img.src = src;
  });
}
