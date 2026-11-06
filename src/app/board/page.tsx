import type { Metadata } from "next";
import BoardPage from "@/components/BoardPage";

export const metadata: Metadata = { title: "교실 뒤 게시판 · 참 잘했어요" };

export default function Page() {
  return <BoardPage />;
}
