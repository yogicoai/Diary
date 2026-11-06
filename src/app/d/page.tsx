import type { Metadata } from "next";
import SharedDiary from "@/components/SharedDiary";

export const metadata: Metadata = {
  title: "친구가 그림일기를 보냈어요 · 참 잘했어요",
  description: "크레파스로 그린 오늘의 그림일기. 나도 세 줄 쓰고 도장 받기.",
};

export default function SharedPage() {
  return <SharedDiary />;
}
