// 390px 휴대폰 화면 캡처 (설치된 Edge 사용). 화면 바꾸면 이걸로 확인한다.
// node scripts/shot.mjs [url] [출력폴더]
import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";

const base = process.argv[2] || "http://localhost:6900";
const out = process.argv[3] || "shots";
fs.mkdirSync(out, { recursive: true });

const edge = [
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
].find((p) => fs.existsSync(p));

const browser = await puppeteer.launch({ executablePath: edge, headless: true });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

  for (const theme of ["stationery", "drawing", "vacation"]) {
    await page.goto(base + "/", { waitUntil: "networkidle0" });
    await page.evaluate((t) => {
      localStorage.setItem("chamjal.theme", t);
    }, theme);
    await page.goto(base + "/", { waitUntil: "networkidle0" });
    await page.evaluate(() => document.fonts.ready);

    if (theme === "stationery") {
      // 빈 화면
      await page.screenshot({ path: path.join(out, "01-empty.png"), fullPage: true });
    }

    // 날씨, 그림, 제목, 글
    await page.click('.weather button[aria-label="좋았어"]');
    const box = await page.$eval(".draw-box", (el) => {
      const r = el.getBoundingClientRect();
      return { x: r.left, y: r.top + window.scrollY, w: r.width, h: r.height };
    });
    await page.evaluate(() => window.scrollTo(0, 0));
    const draw = async (pts, color) => {
      await page.click(`.crayon[aria-label="${color}"]`);
      const b = await page.$eval(".draw-box", (el) => el.getBoundingClientRect().toJSON());
      await page.mouse.move(b.x + pts[0][0] * b.width, b.y + pts[0][1] * b.height);
      await page.mouse.down();
      for (const [x, y] of pts.slice(1)) await page.mouse.move(b.x + x * b.width, b.y + y * b.height, { steps: 4 });
      await page.mouse.up();
    };
    // 해
    const sun = Array.from({ length: 26 }, (_, i) => [0.18 + 0.09 * Math.cos(i / 4), 0.22 + 0.12 * Math.sin(i / 4)]);
    await draw(sun, "주황");
    // 언덕
    await draw([[0.02, 0.85], [0.2, 0.7], [0.45, 0.78], [0.7, 0.66], [0.98, 0.8]], "초록");
    // 사람
    await draw([[0.6, 0.3], [0.6, 0.55], [0.55, 0.68], [0.6, 0.55], [0.66, 0.68]], "검정");
    await draw(Array.from({ length: 22 }, (_, i) => [0.6 + 0.04 * Math.cos(i / 3.4), 0.24 + 0.055 * Math.sin(i / 3.4)]), "검정");
    // 집
    await draw([[0.78, 0.6], [0.78, 0.42], [0.86, 0.32], [0.94, 0.42], [0.94, 0.6], [0.78, 0.6]], "빨강");
    void box;

    await page.type("#title", "드디어 금요일");
    await page.focus(".manuscript textarea");
    await page.keyboard.sendCharacter("퇴근하고 친구랑 떡볶이를 먹었다. 너무 맛있어서 웃음이 났다.");
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: path.join(out, `02-filled-${theme}.png`), fullPage: true });

    await page.evaluate(() => document.querySelector(".btn:not(:disabled)")?.click());
    await new Promise((r) => setTimeout(r, 2200));
    await page.screenshot({ path: path.join(out, `03-done-${theme}.png`), fullPage: true });

    if (theme === "stationery") {
      // 카드
      await page.evaluate(() => {
        const btn = [...document.querySelectorAll("button")].find((b) => b.textContent?.includes("카드로 만들어"));
        btn?.click();
      });
      await page.waitForSelector(".card-preview", { timeout: 15000 });
      await new Promise((r) => setTimeout(r, 400));
      await page.screenshot({ path: path.join(out, "04-card-sheet.png") });
      const dataUrl = await page.$eval(".card-preview", async (img) => {
        const res = await fetch(img.src);
        const b = await res.blob();
        return await new Promise((r) => {
          const fr = new FileReader();
          fr.onload = () => r(fr.result);
          fr.readAsDataURL(b);
        });
      });
      fs.writeFileSync(path.join(out, "05-card.png"), Buffer.from(String(dataUrl).split(",")[1], "base64"));

      // AI 시트
      await page.keyboard.press("Escape");
      await page.goto(base + "/", { waitUntil: "networkidle0" });
      await page.evaluate(() => document.querySelector(".tool.ai")?.click());
      await new Promise((r) => setTimeout(r, 400));
      await page.screenshot({ path: path.join(out, "06-ai-sheet.png") });

      // 내 일기장
      await page.goto(base + "/diary", { waitUntil: "networkidle0" });
      await new Promise((r) => setTimeout(r, 600));
      await page.screenshot({ path: path.join(out, "07-shelf.png"), fullPage: true });
    }
  }
  console.log(errors.length ? "브라우저 오류:\n" + errors.join("\n") : "브라우저 오류 없음");
} finally {
  await browser.close();
}
