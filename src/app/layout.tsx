import type { Metadata, Viewport } from "next";
import { Gaegu, Gowun_Dodum, Nanum_Pen_Script } from "next/font/google";
import "./globals.css";
import "./social.css";
import TabBar from "@/components/TabBar";
import WebBackdrop from "@/components/WebBackdrop";
import { MeProvider } from "@/lib/me";

// 아이 글씨(일기 본문) · 선생님 글씨(빨간 색연필) · 화면 글씨
const kid = Gaegu({ weight: ["400", "700"], variable: "--font-kid", preload: false, display: "swap" });
const pen = Nanum_Pen_Script({ weight: "400", variable: "--font-pen", preload: false, display: "swap" });
const ui = Gowun_Dodum({ weight: "400", variable: "--font-ui", preload: false, display: "swap" });

// 링크 미리보기(카카오톡 등)의 그림 주소를 절대 주소로 만들 때 쓰는 사이트 주소 = AUTH_URL (구글 로그인 돌아올 주소와 같음).
// 그림은 src/app/opengraph-image.jpg (node scripts/og-image.mjs 로 표지를 찍어 만든다)
function siteUrl(): URL | undefined {
  try {
    return process.env.AUTH_URL ? new URL(process.env.AUTH_URL) : undefined;
  } catch {
    return undefined;
  }
}

const TITLE = "참 잘했어요 · 어른이 그림일기";
const DESCRIPTION = "크레파스로 그리고 세 줄 쓰면, 선생님이 도장을 찍어 줘요.";

export const metadata: Metadata = {
  metadataBase: siteUrl(),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: "참 잘했어요",
  openGraph: { title: TITLE, description: DESCRIPTION, siteName: "참 잘했어요", locale: "ko_KR", type: "website" },
  twitter: { card: "summary_large_image" },
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
      <body>
        <MeProvider>
          {children}
          <TabBar />
          <WebBackdrop />
        </MeProvider>
      </body>
    </html>
  );
}
