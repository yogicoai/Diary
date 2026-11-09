// 아이디로 들어오는 계정 만들기 (운영자 fe·yogico 등). 화면에서 가입하는 길은 없고 여기서만 만든다.
//
//   node --env-file=.env.local scripts/account.mjs add fe --staff developer --name 개발자
//   node --env-file=.env.local scripts/account.mjs add yogico --staff company --name 요기코
//   node --env-file=.env.local scripts/account.mjs reset fe        새 비밀번호를 만들어 한 번만 보여 준다
//   node --env-file=.env.local scripts/account.mjs list
//   임시 DB(dev:mem)에 만들 때는 맨 뒤에 --uri <임시 Mongo 주소>
//
// 비밀번호는 --password 로 줄 수도 있지만, 안 주면 읽기 쉬운 12자를 만들어 준다.
// 저장 모양은 src/lib/server/password.ts 와 같다 ("s1$N$r$p$소금$해시").

import { randomBytes, randomInt, scrypt } from "node:crypto";
import { MongoClient } from "mongodb";

const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const [cmd, rawId] = args;

const uri = opt("uri") || process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI 가 없어요 (--env-file=.env.local 또는 --uri)");
  process.exit(1);
}

function newPassword() {
  const abc = "abcdefghjkmnpqrstuvwxyz23456789"; // 헷갈리는 i l o 0 1 뺌
  const pick = () => Array.from({ length: 4 }, () => abc[randomInt(abc.length)]).join("");
  return `${pick()}-${pick()}-${pick()}`;
}

function hash(pw) {
  const N = 16384, r = 8, p = 1, salt = randomBytes(16);
  return new Promise((resolve, reject) =>
    scrypt(pw.normalize("NFC"), salt, 32, { N, r, p, maxmem: 64 * 1024 * 1024 }, (err, key) =>
      err ? reject(err) : resolve(`s1$${N}$${r}$${p}$${salt.toString("base64url")}$${key.toString("base64url")}`),
    ),
  );
}

const client = await MongoClient.connect(uri);
const users = client.db(process.env.MONGODB_DB || "chamjal").collection("users");

try {
  if (cmd === "list") {
    const list = await users.find({ loginId: { $exists: true } }, { projection: { loginId: 1, staff: 1, nickname: 1, createdAt: 1, banned: 1 } }).toArray();
    if (!list.length) console.log("아이디 계정이 없어요");
    for (const u of list) console.log(`${u.loginId}\t${u.staff ?? "회원"}\t${u.nickname}\t${u.createdAt.toISOString().slice(0, 10)}${u.banned ? "\t정지" : ""}`);
  } else if (cmd === "add" || cmd === "reset") {
    const loginId = String(rawId ?? "").trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9_.-]{1,19}$/.test(loginId)) throw new Error("아이디는 영문 소문자·숫자 2~20자로 (예: fe, yogico)");
    const pw = opt("password") || newPassword();
    if (pw.length < 8) throw new Error("비밀번호는 8자 이상");
    const passHash = await hash(pw);

    if (cmd === "add") {
      const staff = opt("staff");
      if (staff && staff !== "developer" && staff !== "company") throw new Error("--staff 는 developer 또는 company");
      const name = (opt("name") || loginId).trim();
      if (!/^[\p{L}\p{N}]{2,8}$/u.test(name)) throw new Error("--name(별명)은 띄어쓰기 없이 2~8자");
      const now = new Date();
      const doc = { googleSub: `id:${loginId}`, loginId, email: "", nickname: name, entryYear: null, classNo: 1, createdAt: now, lastSeenAt: now, passHash, loginFails: 0 };
      if (staff) doc.staff = staff;
      try {
        await users.insertOne(doc);
      } catch (e) {
        if (e?.code === 11000) throw new Error(`${loginId} 는 이미 있어요. 비밀번호만 새로 하려면 reset`);
        throw e;
      }
      console.log(`만들었어요  아이디 ${loginId}  ${staff ? `(운영자: ${staff === "developer" ? "개발자" : "회사"})` : "(회원)"}`);
    } else {
      const r = await users.updateOne({ googleSub: `id:${loginId}` }, { $set: { passHash, loginFails: 0 }, $unset: { lockedUntil: "" } });
      if (!r.matchedCount) throw new Error(`${loginId} 계정이 없어요`);
      console.log(`비밀번호를 새로 했어요  아이디 ${loginId}`);
    }
    console.log(`비밀번호  ${pw}   (여기서 한 번만 보여요. 들어가서 '비밀번호 바꾸기'로 바꿀 수 있어요)`);
  } else {
    console.log("쓰는 법: add <아이디> [--staff developer|company] [--name 별명] [--password 비번] | reset <아이디> | list  [--uri 주소]");
  }
} catch (e) {
  console.error("안 됐어요:", e.message);
  process.exitCode = 1;
} finally {
  await client.close();
}
