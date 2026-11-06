import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // basic-ftp 는 CommonJS 라 번들에서 빼야 named import 가 살아 있다 (QR 스튜디오와 같은 설정)
  serverExternalPackages: ["basic-ftp", "mongodb"],
};

export default nextConfig;
