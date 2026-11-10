// 그림 파일 올리기: Cafe24 FTP (QR 스튜디오 src/lib/ftp.js 와 같은 방식·같은 환경변수 이름)
//   FTP_HOST(기본 yogibo.ftp.cafe24.com) FTP_PORT FTP_USER FTP_PASS
//   FTP_REMOTE_DIR(기본 /web/chamjal) PUBLIC_ASSET_BASE(기본 https://yogibo.openhost.cafe24.com/web/chamjal)
// FTP 정보가 없는 개발 환경에서는 public/_dev-uploads 에 저장한다 (git 제외).
// 지우기(removeImages): 일기를 지우거나 게시판에서 떼면 그 카드 그림도 저장소에서 지운다.

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { Client as FtpClient } from "basic-ftp";
import { HttpError } from "./http";

const ROOT = process.env.FTP_REMOTE_DIR || "/web/chamjal";
const PUBLIC_BASE = process.env.PUBLIC_ASSET_BASE || "https://yogibo.openhost.cafe24.com/web/chamjal";

function hasFtp() {
  return !!(process.env.FTP_USER && process.env.FTP_PASS);
}

async function withFtp<T>(work: (client: FtpClient) => Promise<T>): Promise<T> {
  const client = new FtpClient(30_000);
  client.ftp.verbose = false;
  try {
    await client.access({
      host: process.env.FTP_HOST || "yogibo.ftp.cafe24.com",
      port: process.env.FTP_PORT ? Number(process.env.FTP_PORT) : 21,
      user: process.env.FTP_USER,
      password: process.env.FTP_PASS,
      secure: false,
    });
    return await work(client);
  } finally {
    client.close();
  }
}

/** 추측할 수 없는 ASCII 파일 이름 (Cafe24 는 한글 파일명을 못 읽는다) */
function fileName(ext: string) {
  return `${Date.now().toString(36)}-${crypto.randomBytes(9).toString("hex")}.${ext}`;
}

export async function putImage(buffer: Buffer, dir: string, ext = "webp"): Promise<string> {
  const safeDir = dir.replace(/[^a-zA-Z0-9/_-]/g, "").replace(/^\/+|\/+$/g, "");
  const name = fileName(ext);

  if (hasFtp()) {
    try {
      return await withFtp(async (client) => {
        await client.ensureDir(`${ROOT}/${safeDir}`);
        await client.uploadFrom(Readable.from(buffer), name);
        return `${PUBLIC_BASE}/${safeDir}/${name}`;
      });
    } catch (e) {
      // 왜 못 올렸는지 짧게만 돌려준다 (FTP 응답 번호 530 = 로그인 실패, ETIMEDOUT·ECONNREFUSED = 접속 막힘 등).
      // 주소·계정은 내보내지 않는다. 자세한 건 서버 로그 (11-10: 배포 서버에서 숙제 사진이 '잠시 문제'로만 실패해서)
      const err = e as { code?: unknown; message?: string };
      const why = err.code != null ? String(err.code) : /timeout/i.test(err.message ?? "") ? "timeout" : "ftp";
      console.error("그림 올리기 못 함:", why, (err.message ?? "").slice(0, 200));
      throw new HttpError(502, `storage_${why.replace(/[^A-Za-z0-9]/g, "").slice(0, 20)}`, "그림을 저장하지 못했어요. 잠시 뒤에 다시 해 주세요");
    }
  }

  if (process.env.NODE_ENV !== "production") {
    const dirPath = path.join(process.cwd(), "public", "_dev-uploads", safeDir);
    await fs.mkdir(dirPath, { recursive: true });
    await fs.writeFile(path.join(dirPath, name), buffer);
    return `/_dev-uploads/${safeDir}/${name}`;
  }

  throw new HttpError(503, "no_storage", "그림 저장소(Cafe24 FTP)가 아직 연결되지 않았어요");
}

/** 그림 주소 → 저장소 안 경로. 이 앱이 만든 이름 모양만 받는다 (../ 같은 건 거절) */
function storedPath(url: string | null | undefined): string | null {
  if (!url) return null;
  const rel = url.startsWith(`${PUBLIC_BASE}/`)
    ? url.slice(PUBLIC_BASE.length + 1)
    : url.startsWith("/_dev-uploads/")
      ? url.slice("/_dev-uploads/".length)
      : null;
  return rel && /^[a-zA-Z0-9_-]+(\/[a-zA-Z0-9_-]+)*\/[a-z0-9]+-[a-f0-9]+\.[a-z]+$/.test(rel) ? rel : null;
}

/** 이 앱이 올린 그림 지우기 (일기 지우기·게시판에서 떼기). 못 지워도 조용히 넘어간다 */
export async function removeImages(urls: (string | null | undefined)[]): Promise<void> {
  const rels = urls.map(storedPath).filter((r): r is string => !!r);
  if (!rels.length) return;
  try {
    if (hasFtp()) {
      await withFtp(async (client) => {
        for (const r of rels) await client.remove(`${ROOT}/${r}`).catch(() => {});
      });
    } else if (process.env.NODE_ENV !== "production") {
      await Promise.all(rels.map((r) => fs.unlink(path.join(process.cwd(), "public", "_dev-uploads", r)).catch(() => {})));
    }
  } catch (e) {
    console.error("그림 지우기 못 함:", e instanceof Error ? e.message : e);
  }
}
