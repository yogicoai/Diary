// 링크 미리보기 그림 (카카오톡·문자로 주소를 보낼 때 뜨는 그림) → src/app/opengraph-image.jpg (1200×630)
// 앱의 90년대 그림일기장 표지(.c90)를 그대로 찍어서 문구점 낙서 배경(public/web-bg/doodle.webp) 가운데에 놓는다.
// 유료 생성 없음. 표지 디자인을 바꾸면 다시 돌린다: 6900 서버를 켠 뒤 node scripts/og-image.mjs [서버 주소]
// (카카오톡은 그림을 네모로 잘라 보여 줄 때도 있어서 표지를 가운데에 둔다)
import fs from "node:fs";
import puppeteer from "puppeteer-core";
import sharp from "sharp";

const base = process.argv[2] || "http://localhost:6900";
const W = 1200;
const H = 630;
const out = "src/app/opengraph-image.jpg";

const edge = [
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
].find((p) => fs.existsSync(p));

const browser = await puppeteer.launch({ executablePath: edge, headless: true });
let cover;
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3 });
  // 처음 온 손님 = 인트로 표지 (이름 칸이 빈 그림일기장)
  await page.goto(base + "/?cover=1", { waitUntil: "networkidle0" });
  await page.waitForSelector(".c90");
  await page.addStyleTag({ content: "html,body,main,.app{background:transparent !important} .c90{margin:0 !important}" });
  await new Promise((r) => setTimeout(r, 800));
  const el = await page.$(".c90");
  cover = Buffer.from(await el.screenshot({ omitBackground: true }));
} finally {
  await browser.close();
}

const coverH = H - 56; // 위아래 28px 여백
const coverPng = await sharp(cover).resize({ height: coverH }).png().toBuffer();
const { width: coverW } = await sharp(coverPng).metadata();
// 표지 아래 살짝 그림자 (종이 위에 놓인 느낌)
const shadow = await sharp({
  create: { width: coverW + 40, height: coverH + 40, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
})
  .composite([
    {
      input: Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${coverW + 40}" height="${coverH + 40}"><rect x="26" y="28" width="${coverW - 12}" height="${coverH - 10}" rx="18" fill="rgba(60,40,20,0.28)"/></svg>`,
      ),
    },
  ])
  .blur(10)
  .png()
  .toBuffer();

const bg = await sharp("public/web-bg/doodle.webp").resize(W, H, { fit: "cover" }).toBuffer();
const left = Math.round((W - coverW) / 2);
await sharp(bg)
  .composite([
    { input: shadow, left: left - 20, top: 28 - 20 },
    { input: coverPng, left, top: 28 },
  ])
  .jpeg({ quality: 86, mozjpeg: true })
  .toFile(out);
const kb = Math.round(fs.statSync(out).size / 1024);
console.log(`${out} ${W}×${H} (${kb}KB) — 표지 ${coverW}×${coverH}`);
