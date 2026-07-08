import path from "path";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

import tailwind from "tailwindcss";
import autoprefixer from "autoprefixer";

export default defineConfig({
  // S3 정적 호스팅용: 루트 경로 기준 (CloudFront 또는 커스텀 도메인 사용 시)
  base: "/",
  publicDir: "public", // public 폴더의 파일을 dist로 복사
  css: {
    postcss: {
      plugins: [tailwind(), autoprefixer()],
    },
  },
  plugins: [vue()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // 프로덕션 빌드에서 console, debugger 제거 (Best Practices 점수 향상)
  esbuild: {
    drop: ['console', 'debugger'],
  },
  build: {
    // 프로덕션 빌드 최적화
    outDir: "dist",
    sourcemap: false,
    minify: "esbuild", // esbuild 사용 (더 빠름)
    rollupOptions: {
      output: {
        // 파일명 해시 명시적 설정 (immutable Cache-Control 보장)
        assetFileNames: 'assets/[name].[hash][extname]',
        chunkFileNames: 'assets/[name].[hash].js',
        entryFileNames: 'assets/[name].[hash].js',

        // 청크 분리로 캐싱 최적화 (Performance 최적화)
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // 0. three.js 분리 — libs에 섞이면 639KB로 커져 홈 외 페이지도 로드하게 됨.
            //    Hero3DNotes(홈 전용)만 사용하므로 Home lazy 청크의 의존으로만 딸려가야 함.
            //    '/node_modules/three/' 경로 매칭이 three/examples/jsm/* 까지 커버.
            if (id.includes('/node_modules/three/')) {
              return 'three';
            }
            // 1. 핵심 프레임워크 (자주 변경 안됨)
            //    주의: 'vue' 부분문자열 매칭은 radix-vue/lucide-vue-next까지 삼켜
            //    아래 ui 분기가 죽는 버그가 있었음 — 반드시 경로 단위로 매칭할 것.
            if (
              id.includes('/node_modules/vue/') ||
              id.includes('/node_modules/@vue/') ||
              id.includes('/node_modules/pinia/') ||
              id.includes('/node_modules/vue-router/')
            ) {
              return 'vendor';
            }
            // 2. UI 라이브러리
            if (id.includes('radix-vue') || id.includes('lucide-vue-next')) {
              return 'ui';
            }
            // 3. 나머지 node_modules는 libs로
            return 'libs';
          }

          // 주의: admin/payment 페이지의 경로 기반 그룹핑은 하지 말 것.
          // 수동 청크가 스토어·messages·ui 등 공유 모듈 60여 개를 흡수해
          // index 엔트리가 해당 청크를 정적 import(→ 첫 로딩 preload)하게 되는
          // Rollup 동작이 확인됨. 라우트 lazy import 기반 자연 분할에 맡긴다.

          // 4. 이미지 최적화 (안정적)
          if (id.includes('/lib/imageOptimizer') || id.includes('/composables/useOptimizedImage')) {
            return 'image-optimizer';
          }

          // 5. API 레이어 (안정적)
          if (id.includes('/lib/api') || id.includes('/lib/apiCache')) {
            return 'api';
          }
        },
      },
    },
    // three.js 코어(약 557KB)는 더 쪼갤 수 없고 Home lazy 청크에만 딸려가므로
    // 첫 로딩과 무관 — 상시 경고 노이즈를 피하기 위해 한도를 그 위로 설정
    chunkSizeWarningLimit: 600,
  },
});
