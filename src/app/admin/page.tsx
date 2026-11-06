import type { Metadata } from "next";
import AdminPage from "@/components/AdminPage";

export const metadata: Metadata = { title: "선생님 확인함 · 참 잘했어요", robots: { index: false } };

export default function Page() {
  return <AdminPage />;
}
