// src/app/icon.svg → public/icons/icon-192.png, icon-512.png (설치된 Edge로 그림)
import puppeteer from "puppeteer-core";
import fs from "node:fs";

const edge = [
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
].find((p) => fs.existsSync(p));
const svg = fs.readFileSync("src/app/icon.svg", "utf8");
fs.mkdirSync("public/icons", { recursive: true });

const browser = await puppeteer.launch({ executablePath: edge, headless: true });
try {
  const page = await browser.newPage();
  for (const size of [192, 512]) {
    await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 });
    await page.setContent(
      `<html><body style="margin:0;background:#fffaf0">${svg.replace("<svg ", `<svg width="${size}" height="${size}" `)}</body></html>`,
    );
    await page.screenshot({ path: `public/icons/icon-${size}.png`, omitBackground: false });
  }
  console.log("아이콘 만듦: public/icons/icon-192.png, icon-512.png");
} finally {
  await browser.close();
}
