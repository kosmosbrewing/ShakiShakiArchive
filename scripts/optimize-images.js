// scripts/optimize-images.js
// 이미지 WebP 변환 및 최적화 스크립트

import sharp from "sharp";
import { readdir, stat, mkdir } from "fs/promises";
import { join, extname, basename } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ASSETS_DIR = join(__dirname, "../src/assets");
const OUTPUT_DIR = join(__dirname, "../src/assets/optimized");

// 최적화 설정
const OPTIMIZATION_CONFIG = {
  webp: {
    quality: 80, // 80% 품질 (파일 크기 60-80% 감소)
    effort: 6, // 압축 노력 (0-6, 6이 가장 느리지만 압축률 좋음)
  },
  // 100KB 이상만 변환 (작은 파일은 변환 효과 적음)
  minFileSize: 100 * 1024,
  // 파일 크기와 무관하게 항상 변환할 파일 목록
  alwaysConvert: ["favicon.png"],
};

// 변환할 이미지 타겟
const TARGET_IMAGES = [
  "hero.jpeg",
  "tossSymbol.png",
  "marquee01.png",
  "logo01.png",
  "logo01-1.png",
  "logo02.png",
  "logo03.png",
  "logo01-2.png",
  "logo02-2.png",
  "logo03-2.png",
  "favicon.png",
];

async function ensureDir(dir) {
  try {
    await mkdir(dir, { recursive: true });
  } catch (err) {
    if (err.code !== "EEXIST") throw err;
  }
}

async function getFileSize(filePath) {
  const stats = await stat(filePath);
  return stats.size;
}

function formatBytes(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

async function optimizeImage(inputPath, outputPath) {
  const originalSize = await getFileSize(inputPath);
  const fileName = basename(inputPath);

  // alwaysConvert 목록에 없는 파일은 100KB 미만 스킵
  if (
    !OPTIMIZATION_CONFIG.alwaysConvert.includes(fileName) &&
    originalSize < OPTIMIZATION_CONFIG.minFileSize
  ) {
    console.log(`⏭️  Skipped (too small): ${fileName}`);
    return null;
  }

  try {
    // WebP로 변환
    await sharp(inputPath).webp(OPTIMIZATION_CONFIG.webp).toFile(outputPath);

    const optimizedSize = await getFileSize(outputPath);
    const savings = (
      ((originalSize - optimizedSize) / originalSize) *
      100
    ).toFixed(1);

    return {
      file: basename(inputPath),
      originalSize,
      optimizedSize,
      savings: parseFloat(savings),
    };
  } catch (error) {
    console.error(`❌ Error optimizing ${basename(inputPath)}:`, error.message);
    return null;
  }
}

async function main() {
  console.log("🎨 Starting image optimization...\n");

  // 출력 디렉토리 생성
  await ensureDir(OUTPUT_DIR);

  const results = [];
  let totalOriginalSize = 0;
  let totalOptimizedSize = 0;

  // 타겟 이미지들을 변환
  for (const fileName of TARGET_IMAGES) {
    const inputPath = join(ASSETS_DIR, fileName);
    const outputFileName = fileName.replace(/\.(jpg|jpeg|png)$/i, ".webp");
    const outputPath = join(OUTPUT_DIR, outputFileName);

    try {
      const result = await optimizeImage(inputPath, outputPath);

      if (result) {
        console.log(
          `✅ ${result.file} → ${outputFileName}\n` +
            `   ${formatBytes(result.originalSize)} → ${formatBytes(result.optimizedSize)} (${result.savings}% saved)`,
        );

        results.push(result);
        totalOriginalSize += result.originalSize;
        totalOptimizedSize += result.optimizedSize;
      }
    } catch (error) {
      console.error(`❌ Failed to process ${fileName}:`, error.message);
    }
  }

  // 결과 요약
  console.log("\n📊 Optimization Summary");
  console.log("═".repeat(50));
  console.log(`Total images optimized: ${results.length}`);
  console.log(`Original size:  ${formatBytes(totalOriginalSize)}`);
  console.log(`Optimized size: ${formatBytes(totalOptimizedSize)}`);
  console.log(
    `Total savings:  ${formatBytes(totalOriginalSize - totalOptimizedSize)} (${(((totalOriginalSize - totalOptimizedSize) / totalOriginalSize) * 100).toFixed(1)}%)`,
  );
  console.log("═".repeat(50));

  // 개별 결과
  console.log("\n📋 Individual Results:");
  results
    .sort((a, b) => b.savings - a.savings)
    .forEach((r, i) => {
      console.log(
        `${i + 1}. ${r.file.padEnd(20)} ${formatBytes(r.originalSize).padStart(10)} → ${formatBytes(r.optimizedSize).padStart(10)} (${r.savings}% saved)`,
      );
    });

  console.log("\n✨ Done! Optimized images are in: src/assets/optimized/");
  console.log("📝 Next steps:");
  console.log("   1. Review the optimized images");
  console.log("   2. Update image imports to use .webp files");
  console.log("   3. Add <picture> elements for fallback support");
}

main().catch(console.error);
