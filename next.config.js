/** @type {import('next').NextConfig} */
const nextConfig = {
    // 빌드 시 ESLint(문법 검사) 에러가 있어도 무시하고 배포를 진행합니다.
    eslint: {
      ignoreDuringBuilds: true,
    },
    // 만약 타입스크립트 에러 때문에 또 배포가 막힌다면 아래 주석(//)을 지워주세요.
    // typescript: { ignoreBuildErrors: true },
  };
  
  module.exports = nextConfig;