// 임시 Mongo(이 PC 메모리)를 띄우고 그 주소로 next dev 를 켠다. 끄면 데이터도 사라진다.
//   npm run dev:mem   (포트 6900, 개발용 로그인 켜짐)
// 실제 Mongo 로 시험하려면 .env.local 에 MONGODB_URI 를 넣고 npm run dev.
import { spawn } from "node:child_process";
import { MongoMemoryServer } from "mongodb-memory-server";

const mongod = await MongoMemoryServer.create({ instance: { dbName: "chamjal" } });
const uri = mongod.getUri();
console.log(`임시 Mongo 켜짐: ${uri}`);

const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "-p", process.env.PORT || "6900"], {
  stdio: "inherit",
  env: { ...process.env, MONGODB_URI: uri, DEV_LOGIN: "1" },
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
