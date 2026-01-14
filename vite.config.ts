import path from "path";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

import tailwind from "tailwindcss";
import autoprefixer from "autoprefixer";

export default defineConfig({
  // S3 정적 호스팅용: 루트 경로 기준 (CloudFront 또는 커스텀 도메인 사용 시)
  base: "/",
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

        // 청크 분리로 캐싱 최적화
        manualChunks: {
          // 핵심 프레임워크 (자주 변경 안됨)
          vendor: ["vue", "vue-router", "pinia"],

          // UI 컴포넌트 (큰 라이브러리)
          ui: ["radix-vue", "lucide-vue-next"],

          // 이미지 최적화 (거의 변경 안됨)
          'image-optimizer': [
            "./src/lib/imageOptimizer.ts",
            "./src/composables/useOptimizedImage.ts",
          ],

          // API 레이어 (비교적 안정적)
          api: [
            "./src/lib/api.ts",
            "./src/lib/apiCache.ts",
          ],
        },
      },
    },
    chunkSizeWarningLimit: 500,
  },
});
