// scripts/optimize-hero-extreme.js
// Hero 이미지 극한 최적화 - 30KB 목표

import sharp from "sharp";
import { stat } from "fs/promises";
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

async function optimizeHero() {
  console.log("🔥 Hero 이미지 극한 최적화 (목표: 30KB)\n");

  const inputPath = join(ASSETS_DIR, "hero.jpeg");
  const outputPath = join(OUTPUT_DIR, "hero.webp");

  // 현재 파일 크기 확인
  const currentSize = await getFileSize(outputPath);
  console.log("현재 크기:", formatBytes(currentSize));
  console.log("목표 크기: 30 KB 이하\n");

  // 최적화 옵션들 시도
  const options = [
    { width: 600, quality: 25, name: "600px Q25" },
    { width: 600, quality: 22, name: "600px Q22" },
    { width: 500, quality: 25, name: "500px Q25" },
    { width: 500, quality: 22, name: "500px Q22" },
    { width: 500, quality: 20, name: "500px Q20" },
  ];

  console.log("🔍 최적 설정 탐색 중...\n");

  let bestOption = null;
  let bestSize = Infinity;
  const results = [];

  for (const option of options) {
    const testOutput = join(OUTPUT_DIR, `hero-test-${option.width}-q${option.quality}.webp`);

    await sharp(inputPath)
      .resize(option.width, null, {
        withoutEnlargement: true,
        fit: "inside",
      })
      .webp({
        quality: option.quality,
        effort: 6,
        smartSubsample: true,
      })
      .toFile(testOutput);

    const size = await getFileSize(testOutput);
    const metadata = await sharp(testOutput).metadata();

    results.push({
      option,
      size,
      resolution: `${metadata.width}x${metadata.height}`,
      testOutput,
    });

    console.log(`✓ ${option.name}: ${formatBytes(size)} (${metadata.width}x${metadata.height})`);

    // 30KB 이하 중 가장 큰 파일 선택 (품질 우선)
    if (size <= 30 * 1024) {
      if (bestOption === null || size > bestSize) {
        bestSize = size;
        bestOption = { ...option, testOutput, resolution: `${metadata.width}x${metadata.height}` };
      }
    }
  }

  console.log("\n" + "=".repeat(60));

  if (bestOption) {
    console.log("✅ 최적 설정 발견!\n");
    console.log(`설정: ${bestOption.name}`);
    console.log(`해상도: ${bestOption.resolution}`);
    console.log(`크기: ${formatBytes(bestSize)}`);
    console.log("\n최종 파일로 적용 중...");

    // 최적 파일을 hero.webp로 복사
    await sharp(bestOption.testOutput).toFile(outputPath);

    // 테스트 파일들 삭제
    const fs = await import("fs/promises");
    for (const result of results) {
      try {
        await fs.unlink(result.testOutput);
      } catch (e) {}
    }

    // 최종 검증
    const finalSize = await getFileSize(outputPath);
    const finalMetadata = await sharp(outputPath).metadata();
    const originalSize = await getFileSize(inputPath);
    const savings = ((originalSize - finalSize) / originalSize * 100).toFixed(1);

    console.log("\n" + "=".repeat(60));
    console.log("🎉 최적화 완료!\n");
    console.log(`원본: ${formatBytes(originalSize)} (5556x7778)`);
    console.log(`최종: ${formatBytes(finalSize)} (${finalMetadata.width}x${finalMetadata.height})`);
    console.log(`절감: ${formatBytes(originalSize - finalSize)} (${savings}%)`);
    console.log("\n✅ 30KB 목표 달성!");
  } else {
    console.log("⚠️  30KB 이하로 압축 실패");
    console.log("가장 작은 크기:", formatBytes(Math.min(...results.map(r => r.size))));
  }
}

optimizeHero().catch(console.error);
