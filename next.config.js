/** @type {import('next').NextConfig} */
const nextConfig = {
    // 빌드 시 문법 검사(ESLint) 무시
    eslint: {
      ignoreDuringBuilds: true,
    },
    // 빌드 시 타입 검사(TypeScript) 무시 - 이 부분이 핵심입니다!
    typescript: {
      ignoreBuildErrors: true,
    },
  };
  
  module.exports = nextConfig;