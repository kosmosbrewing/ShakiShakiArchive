// scripts/optimize-hero.js
// Hero 이미지 공격적 최적화 (리사이징 + WebP)

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

async function optimizeHeroImage() {
  const inputPath = join(ASSETS_DIR, "hero.jpeg");
  const outputPath = join(OUTPUT_DIR, "hero.webp");

  console.log("🎨 Starting aggressive hero image optimization...\n");

  // 원본 파일 정보
  const originalSize = await getFileSize(inputPath);
  const image = sharp(inputPath);
  const metadata = await image.metadata();

  console.log("📊 Original Image Info:");
  console.log(`   Resolution: ${metadata.width}x${metadata.height}`);
  console.log(`   Size: ${formatBytes(originalSize)}`);
  console.log(`   Format: ${metadata.format}`);
  console.log("");

  // 최적화 설정
  const MAX_WIDTH = 2400; // 2400px 너비 (4K 디스플레이도 충분히 커버)
  const QUALITY = 75; // 품질 75 (더 공격적인 압축)

  console.log("⚙️  Optimization Settings:");
  console.log(`   Max Width: ${MAX_WIDTH}px`);
  console.log(`   WebP Quality: ${QUALITY}`);
  console.log(`   Resize: ${metadata.width > MAX_WIDTH ? "Yes" : "No"}`);
  console.log("");

  // 이미지 최적화
  console.log("🔄 Processing...");

  await sharp(inputPath)
    .resize(MAX_WIDTH, null, {
      // 비율 유지하면서 너비만 리사이징
      withoutEnlargement: true,
      fit: "inside",
    })
    .webp({
      quality: QUALITY,
      effort: 6,
    })
    .toFile(outputPath);

  // 결과 확인
  const optimizedSize = await getFileSize(outputPath);
  const optimizedImage = sharp(outputPath);
  const optimizedMetadata = await optimizedImage.metadata();

  const savings = ((originalSize - optimizedSize) / originalSize * 100).toFixed(1);

  console.log("✅ Optimization Complete!\n");
  console.log("📊 Results:");
  console.log(`   Original:  ${formatBytes(originalSize)} (${metadata.width}x${metadata.height})`);
  console.log(`   Optimized: ${formatBytes(optimizedSize)} (${optimizedMetadata.width}x${optimizedMetadata.height})`);
  console.log(`   Saved:     ${formatBytes(originalSize - optimizedSize)} (${savings}%)`);
  console.log("");

  // LCP 예상 개선
  const estimatedLCP = (16.9 * (optimizedSize / 1520579)).toFixed(1); // 현재 LCP 16.9s 기준 비례 계산
  console.log("📈 Expected Performance Impact:");
  console.log(`   Current LCP: 16.9s`);
  console.log(`   Expected LCP: ~${estimatedLCP}s (based on file size ratio)`);
  console.log(`   LCP Improvement: ${((16.9 - estimatedLCP) / 16.9 * 100).toFixed(1)}%`);
}

optimizeHeroImage().catch(console.error);
