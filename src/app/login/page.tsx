import type { Metadata } from "next";
import LoginPage from "@/components/LoginPage";

export const metadata: Metadata = { title: "이름표 만들기 · 참 잘했어요" };

export default function Page() {
  return <LoginPage />;
}
