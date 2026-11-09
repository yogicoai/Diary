import { MemberDetail } from "@/components/admin/Members";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MemberDetail key={id} id={id} />;
}
