import type { MetadataRoute } from "next";

// 안드로이드 앱(TWA)으로 감쌀 때 쓰는 설명서. PNG 아이콘은 scripts/icons.mjs 로 만든다.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "참 잘했어요 · 어른이 그림일기",
    short_name: "참 잘했어요",
    description: "크레파스로 그리고 세 줄 쓰면, 선생님이 도장을 찍어 줘요.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#e9dcc0",
    theme_color: "#e9dcc0",
    lang: "ko",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
