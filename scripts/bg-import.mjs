// 그림칸 배경: 프롬프트 문서 만들기 / 받은 그림 가져오기
//   node scripts/bg-import.mjs doc       → docs/배경-프롬프트.md (사용자가 힉스필드 등에서 뽑을 때 쓰는 프롬프트)
//   node scripts/bg-import.mjs           → drafts/bg/incoming/<id>.(png|jpg|jpeg|webp) 를 가져온다
//       가운데 4:3 으로 잘라 public/bg/<id>.webp(1000×750) + public/bg/thumb/<id>.webp(160×120),
//       src/lib/backgrounds.ts 목록 끝에 추가(이미 있으면 그림만 바꿈), 원본은 drafts/bg/<id>.<ext> 로 옮긴다
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const catalog = JSON.parse(fs.readFileSync("scripts/bg-catalog.json", "utf8"));
const cmd = process.argv[2] ?? "import";

if (cmd === "doc") {
  const packs = [...new Set(catalog.items.map((i) => i.pack))];
  const lines = [
    "# 그림칸 배경 프롬프트",
    "",
    "그림일기 그림칸(4:3)에 까는 크레파스 배경입니다. 뽑은 그림은 `Desktop/book/drafts/bg/incoming/` 에 **장면 제목 옆의 파일 이름**으로 넣어 주세요. 그다음 `node scripts/bg-import.mjs` 한 번이면 앱에 들어갑니다.",
    "",
    "## 뽑는 설정",
    "",
    "- 힉스필드: Nano Banana Pro, 비율 **4:3**, 2K",
    "- 참고 그림: `Desktop/book/drafts/bg/_ref-original.png` 를 꼭 같이 넣기 (원본 사이트 크레파스 화풍. 힉스필드 미디어에도 `chamjal-crayon-ref.png` 로 올라가 있음)",
    "- 장면마다 공통 문장까지 다 들어 있어서, 그 칸을 통째로 복사해 붙여 넣으면 됩니다.",
    "- 한 장면에 2~3장 뽑아서 제일 나은 것 하나만 주세요. 사람·동물·글씨가 들어간 그림은 빼 주세요.",
    "",
    "## 공통 문장 (장면 칸마다 이미 들어 있음)",
    "",
    "```",
    catalog.style,
    "",
    catalog.rules,
    "```",
    "",
  ];
  for (const p of packs) {
    lines.push(`## ${p} 팩`, "");
    for (const it of catalog.items.filter((i) => i.pack === p)) {
      lines.push(`### ${it.name} — 파일 이름 \`${it.id}.png\``, "", "```", `${catalog.style}\n\n그릴 장면: ${it.scene}\n\n${catalog.rules}`, "```", "");
    }
  }
  fs.writeFileSync("docs/배경-프롬프트.md", lines.join("\n"));
  console.log(`docs/배경-프롬프트.md 만듦 (${catalog.items.length}장면)`);
  process.exit(0);
}

const inDir = "drafts/bg/incoming";
fs.mkdirSync(inDir, { recursive: true });
fs.mkdirSync("public/bg/thumb", { recursive: true });
const files = fs.readdirSync(inDir).filter((f) => /\.(png|jpe?g|webp)$/i.test(f));
if (!files.length) {
  console.log(`${inDir} 에 그림이 없어요`);
  process.exit(0);
}

const listFile = "src/lib/backgrounds.ts";
let src = fs.readFileSync(listFile, "utf8");
const added = [];
for (const f of files) {
  const id = path.parse(f).name.toLowerCase();
  const item = catalog.items.find((i) => i.id === id);
  if (!item) {
    console.log(`✖ ${f}: 목록(scripts/bg-catalog.json)에 없는 이름이에요 — 건너뜀`);
    continue;
  }
  const file = path.join(inDir, f);
  const { width: w, height: h } = await sharp(file).metadata();
  // 가운데 4:3
  let cw = w,
    ch = Math.round((w * 3) / 4);
  if (ch > h) {
    ch = h;
    cw = Math.round((h * 4) / 3);
  }
  const crop = sharp(file).extract({ left: Math.round((w - cw) / 2), top: Math.round((h - ch) / 2), width: cw, height: ch });
  await crop.clone().resize(1000, 750).webp({ quality: 78 }).toFile(`public/bg/${id}.webp`);
  await crop.clone().resize(160, 120).webp({ quality: 70 }).toFile(`public/bg/thumb/${id}.webp`);
  fs.renameSync(file, path.join("drafts/bg", `${id}${path.extname(f).toLowerCase()}`));
  if (!src.includes(`id: "${id}"`)) {
    src = src.replace(/(export const BACKGROUNDS: Background\[\] = \[[\s\S]*?)(\n\];)/, `$1\n  { id: "${id}", name: "${item.name}", pack: "${item.pack}" },$2`);
    added.push(item.name);
  }
  console.log(`✓ ${item.name} (${id}) ${w}×${h} → 1000×750`);
}
fs.writeFileSync(listFile, src);
console.log(added.length ? `목록에 새로 넣음: ${added.join(", ")}` : "목록은 그대로 (그림만 바꿈)");
