import { ClassDetail } from "@/components/admin/Classes";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ClassDetail key={id} id={id} />;
}
