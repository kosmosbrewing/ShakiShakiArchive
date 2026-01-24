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
          // 1. 핵심 프레임워크 (자주 변경 안됨)
          if (id.includes('node_modules')) {
            if (id.includes('vue') || id.includes('pinia') || id.includes('vue-router')) {
              return 'vendor';
            }
            // 2. UI 라이브러리
            if (id.includes('radix-vue') || id.includes('lucide-vue-next')) {
              return 'ui';
            }
            // 3. 나머지 node_modules는 libs로
            return 'libs';
          }

          // 4. 관리자 페이지 분리 (일반 사용자는 로드 안함)
          if (id.includes('/pages/admin/')) {
            return 'admin';
          }

          // 5. 결제 페이지 분리 (결제 시에만 로드)
          if (id.includes('/pages/order/')) {
            return 'payment';
          }

          // 6. 이미지 최적화 (안정적)
          if (id.includes('/lib/imageOptimizer') || id.includes('/composables/useOptimizedImage')) {
            return 'image-optimizer';
          }

          // 7. API 레이어 (안정적)
          if (id.includes('/lib/api') || id.includes('/lib/apiCache')) {
            return 'api';
          }
        },
      },
    },
    chunkSizeWarningLimit: 500,
  },
});
