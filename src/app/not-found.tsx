import type { Metadata } from "next";
import NotFoundPage from "@/components/NotFoundPage";

// 없는 주소 → 일기장 한 쪽 모양 404 (기본 영어 화면 대신)
export const metadata: Metadata = { title: "없는 쪽이에요 · 참 잘했어요" };

export default function NotFound() {
  return <NotFoundPage />;
}
