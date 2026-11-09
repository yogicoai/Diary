// 오늘의 숙제(어른이 미션) 화면 캡처: 숙제 하기 → 검사 끝·스티커 → 나 스티커판 → 게시판 숙제 벽 (390px)
//   npm run dev:mem 켠 뒤 node scripts/shot-homework.mjs → shots/homework
//   보여 주기를 골라서 실제 Claude 게시판 검사가 한 번씩 돈다 (한 번에 약 0.4원)
import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";

const B = "http://localhost:6900";
const [NAME_A = "하늘", NAME_B = "바다"] = process.argv.slice(2); // 같은 날 다시 돌릴 땐 다른 이름으로
const OUT = "shots/homework";
fs.mkdirSync(OUT, { recursive: true });
const PHOTO = path.resolve("public/bg/park.webp");
const edge = ["C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Microsoft/Edge/Application/msedge.exe"].find((p) => fs.existsSync(p));
const browser = await puppeteer.launch({ executablePath: edge, headless: true });
const errors = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function user(name) {
  const ctx = await browser.createBrowserContext();
  const p = await ctx.newPage();
  p.on("pageerror", (e) => errors.push(`${name}: ${e}`));
  await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await p.goto(`${B}/api/auth/dev?name=${encodeURIComponent(name)}&next=/me`, { waitUntil: "networkidle0" });
  await p.evaluate(() => {
    const d = new Date();
    localStorage.setItem("chamjal.intro", "1");
    localStorage.setItem("chamjal.coverDay", `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  });
  return p;
}
const clickText = (p, text) =>
  p.evaluate((t) => {
    const el = [...document.querySelectorAll("button, a")].find((x) => x.textContent?.trim() === t);
    el?.click();
    return !!el;
  }, text);

// 1) 하늘: 사진 + 한 줄 + 보여 주기
const a = await user(NAME_A);
await a.goto(`${B}/`, { waitUntil: "networkidle0" });
await a.waitForSelector(".topic-banner .tb-btn", { timeout: 20000 });
await sleep(800);
await a.screenshot({ path: `${OUT}/1-banner.png`, clip: { x: 0, y: 0, width: 390, height: 330 } });
// 상황별 배경 칩: '학교 추억' 고르면 그 배경만
await a.evaluate(() => document.querySelector(".bg-packs")?.scrollIntoView({ block: "center" }));
await a.evaluate(() => [...document.querySelectorAll(".bg-packs button")].find((x) => x.textContent?.trim() === "학교 추억")?.click());
await sleep(500);
const packTiles = await a.$eval(".bg-tray .bg-tile", (els) => Array.from(els, (e) => e.textContent?.trim()).join(", "));
const box = await a.$eval(".bg-packs", (e) => { const r = e.getBoundingClientRect(); return { y: r.top + window.scrollY }; });
await a.screenshot({ path: `${OUT}/0-bg-packs.png`, clip: { x: 0, y: Math.max(0, box.y - 20), width: 390, height: 190 }, captureBeyondViewport: true });
await a.evaluate(() => window.scrollTo(0, 0));
const mission = await a.$eval(".topic-banner .tb-topic", (e) => e.textContent);
await clickText(a, "숙제 하기");
await a.waitForSelector(".hw-form", { timeout: 10000 });
await sleep(500);
await a.screenshot({ path: `${OUT}/2-sheet.png` });
const input = await a.$('.hw-form input[type="file"]');
await input.uploadFile(PHOTO);
await sleep(800);
await a.type(".hw-text", "점심 먹고 공원 한 바퀴, 하늘이 파랬다");
await a.click(".hw-share input");
await sleep(300);
await a.screenshot({ path: `${OUT}/3-filled.png` });
await a.click(".hw-form button[type=submit]");
await a.waitForSelector(".hw-done", { timeout: 30000 });
await sleep(1200);
await a.screenshot({ path: `${OUT}/4-done.png` });
const doneText = await a.$eval(".hw-done", (e) => e.innerText.replace(/\s+/g, " "));
await clickText(a, "닫기");
await sleep(1200);
const bannerDone = await a.$eval(".topic-banner .tb-btn", (e) => e.innerText.replace(/\s+/g, " "));
await a.goto(`${B}/me`, { waitUntil: "networkidle0" });
await a.waitForSelector(".sb-card", { timeout: 20000 });
await sleep(800);
await a.evaluate(() => document.querySelector("#stickers")?.scrollIntoView({ block: "start" }));
await sleep(400);
await a.screenshot({ path: `${OUT}/5-stickerboard.png` });
const board = await a.$eval(".sb-title", (e) => e.innerText.replace(/\s+/g, " "));

// 2) 바다: 한 줄만 + 보여 주기
const b = await user(NAME_B);
await b.goto(`${B}/`, { waitUntil: "networkidle0" });
await b.waitForSelector(".topic-banner .tb-btn", { timeout: 20000 });
await clickText(b, "숙제 하기");
await b.waitForSelector(".hw-form", { timeout: 10000 });
await b.type(".hw-text", "오늘은 사진 대신 한 줄로! 숙제 완료");
await b.click(".hw-share input");
await b.click(".hw-form button[type=submit]");
await b.waitForSelector(".hw-done", { timeout: 30000 });

// 3) 게시판 '오늘의 숙제' 벽
await b.goto(`${B}/board`, { waitUntil: "networkidle0" });
await b.evaluate(() => [...document.querySelectorAll(".tab-btn")].find((x) => x.textContent?.includes("오늘의 숙제"))?.click());
await b.waitForSelector(".hw-wall", { timeout: 20000 });
await sleep(1500);
await b.screenshot({ path: `${OUT}/6-wall.png`, fullPage: true });
const cards = await b.$$eval(".hw-card", (els) => els.length);

console.log(`오늘 숙제: ${mission}`);
console.log(`'학교 추억' 고르면 보이는 배경: ${packTiles}`);
console.log(`검사 끝 화면: ${doneText}`);
console.log(`숙제 칸 단추: ${bannerDone} / 스티커판: ${board} / 숙제 벽 카드: ${cards}장`);
console.log(errors.length ? "브라우저 오류:\n" + errors.join("\n") : "브라우저 오류 없음");
await browser.close();
