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
        // 청크 분리로 캐싱 최적화
        manualChunks: {
          vendor: ["vue", "vue-router", "pinia"],
          ui: ["radix-vue", "lucide-vue-next"],
        },
      },
    },
  },
});
