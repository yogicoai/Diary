import type { Metadata } from "next";
import SharedDiary from "@/components/SharedDiary";

const TITLE = "친구가 그림일기를 보냈어요 · 참 잘했어요";
const DESCRIPTION = "크레파스로 그린 오늘의 그림일기. 나도 세 줄 쓰고 도장 받기.";

// 카카오톡으로 받은 링크 미리보기도 이 문구로. openGraph 를 따로 적으면 루트 그림을 물려받지 않아서 그림(app/opengraph-image.jpg)도 적는다
export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    siteName: "참 잘했어요",
    locale: "ko_KR",
    type: "website",
    images: [{ url: "/opengraph-image.jpg", width: 1200, height: 630, alt: "참 잘했어요 · 어른이 그림일기 — 90년대 그림일기장 표지" }],
  },
};

export default function SharedPage() {
  return <SharedDiary />;
}
