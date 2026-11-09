// 아이디 계정 비밀번호: scrypt 로 감싸서 저장한다 (원래 비밀번호는 어디에도 남기지 않는다)
// 저장 모양 "s1$N$r$p$소금$해시" — scripts/account.mjs 도 똑같이 만든다. 값이 글 안에 들어 있어서 둘이 숫자만 맞으면 된다.

import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

const N = 16384;
const R = 8;
const P = 1;
const LEN = 32;

function derive(pw: string, salt: Buffer, len: number, opts: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(pw.normalize("NFC"), salt, len, { ...opts, maxmem: 64 * 1024 * 1024 }, (err, key) => (err ? reject(err) : resolve(key))),
  );
}

export async function hashPassword(pw: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await derive(pw, salt, LEN, { N, r: R, p: P });
  return `s1$${N}$${R}$${P}$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

/** 저장된 값이 없거나 모양이 틀려도 같은 시간만큼 계산한다 (아이디가 있는지 없는지 시간으로 새지 않게) */
export async function verifyPassword(pw: string, stored: string | undefined): Promise<boolean> {
  const parts = (stored ?? "").split("$");
  if (parts.length !== 6 || parts[0] !== "s1") {
    await derive(pw, randomBytes(16), LEN, { N, r: R, p: P });
    return false;
  }
  const [, n, r, p, saltB, hashB] = parts;
  const want = Buffer.from(hashB, "base64url");
  const got = await derive(pw, Buffer.from(saltB, "base64url"), want.length, { N: Number(n), r: Number(r), p: Number(p) });
  return got.length === want.length && timingSafeEqual(got, want);
}

/** 새 비밀번호 규칙: 8~72자, 아이디와 같으면 안 됨 */
export function passwordProblem(pw: string, loginId: string): string | null {
  if (pw.length < 8) return "비밀번호는 8자 이상으로 해 주세요";
  if (pw.length > 72) return "비밀번호가 너무 길어요";
  if (pw.toLowerCase() === loginId.toLowerCase()) return "아이디와 다른 비밀번호로 해 주세요";
  return null;
}
