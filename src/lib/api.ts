// 화면 → 서버 API 부르기

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, headers, ...rest } = init;
  const res = await fetch(path, {
    ...rest,
    headers: json !== undefined ? { "Content-Type": "application/json", ...headers } : headers,
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
  if (!res.ok) {
    // 베타 둘러보기(예제 일기장)에서 쓰기를 하려 하면 → 안내 시트 (components/BetaBar.tsx)
    if (res.status === 403 && data.error === "demo" && typeof window !== "undefined") window.dispatchEvent(new Event(DEMO_EVENT));
    throw new ApiError(res.status, data.error ?? "error", data.message ?? "잠시 문제가 생겼어요");
  }
  return data as T;
}

/** 베타 둘러보기 안내 시트 열기 알림 */
export const DEMO_EVENT = "chamjal:demo";

export function loginUrl(next: string) {
  return `/login?next=${encodeURIComponent(next)}`;
}
