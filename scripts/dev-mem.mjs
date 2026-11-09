// 임시 Mongo(이 PC 메모리)를 띄우고 그 주소로 next dev 를 켠다. 끄면 데이터도 사라진다.
//   npm run dev:mem   (포트 6900, 개발용 로그인 켜짐)
// 실제 Mongo 로 시험하려면 .env.local 에 MONGODB_URI 를 넣고 npm run dev.
// 아이 목소리까지 시험: npm run dev:mem -- --voice ../todo/.env.local
//   그 파일에서 TYPECAST_API_KEY 하나만 읽어 이 서버에 빌려준다 (복사하지 않음, 다른 값은 안 섞임)
import fs from "node:fs";
import { spawn } from "node:child_process";
import { MongoMemoryServer } from "mongodb-memory-server";

const extra = {};
const vi = process.argv.indexOf("--voice");
if (vi > 0) {
  const m = fs.readFileSync(process.argv[vi + 1], "utf8").match(/^TYPECAST_API_KEY=(.*)$/m);
  if (m?.[1].trim()) {
    extra.TYPECAST_API_KEY = m[1].trim();
    console.log("아이 목소리(Typecast) 켜짐");
  } else console.log("목소리 키를 못 찾았어요 — 읽어 주기는 꺼진 채로 켜요");
}

const mongod = await MongoMemoryServer.create({ instance: { dbName: "chamjal" } });
const uri = mongod.getUri();
console.log(`임시 Mongo 켜짐: ${uri}`);

const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "-p", process.env.PORT || "6900"], {
  stdio: "inherit",
  // 임시 DB 로 시험할 땐 그림도 임시로 (public/_dev-uploads). 빈 값을 주면 Next 가 .env.local 의 진짜 FTP 로 채우지 않는다
  env: { ...process.env, ...extra, MONGODB_URI: uri, DEV_LOGIN: "1", FTP_USER: "", FTP_PASS: "" },
});

let stopping = false;
async function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  child.kill();
  await mongod.stop();
  process.exit(code);
}
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
child.on("exit", (c) => stop(c ?? 0));
