import type { Metadata, Viewport } from "next";
import { Gaegu, Gowun_Dodum, Nanum_Pen_Script } from "next/font/google";
import "./globals.css";

// 아이 글씨(일기 본문) · 선생님 글씨(빨간 색연필) · 화면 글씨
const kid = Gaegu({ weight: ["400", "700"], variable: "--font-kid", preload: false, display: "swap" });
const pen = Nanum_Pen_Script({ weight: "400", variable: "--font-pen", preload: false, display: "swap" });
const ui = Gowun_Dodum({ weight: "400", variable: "--font-ui", preload: false, display: "swap" });

export const metadata: Metadata = {
  title: "참 잘했어요 · 어른이 그림일기",
  description: "크레파스로 그리고 세 줄 쓰면, 선생님이 도장을 찍어 줘요.",
  applicationName: "참 잘했어요",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#efe6d2",
};

// 고른 일기장(테마)을 그리기 전에 먼저 입힌다 (깜빡임 방지)
const themeBoot = `try{var t=localStorage.getItem('chamjal.theme');if(t)document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      data-theme="stationery"
      className={`${kid.variable} ${pen.variable} ${ui.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
