// 관리자 페이지 캡처 (넓은 화면 1280 + 휴대폰 390). 돈 드는 호출 없음.
//   npm run dev:mem 켠 뒤 → node scripts/e2e-social.mjs <임시 Mongo 주소> (시험 데이터)
//   → node scripts/account.mjs add fe --staff developer --password <시험 비번> --uri <임시 Mongo 주소>
//   → node scripts/shot-admin.mjs <아이디> <시험 비번>  → shots/admin
import puppeteer from "puppeteer-core";
import fs from "node:fs";

const [ID = "fe", PW = ""] = process.argv.slice(2);
const B = "http://localhost:6900";
const OUT = "shots/admin";
fs.mkdirSync(OUT, { recursive: true });
const edge = ["C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Microsoft/Edge/Application/msedge.exe"].find((p) => fs.existsSync(p));
const browser = await puppeteer.launch({ executablePath: edge, headless: true });
const errors = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function open(width, height, mobile) {
  const ctx = await browser.createBrowserContext();
  const p = await ctx.newPage();
  await p.setViewport({ width, height, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile });
  p.on("pageerror", (e) => errors.push(`${width}: ${e}`));
  p.on("console", (m) => m.type() === "error" && errors.push(`${width}: ${m.text()}`));
  return p;
}
const shot = async (p, name, full = true) => {
  await sleep(900);
  await p.screenshot({ path: `${OUT}/${name}.png`, fullPage: full });
};
const clickText = (p, text, sel = "button, a") =>
  p.evaluate(
    (t, s) => {
      const el = [...document.querySelectorAll(s)].find((x) => x.textContent?.trim().includes(t));
      el?.click();
      return !!el;
    },
    text,
    sel,
  );
async function login(p, id, pw) {
  await p.goto(`${B}/admin`, { waitUntil: "networkidle0" });
  await p.waitForSelector(".adm-login input", { timeout: 20000 });
  await p.type(".adm-login input[autocomplete=username]", id);
  await p.type(".adm-login input[type=password]", pw);
  await p.click(".adm-login button[type=submit]");
}

// ── 넓은 화면
const d = await open(1280, 860, false);
await d.goto(`${B}/admin`, { waitUntil: "networkidle0" });
await d.waitForSelector(".adm-login", { timeout: 20000 });
await shot(d, "01-login", false);
await login(d, ID, "틀린비밀번호");
await d.waitForSelector(".adm-form-error", { timeout: 10000 });
const wrongMsg = await d.$eval(".adm-form-error", (e) => e.textContent);
await d.$eval(".adm-login input[type=password]", (e) => (e.value = ""));
await d.type(".adm-login input[type=password]", PW);
await d.click(".adm-login button[type=submit]");
await d.waitForSelector(".adm-stats", { timeout: 20000 });
await shot(d, "02-dashboard");
await d.goto(`${B}/admin/members`, { waitUntil: "networkidle0" });
await d.waitForSelector(".adm-table tbody tr", { timeout: 20000 });
await shot(d, "03-members");
await clickText(d, "하늘", "a.adm-name");
await d.waitForSelector(".adm-profile", { timeout: 20000 });
await shot(d, "04-member");
const opened = await clickText(d, "공원 산책", "button.adm-name");
await d.waitForSelector(".adm-drawer .adm-drawing", { timeout: 20000 });
await sleep(1200);
await shot(d, "05-drawer", false);
await d.keyboard.press("Escape");
await d.goto(`${B}/admin/classes`, { waitUntil: "networkidle0" });
await d.waitForSelector(".adm-table tbody tr", { timeout: 20000 });
await shot(d, "06-classes");
await clickText(d, "입사 동기", "a.adm-name");
await d.waitForSelector(".adm-stats", { timeout: 20000 });
await shot(d, "07-class");
await d.goto(`${B}/admin/board?tab=visible`, { waitUntil: "networkidle0" });
await d.waitForSelector(".adm-post, .adm-empty", { timeout: 20000 });
await shot(d, "08-board");
// 계정 메뉴
await d.click(".adm-account-btn");
await shot(d, "09-account-menu", false);

// ── 휴대폰
const m = await open(390, 844, true);
await login(m, ID, PW);
await m.waitForSelector(".adm-stats", { timeout: 20000 });
await shot(m, "m1-dashboard");
await m.goto(`${B}/admin/members`, { waitUntil: "networkidle0" });
await m.waitForSelector(".adm-table tbody tr", { timeout: 20000 });
await shot(m, "m2-members");
const mOverflow = await m.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);

// ── 일기장 쪽: 받은 아이디로 들어가기 (yogico) → 나 화면에 관리자 페이지 링크
const y = await open(390, 844, true);
await login(y, "yogico", process.argv[4] || "test-yogico-1234");
await y.waitForSelector(".adm-stats", { timeout: 20000 });
await y.goto(`${B}/me`, { waitUntil: "networkidle0" });
await sleep(1500);
const adminLink = await y.evaluate(() => !![...document.querySelectorAll("a")].find((a) => a.getAttribute("href") === "/admin"));
await shot(y, "y1-me-yogico");

console.log(`틀린 비밀번호 안내: ${wrongMsg} / 일기 펼침: ${opened} / 휴대폰 가로 넘침: ${mOverflow} / yogico 나 화면 관리자 링크: ${adminLink}`);
console.log(errors.length ? "브라우저 오류:\n" + errors.join("\n") : "브라우저 오류 없음");
await browser.close();
