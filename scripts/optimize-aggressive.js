// scripts/optimize-aggressive.js
// Hero + Cursor 이미지 공격적 최적화

import sharp from "sharp";
import { stat, readdir } from "fs/promises";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ASSETS_DIR = join(__dirname, "../src/assets");
const OUTPUT_DIR = join(__dirname, "../src/assets/optimized");

function formatBytes(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

async function getFileSize(filePath) {
  const stats = await stat(filePath);
  return stats.size;
}

async function optimizeImage(inputPath, outputPath, options = {}) {
  const {
    maxWidth = null,
    quality = 70,
    resize = false,
  } = options;

  const originalSize = await getFileSize(inputPath);
  const image = sharp(inputPath);
  const metadata = await image.metadata();

  let pipeline = sharp(inputPath);

  // 리사이징이 필요한 경우
  if (resize && maxWidth && metadata.width > maxWidth) {
    pipeline = pipeline.resize(maxWidth, null, {
      withoutEnlargement: true,
      fit: "inside",
    });
  }

  // WebP 변환
  await pipeline
    .webp({
      quality,
      effort: 6,
    })
    .toFile(outputPath);

  const optimizedSize = await getFileSize(outputPath);
  const optimizedImage = sharp(outputPath);
  const optimizedMetadata = await optimizedImage.metadata();

  const savings = ((originalSize - optimizedSize) / originalSize * 100).toFixed(1);

  return {
    originalSize,
    optimizedSize,
    savings: parseFloat(savings),
    originalResolution: `${metadata.width}x${metadata.height}`,
    optimizedResolution: `${optimizedMetadata.width}x${optimizedMetadata.height}`,
  };
}

async function main() {
  console.log("🎨 Starting aggressive optimization...\n");

  let totalOriginalSize = 0;
  let totalOptimizedSize = 0;
  const results = [];

  // 1. Hero 이미지 최적화 (더 공격적)
  console.log("📸 Optimizing Hero Image...");
  console.log("   Strategy: Quality 65, Max Width 1920px\n");

  const heroInput = join(ASSETS_DIR, "hero.jpeg");
  const heroOutput = join(OUTPUT_DIR, "hero.webp");

  try {
    const heroResult = await optimizeImage(heroInput, heroOutput, {
      maxWidth: 1920,
      quality: 65,
      resize: true,
    });

    console.log(`✅ hero.jpeg → hero.webp`);
    console.log(`   ${heroResult.originalResolution} → ${heroResult.optimizedResolution}`);
    console.log(`   ${formatBytes(heroResult.originalSize)} → ${formatBytes(heroResult.optimizedSize)} (${heroResult.savings}% saved)\n`);

    results.push({ file: "hero.jpeg", ...heroResult });
    totalOriginalSize += heroResult.originalSize;
    totalOptimizedSize += heroResult.optimizedSize;
  } catch (error) {
    console.error(`❌ Failed to optimize hero.jpeg:`, error.message);
  }

  // 2. Cursor 이미지들 최적화
  console.log("🖱️  Optimizing Cursor Images...");
  console.log("   Strategy: Quality 70, Original Size\n");

  const cursorDir = join(ASSETS_DIR, "cursor");
  const cursorOutputDir = join(OUTPUT_DIR, "cursor");

  // cursor 출력 디렉토리 생성
  try {
    await stat(cursorOutputDir);
  } catch {
    const { mkdir } = await import("fs/promises");
    await mkdir(cursorOutputDir, { recursive: true });
  }

  const cursorFiles = await readdir(cursorDir);
  const pngFiles = cursorFiles.filter((f) => f.endsWith(".png"));

  for (const fileName of pngFiles) {
    const inputPath = join(cursorDir, fileName);
    const outputFileName = fileName.replace(".png", ".webp");
    const outputPath = join(cursorOutputDir, outputFileName);

    try {
      const result = await optimizeImage(inputPath, outputPath, {
        quality: 70,
        resize: false, // cursor는 작아서 리사이징 불필요
      });

      console.log(`✅ ${fileName} → ${outputFileName}`);
      console.log(`   ${formatBytes(result.originalSize)} → ${formatBytes(result.optimizedSize)} (${result.savings}% saved)`);

      results.push({ file: fileName, ...result });
      totalOriginalSize += result.originalSize;
      totalOptimizedSize += result.optimizedSize;
    } catch (error) {
      console.error(`❌ Failed to optimize ${fileName}:`, error.message);
    }
  }

  // 결과 요약
  console.log("\n" + "═".repeat(60));
  console.log("📊 Optimization Summary");
  console.log("═".repeat(60));
  console.log(`Total images optimized: ${results.length}`);
  console.log(`Original size:  ${formatBytes(totalOriginalSize)}`);
  console.log(`Optimized size: ${formatBytes(totalOptimizedSize)}`);
  console.log(`Total savings:  ${formatBytes(totalOriginalSize - totalOptimizedSize)} (${((totalOriginalSize - totalOptimizedSize) / totalOriginalSize * 100).toFixed(1)}%)`);
  console.log("═".repeat(60));

  // 카테고리별 요약
  const heroResults = results.filter((r) => r.file === "hero.jpeg");
  const cursorResults = results.filter((r) => r.file !== "hero.jpeg");

  console.log("\n📋 Category Breakdown:");

  if (heroResults.length > 0) {
    const heroTotal = heroResults.reduce((sum, r) => sum + r.originalSize, 0);
    const heroOptimized = heroResults.reduce((sum, r) => sum + r.optimizedSize, 0);
    console.log(`   Hero:   ${formatBytes(heroTotal)} → ${formatBytes(heroOptimized)} (${((heroTotal - heroOptimized) / heroTotal * 100).toFixed(1)}% saved)`);
  }

  if (cursorResults.length > 0) {
    const cursorTotal = cursorResults.reduce((sum, r) => sum + r.originalSize, 0);
    const cursorOptimized = cursorResults.reduce((sum, r) => sum + r.optimizedSize, 0);
    console.log(`   Cursor: ${formatBytes(cursorTotal)} → ${formatBytes(cursorOptimized)} (${((cursorTotal - cursorOptimized) / cursorTotal * 100).toFixed(1)}% saved)`);
  }

  // LCP 예상 개선
  if (heroResults.length > 0) {
    const heroOptimizedSize = heroResults[0].optimizedSize;
    const currentLCP = 11.8;
    const estimatedLCP = (currentLCP * (heroOptimizedSize / 376109)).toFixed(1);

    console.log("\n📈 Expected Performance Impact:");
    console.log(`   Current LCP: ${currentLCP}s`);
    console.log(`   Expected LCP: ~${estimatedLCP}s`);
    console.log(`   LCP Improvement: ${((currentLCP - estimatedLCP) / currentLCP * 100).toFixed(1)}%`);
  }

  console.log("\n✨ Done! Optimized images are in: src/assets/optimized/");
}

main().catch(console.error);
