// 배경 전체를 한 장에 모아 보기: node scripts/bg-sheet.mjs [출력.png]
// lib/backgrounds.ts 순서 그대로, 이름표를 붙여 4열로 놓는다.
import fs from "node:fs";
import sharp from "sharp";

const out = process.argv[2] || "shots/배경-전체.png";
const src = fs.readFileSync("src/lib/backgrounds.ts", "utf8");
const list = [...src.matchAll(/\{ id: "([^"]+)", name: "([^"]+)" \}/g)].map((m) => ({ id: m[1], name: m[2] }));

const W = 400,
  H = 300,
  LABEL = 44,
  G = 14,
  COLS = 4;
const rows = Math.ceil(list.length / COLS);
const tiles = [];
for (const [i, b] of list.entries()) {
  const file = `public/bg/${b.id}.webp`;
  const x = G + (i % COLS) * (W + G);
  const y = G + Math.floor(i / COLS) * (H + LABEL + G);
  if (fs.existsSync(file)) tiles.push({ input: await sharp(file).resize(W, H).toBuffer(), left: x, top: y });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${LABEL}"><text x="4" y="30" font-family="Malgun Gothic" font-size="24" fill="#2f2620">${i + 1}. ${b.name}${fs.existsSync(file) ? "" : " (없음)"}</text></svg>`;
  tiles.push({ input: Buffer.from(svg), left: x, top: y + H });
}
await sharp({
  create: { width: G + COLS * (W + G), height: G + rows * (H + LABEL + G), channels: 3, background: "#ffffff" },
})
  .composite(tiles)
  .png()
  .toFile(out);
console.log(`${list.length}장 → ${out}`);
