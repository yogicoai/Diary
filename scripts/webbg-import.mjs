// 넓은 화면(PC) 일기장 뒤 배경 가져오기
//   node scripts/webbg-import.mjs [폴더] [--skip id,id]     (폴더 기본: drafts/web-bg/incoming)
//   pc-*.png 같은 그림 → 가운데 16:9 로 잘라 public/web-bg/<id>.webp(가로 최대 2400) + public/web-bg/thumb/<id>.webp(240×135)
//   이름·묶음은 docs/넓은화면-배경-프롬프트.md 의 "## 묶음" / "### n. 이름 — `id.png`" 에서 읽어
//   src/lib/webBackdrops.ts 목록 끝에 문서 순서대로 붙인다 (이미 있으면 그림만 바꿈).
//   원본은 drafts/web-bg/<id>.<ext> 로 복사해 둔다 (받은 폴더는 그대로 둔다).
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const args = process.argv.slice(2);
const skipAt = args.indexOf("--skip");
const skip = new Set(skipAt >= 0 ? (args[skipAt + 1] ?? "").split(",").filter(Boolean) : []);
const rest = args.filter((_, i) => !(skipAt >= 0 && (i === skipAt || i === skipAt + 1)));
const inDir = rest[0] ?? "drafts/web-bg/incoming";

// 프롬프트 문서 = 장면 목록
const catalog = [];
let group = null;
for (const line of fs.readFileSync("docs/넓은화면-배경-프롬프트.md", "utf8").split(/\r?\n/)) {
  const g = line.match(/^## (.+)$/);
  if (g) {
    group = g[1].trim();
    continue;
  }
  const it = line.match(/^### \d+\. (.+?) — `([a-z0-9-]+)\.png`/);
  if (it && group) catalog.push({ id: it[2], name: it[1].trim(), group });
}

const listFile = "src/lib/webBackdrops.ts";
let src = fs.readFileSync(listFile, "utf8");
const groups = JSON.parse(src.match(/WEB_BACKDROP_GROUPS = (\[[^\]]*\])/)[1]);

if (!fs.existsSync(inDir)) {
  console.log(`${inDir} 폴더가 없어요`);
  process.exit(0);
}
const order = (f) => {
  const i = catalog.findIndex((c) => c.id === path.parse(f).name.toLowerCase());
  return i < 0 ? Infinity : i;
};
const files = fs
  .readdirSync(inDir)
  .filter((f) => /\.(png|jpe?g|webp)$/i.test(f))
  .sort((a, b) => order(a) - order(b));
if (!files.length) {
  console.log(`${inDir} 에 그림이 없어요`);
  process.exit(0);
}

fs.mkdirSync("public/web-bg/thumb", { recursive: true });
fs.mkdirSync("drafts/web-bg", { recursive: true });
const added = [];
for (const f of files) {
  const id = path.parse(f).name.toLowerCase();
  if (skip.has(id)) {
    console.log(`– ${id}: 뺌 (--skip)`);
    continue;
  }
  const item = catalog.find((c) => c.id === id);
  if (!item) {
    console.log(`✖ ${f}: 프롬프트 문서에 없는 이름이에요 — 건너뜀`);
    continue;
  }
  if (!groups.includes(item.group)) console.log(`! ${id}: 묶음 '${item.group}' 이 WEB_BACKDROP_GROUPS 에 없어요`);
  const file = path.join(inDir, f);
  const { width: w, height: h } = await sharp(file).metadata();
  // 가운데 16:9
  let cw = w,
    ch = Math.round((w * 9) / 16);
  if (ch > h) {
    ch = h;
    cw = Math.round((h * 16) / 9);
  }
  const crop = sharp(file).extract({ left: Math.round((w - cw) / 2), top: Math.round((h - ch) / 2), width: cw, height: ch });
  const outW = Math.min(2400, cw);
  await crop.clone().resize(outW, Math.round((outW * 9) / 16)).webp({ quality: 80 }).toFile(`public/web-bg/${id}.webp`);
  await crop.clone().resize(240, 135).webp({ quality: 72 }).toFile(`public/web-bg/thumb/${id}.webp`);
  fs.copyFileSync(file, path.join("drafts/web-bg", `${id}${path.extname(f).toLowerCase()}`));
  if (!src.includes(`id: "${id}"`)) {
    src = src.replace(
      /(export const WEB_BACKDROPS: WebBackdrop\[\] = \[[\s\S]*?)(\n\];)/,
      `$1\n  { id: "${id}", name: "${item.name}", group: "${item.group}" },$2`,
    );
    added.push(item.name);
  }
  const kb = Math.round(fs.statSync(`public/web-bg/${id}.webp`).size / 1024);
  console.log(`✓ ${item.name} (${id}) ${w}×${h} → ${outW}×${Math.round((outW * 9) / 16)} ${kb}KB`);
}
fs.writeFileSync(listFile, src);
console.log(added.length ? `목록에 새로 넣음 ${added.length}개: ${added.join(", ")}` : "목록은 그대로 (그림만 바꿈)");
