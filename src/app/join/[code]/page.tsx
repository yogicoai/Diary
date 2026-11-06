import type { Metadata } from "next";
import { JoinClass } from "@/components/ClassPages";

export const metadata: Metadata = {
  title: "우리 반에 초대받았어요 · 참 잘했어요",
  description: "같이 크레파스 그림일기 써요. 들어오면 서로의 일기에 도장을 찍어 줄 수 있어요.",
};

export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <JoinClass code={code.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8)} />;
}
