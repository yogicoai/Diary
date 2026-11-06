import type { Metadata } from "next";
import DiaryShelf from "@/components/DiaryShelf";

export const metadata: Metadata = { title: "내 일기장 · 참 잘했어요" };

export default function DiaryPage() {
  return <DiaryShelf />;
}
