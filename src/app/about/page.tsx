import type { Metadata } from "next";
import AboutPage from "@/components/AboutPage";

// 이 앱은요? — 어떤 앱인지 앱 화면 조각 그대로 보여 주는 설명 쪽 (11-10)
export const metadata: Metadata = {
  title: "이 앱은요? · 참 잘했어요",
  description: "어릴 때 쓰던 그림일기장을 어른이 되어 다시 쓰는 앱. 크레파스로 그리고 세 줄 쓰면 선생님이 도장을 찍어 줘요.",
};

export default function Page() {
  return <AboutPage />;
}
