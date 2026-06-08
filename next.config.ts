import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 이미지 base64 / 큰 대본 페이로드를 다루므로 서버 액션·라우트 바디 한도 상향
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
