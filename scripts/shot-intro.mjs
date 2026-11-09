// 처음 온 사람 인트로(표지 → 쓰는 법 3장 → 이름표) + 진짜 날씨 칸 캡처 (390px). 돈 드는 호출 없음.
//   npm run dev:mem 켠 뒤 node scripts/shot-intro.mjs → shots/intro
import puppeteer from "puppeteer-core";
import fs from "node:fs";

const B = process.argv[2] || "http://localhost:6900";
const OUT = "shots/intro";
fs.mkdirSync(OUT, { recursive: true });
const edge = ["C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Microsoft/Edge/Application/msedge.exe"].find((p) => fs.existsSync(p));
const browser = await puppeteer.launch({ executablePath: edge, headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const click = (text) =>
  page.evaluate((t) => {
    const el = [...document.querySelectorAll("button, a")].find((x) => x.textContent?.trim() === t);
    el?.click();
    return !!el;
  }, text);
const shot = async (name, full = false) => {
  await sleep(700);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: full });
};

await page.goto(`${B}/`, { waitUntil: "networkidle0" });
await page.evaluate(() => localStorage.clear());
await page.goto(`${B}/`, { waitUntil: "networkidle0" });
await page.waitForSelector(".c90", { timeout: 20000 });
const tabHidden = await page.evaluate(() => !document.querySelector(".tabbar") || getComputedStyle(document.querySelector(".tabbar")).display === "none");
await shot("1-cover");
await click("일기장 펼치기");
await shot("2-weather");
await click("다음");
await shot("3-drawing");
await click("다음");
await shot("4-stamp");
await click("이름표 만들기");
await shot("5-join");
await click("받은 아이디로 들어가기");
await shot("6-join-id", true);
await click("로그인 없이 먼저 써 볼게요");
await page.waitForSelector(".page-head", { timeout: 20000 });
await shot("7-editor");
// 다시 와도 인트로가 안 나오나
await page.goto(`${B}/`, { waitUntil: "networkidle0" });
await sleep(800);
const again = await page.evaluate(() => !!document.querySelector(".c90"));
// 날씨 고르기: 눈
await page.evaluate(() => document.querySelector('.weather button[aria-label="눈"]')?.click());
await sleep(900);
await page.screenshot({ path: `${OUT}/8-weather-snow.png`, clip: { x: 0, y: 0, width: 390, height: 420 } });
const word = await page.evaluate(() => document.querySelector(".weather-word")?.textContent);
const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
console.log(`탭 숨김: ${tabHidden} / 다시 오면 인트로: ${again} / 고른 날씨 글자: ${word} / 가로 넘침: ${overflow}`);
console.log(errors.length ? "브라우저 오류:\n" + errors.join("\n") : "브라우저 오류 없음");
await browser.close();
