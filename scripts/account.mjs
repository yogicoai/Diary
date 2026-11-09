// 아이디 계정 도우미. 가입은 이제 화면의 기본 로그인(구글 아래 "가입하기")에서 한다.
// 이 스크립트는 비밀번호를 잊은 사람 비밀번호 다시 만들기(reset)·목록(list)·시험용 계정(add)에 쓴다.
// 교무실 권한은 아이디 이름으로 정한다 (fe = 전산 선생님, yogico = 교장 선생님 — src/lib/staff.ts).
//
//   node --env-file=.env.local scripts/account.mjs reset fe        새 비밀번호를 만들어 한 번만 보여 준다
//   node --env-file=.env.local scripts/account.mjs list
//   node --env-file=.env.local scripts/account.mjs add test1 --name 시험
//   임시 DB(dev:mem)에 할 때는 맨 뒤에 --uri <임시 Mongo 주소>
//
// 비밀번호는 --password 로 줄 수도 있지만, 안 주면 읽기 쉬운 12자를 만들어 준다.
// 저장 모양은 src/lib/server/password.ts 와 같다 ("s1$N$r$p$소금$해시").

import { randomBytes, randomInt, scrypt } from "node:crypto";
import { MongoClient } from "mongodb";

const STAFF = { fe: "전산 선생님", yogico: "교장 선생님" };

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
  const N = 16384,
    r = 8,
    p = 1,
    salt = randomBytes(16);
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
    const list = await users.find({ loginId: { $exists: true } }, { projection: { loginId: 1, nickname: 1, createdAt: 1, banned: 1 } }).toArray();
    if (!list.length) console.log("아이디 계정이 없어요");
    for (const u of list) {
      const who = STAFF[u.loginId] ?? "학생";
      console.log(`${u.loginId}  ${who}  ${u.nickname}  ${u.createdAt.toISOString().slice(0, 10)}${u.banned ? "  정지" : ""}`);
    }
  } else if (cmd === "add" || cmd === "reset") {
    const loginId = String(rawId ?? "").trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9_.-]{1,19}$/.test(loginId)) throw new Error("아이디는 영문 소문자·숫자 2~20자로 (예: fe, yogico)");
    const pw = opt("password") || newPassword();
    if (pw.length < 8) throw new Error("비밀번호는 8자 이상");
    const passHash = await hash(pw);

    if (cmd === "add") {
      const name = (opt("name") || loginId).trim();
      if (!/^[\p{L}\p{N}]{2,8}$/u.test(name)) throw new Error("--name(별명)은 띄어쓰기 없이 2~8자");
      const now = new Date();
      const doc = { googleSub: `id:${loginId}`, loginId, email: "", nickname: name, entryYear: null, classNo: 1, createdAt: now, lastSeenAt: now, passHash, loginFails: 0 };
      try {
        await users.insertOne(doc);
      } catch (e) {
        if (e?.code === 11000) throw new Error(`${loginId} 는 이미 있어요. 비밀번호만 새로 하려면 reset`);
        throw e;
      }
      console.log(`만들었어요  아이디 ${loginId}${STAFF[loginId] ? ` (${STAFF[loginId]})` : ""}`);
    } else {
      const r = await users.updateOne({ googleSub: `id:${loginId}` }, { $set: { passHash, loginFails: 0 }, $unset: { lockedUntil: "" } });
      if (!r.matchedCount) throw new Error(`${loginId} 계정이 없어요`);
      console.log(`비밀번호를 새로 했어요  아이디 ${loginId}`);
    }
    console.log(`비밀번호  ${pw}   (여기서 한 번만 보여요. 들어가서 '비밀번호 바꾸기'로 바꿀 수 있어요)`);
  } else {
    console.log("쓰는 법: reset <아이디> | list | add <아이디> [--name 별명] [--password 비번]  [--uri 주소]");
  }
} catch (e) {
  console.error("안 됐어요:", e.message);
  process.exitCode = 1;
} finally {
  await client.close();
}
