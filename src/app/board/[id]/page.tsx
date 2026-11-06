import type { Metadata } from "next";
import { ObjectId } from "mongodb";
import BoardDetail from "@/components/BoardDetail";
import { cols } from "@/lib/server/db";

type Props = { params: Promise<{ id: string }> };

// 카톡·인스타 미리보기: 게시판에 붙은 카드 그림
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const base: Metadata = { title: "친구의 그림일기 · 참 잘했어요" };
  if (!ObjectId.isValid(id)) return base;
  try {
    const { diaries } = await cols();
    const d = await diaries.findOne({ _id: new ObjectId(id), "board.status": "visible" }, { projection: { title: 1, board: 1 } });
    if (!d?.board) return base;
    const title = `${d.title || "오늘의 그림일기"} · 참 잘했어요`;
    return {
      title,
      description: "교실 뒤 게시판에 붙은 그림일기예요. 도장을 찍어 주세요.",
      openGraph: { title, images: [{ url: d.board.cardUrl, width: 1080, height: 1920 }] },
    };
  } catch {
    return base;
  }
}

export default async function Page({ params }: Props) {
  const { id } = await params;
  return <BoardDetail id={id} />;
}
