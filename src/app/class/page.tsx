import type { Metadata } from "next";
import { ClassList } from "@/components/ClassPages";

export const metadata: Metadata = { title: "우리 반 · 참 잘했어요" };

export default function Page() {
  return <ClassList />;
}
