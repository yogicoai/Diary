// 참여 기능 화면 시험 (두 사람): npm run dev:mem 을 켠 뒤
//   node scripts/e2e-social.mjs <dev:mem 이 찍은 임시 Mongo 주소>  → shots/social/*.png
import puppeteer from "puppeteer-core";
import { MongoClient } from "mongodb";
const B = "http://localhost:6900", OUT = "shots/social", MONGO = process.argv[2];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", headless: true });
const errors = [];
async function newUser(name) {
  const ctx = await browser.createBrowserContext();
  const p = await ctx.newPage();
  await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  p.on("pageerror", (e) => errors.push(`${name}: ${e}`));
  await p.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, "share", { value: undefined });
    Object.defineProperty(navigator, "clipboard", { value: { writeText: async (t) => { window.__copied = t; } } });
  });
  return p;
}
const click = (p, text, sel = "button, a") => p.evaluate((t, s) => { const el = [...document.querySelectorAll(s)].find((x) => x.textContent?.trim().includes(t)); el?.click(); return !!el; }, text, sel);
const shot = (p, n, full = false) => p.screenshot({ path: `${OUT}/${n}.png`, fullPage: full });

// ---- 하늘: 로그인 → 이름표 → 일기 → 게시판 → 반
const a = await newUser("하늘");
await a.goto(`${B}/login?next=/me`, { waitUntil: "networkidle0" });
await shot(a, "01-login");
await a.type(".dev-login input", "하늘");
await Promise.all([a.waitForNavigation({ waitUntil: "networkidle0" }), a.click(".dev-login button")]);
await sleep(600);
await click(a, "고치기");
await sleep(300);
await a.evaluate(() => { const i = document.querySelector(".nt-form input"); i.value = ""; });
await a.type(".nt-form input", "하늘이");
await a.select(".nt-form select", "1995");
await click(a, "저장", ".nt-form button");
await sleep(800);
await shot(a, "02-me");

await a.goto(`${B}/`, { waitUntil: "networkidle0" });
await click(a, "숙제로 쓰기");
await a.evaluate(() => [...document.querySelectorAll(".bg-tile")].find((x) => x.textContent?.includes("공원"))?.click());
await a.click('.weather button[aria-label="좋았어"]');
const draw = async (pts, color) => {
  await a.evaluate((c) => document.querySelector(`.crayon[aria-label="${c}"]`)?.click(), color);
  const r = await a.$eval(".draw-box", (el) => el.getBoundingClientRect().toJSON());
  await a.mouse.move(r.x + pts[0][0] * r.width, r.y + pts[0][1] * r.height); await a.mouse.down();
  for (const [x, y] of pts.slice(1)) await a.mouse.move(r.x + x * r.width, r.y + y * r.height, { steps: 4 });
  await a.mouse.up();
};
await draw(Array.from({ length: 22 }, (_, k) => [0.5 + 0.05 * Math.cos(k / 3.4), 0.5 + 0.065 * Math.sin(k / 3.4)]), "검정");
await draw([[0.5, 0.57], [0.5, 0.78]], "빨강");
await draw([[0.5, 0.62], [0.42, 0.7]], "검정");
await draw([[0.5, 0.62], [0.58, 0.7]], "검정");
await a.type("#title", "공원 산책");
await a.focus(".manuscript textarea");
await a.keyboard.sendCharacter("점심시간에 공원을 걸었다. 햇볕이 따뜻해서 기분이 좋아졌다.");
await a.evaluate(() => window.scrollTo(0, 0));
await shot(a, "03-write-topic");
await a.evaluate(() => document.querySelector(".btn:not(:disabled)")?.click());
await sleep(500);
await click(a, "기본 한 줄로");
await sleep(4200);
await click(a, "게시판에 붙이기");
await sleep(400);
await click(a, "글까지 붙이기");
await shot(a, "04-publish-sheet");
await a.evaluate(() => [...document.querySelectorAll(".sheet-panel .btn")].find((x) => x.textContent?.includes("게시판에 붙이기"))?.click());
await sleep(3500);
await shot(a, "05-after-publish", true);

await a.goto(`${B}/class`, { waitUntil: "networkidle0" });
await sleep(500);
await a.type(".inline-form input", "입사 동기");
await Promise.all([a.waitForNavigation({ waitUntil: "networkidle0" }).catch(() => {}), click(a, "만들기", ".inline-form button")]);
await sleep(1200);
const classUrl = a.url();
const code = await a.$eval(".brand-sub", (e) => e.textContent?.match(/[A-Z0-9]{6}/)?.[0]);
console.log("class", classUrl, code);

// 하늘: 내 일기장에서 반에 보내기
await a.goto(`${B}/diary`, { waitUntil: "networkidle0" });
await sleep(800);
await a.evaluate(() => document.querySelector(".mini")?.click());
await sleep(1500);
await click(a, "우리 반에 보내기");
await sleep(800);
await click(a, "입사 동기", ".sheet-panel .plan");
await a.evaluate(() => [...document.querySelectorAll(".sheet-panel .btn")].find((x) => x.textContent?.trim() === "보내기")?.click());
await sleep(1200);
await a.keyboard.press("Escape");
await sleep(300);
await shot(a, "06-shelf");

// ---- 바다: 게시판 → 도장 → 반 초대
const b = await newUser("바다");
await b.goto(`${B}/api/auth/dev?name=${encodeURIComponent("바다")}&next=/board`, { waitUntil: "networkidle0" });
await sleep(1200);
await shot(b, "07-board", true);
await b.evaluate(() => document.querySelector(".pinned")?.click());
await sleep(1500);
await b.evaluate(() => document.querySelector('.reaction[aria-label^="참 잘했어요"]')?.click());
await sleep(500);
await b.evaluate(() => document.querySelector('.reaction[aria-label^="하트"]')?.click());
await sleep(800);
await shot(b, "08-board-detail", true);
await b.goto(`${B}/join/${code}`, { waitUntil: "networkidle0" });
await sleep(2500);
await shot(b, "09-class-feed", true);

// ---- 상장 시험: 하늘에게 개근상 하나 넣고 상장함 열기
const mc = await MongoClient.connect(MONGO);
const db = mc.db("chamjal");
const u = await db.collection("users").findOne({ googleSub: "dev:하늘" });
await db.collection("awards").insertOne({ userId: u._id, kind: "streak7", key: "streak7:test", label: "일주일 개근상", detail: "7일 동안 하루도 빠짐없이 그림일기를 썼어요", at: new Date() });
await mc.close();
await a.goto(`${B}/me`, { waitUntil: "networkidle0" });
await sleep(1200);
await a.evaluate(() => document.querySelector(".award")?.click());
await sleep(1800);
await shot(a, "10-certificate");
await a.goto(`${B}/admin`, { waitUntil: "networkidle0" });
await sleep(1000);
console.log(errors.length ? "브라우저 오류:\n" + errors.join("\n") : "브라우저 오류 없음");
await browser.close();
