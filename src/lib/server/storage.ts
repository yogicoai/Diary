// 그림 파일 올리기: Cafe24 FTP (QR 스튜디오 src/lib/ftp.js 와 같은 방식·같은 환경변수 이름)
//   FTP_HOST(기본 yogibo.ftp.cafe24.com) FTP_PORT FTP_USER FTP_PASS
//   FTP_REMOTE_DIR(기본 /web/chamjal) PUBLIC_ASSET_BASE(기본 https://yogibo.openhost.cafe24.com/web/chamjal)
// FTP 정보가 없는 개발 환경에서는 public/_dev-uploads 에 저장한다 (git 제외).

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

/** 추측할 수 없는 ASCII 파일 이름 (Cafe24 는 한글 파일명을 못 읽는다) */
function fileName(ext: string) {
  return `${Date.now().toString(36)}-${crypto.randomBytes(9).toString("hex")}.${ext}`;
}

export async function putImage(buffer: Buffer, dir: string, ext = "webp"): Promise<string> {
  const safeDir = dir.replace(/[^a-zA-Z0-9/_-]/g, "").replace(/^\/+|\/+$/g, "");
  const name = fileName(ext);

  if (hasFtp()) {
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
      await client.ensureDir(`${ROOT}/${safeDir}`);
      await client.uploadFrom(Readable.from(buffer), name);
      return `${PUBLIC_BASE}/${safeDir}/${name}`;
    } finally {
      client.close();
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
