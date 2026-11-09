import type { Metadata } from "next";
import AdminShell from "@/components/admin/AdminShell";
import "./admin.css";

export const metadata: Metadata = { title: "교무실 · 참 잘했어요", robots: { index: false, follow: false } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
