import { ClassFeed } from "@/components/ClassPages";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ClassFeed id={id} />;
}
