// GPT로 그림칸 배경 만들기 (2026-11-06 사용자: "GPT로 만들어줄수 있니")
//
//   node --env-file=../jp/.env scripts/gpt-bg.mjs <프롬프트 파일.json> [이름 ...]
//
// 프롬프트 파일: { "style": { "<스타일id>": "…" }, "common": "…", "items": [{ "name", "style", "scene", "ref"? }] }
// - 원본 PNG(1536×1024)는 drafts/bg/<name>.png (git 제외)
// - 앱용은 가운데 4:3 으로 잘라 public/bg/<name>.webp (1200×900)
// - 키는 복사하지 않고 --env-file 로 다른 폴더(.env)에서 읽는다
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const KEY = process.env.OPENAI_API_KEY;
if (!KEY) throw new Error("OPENAI_API_KEY 가 없어요 (--env-file 확인)");

const [file, ...only] = process.argv.slice(2);
if (!file) throw new Error("프롬프트 파일을 주세요");
const spec = JSON.parse(fs.readFileSync(file, "utf8"));
const items = spec.items.filter((it) => only.length === 0 || only.includes(it.name));
const QUALITY = spec.quality ?? "medium";
const MODELS = spec.models ?? ["gpt-image-2", "gpt-image-1.5"];

fs.mkdirSync("drafts/bg", { recursive: true });
fs.mkdirSync("public/bg", { recursive: true });

async function call(model, prompt, ref) {
  const common = { model, prompt, size: "1536x1024", quality: QUALITY, n: "1", output_format: "png" };
  if (!ref) {
    return fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ...common, n: 1 }),
    });
  }
  const form = new FormData();
  for (const [k, v] of Object.entries(common)) form.append(k, v);
  form.append("image[]", new Blob([fs.readFileSync(ref)], { type: "image/png" }), path.basename(ref));
  return fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}` },
    body: form,
  });
}

let totalOut = 0;
for (const it of items) {
  const prompt = [spec.common, spec.style[it.style], `Scene: ${it.scene}`].filter(Boolean).join("\n\n");
  let data = null;
  let used = "";
  for (const model of MODELS) {
    const res = await call(model, prompt, it.ref);
    if (res.ok) {
      data = await res.json();
      used = model;
      break;
    }
    console.log(`✖ ${it.name} ${model} ${res.status} ${(await res.text()).slice(0, 240)}`);
    if (res.status === 401) throw new Error("API 키가 맞지 않아요");
  }
  if (!data) {
    console.log(`✖ ${it.name} 못 만들었어요`);
    continue;
  }
  const png = Buffer.from(data.data[0].b64_json, "base64");
  fs.writeFileSync(`drafts/bg/${it.name}.png`, png);
  fs.writeFileSync(`drafts/bg/${it.name}.prompt.txt`, `${used} ${QUALITY}\n\n${prompt}\n`);
  // 1536×1024 → 가운데 1365×1024 (4:3) → 1000×750 (그림칸·카드용) + 160×120 (고르기 줄 미리보기)
  const crop = sharp(png).extract({ left: Math.round((1536 - 1365) / 2), top: 0, width: 1365, height: 1024 });
  await crop.clone().resize(1000, 750).webp({ quality: 78 }).toFile(`public/bg/${it.name}.webp`);
  fs.mkdirSync("public/bg/thumb", { recursive: true });
  await crop.clone().resize(160, 120).webp({ quality: 70 }).toFile(`public/bg/thumb/${it.name}.webp`);
  const u = data.usage;
  totalOut += u?.output_tokens ?? 0;
  console.log(`✓ ${it.name} (${used}, ${QUALITY}) 토큰 입력 ${u?.input_tokens ?? "?"} / 출력 ${u?.output_tokens ?? "?"}`);
}
// gpt-image-2 출력 $30/100만 토큰 (docs/revenue/research.md)
console.log(`출력 토큰 합계 ${totalOut} · 출력만 약 $${((totalOut * 30) / 1e6).toFixed(3)}`);
