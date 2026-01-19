// scripts/optimize-fallback.js
// Hero + Marquee 폴백 이미지 극도로 공격적 최적화 (95% 이상 목표)

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

async function optimizeImage(inputPath, outputPath, options = {}) {
  const {
    maxWidth = null,
    quality = 50,
    resize = false,
  } = options;

  const originalSize = await getFileSize(inputPath);
  const image = sharp(inputPath);
  const metadata = await image.metadata();

  let pipeline = sharp(inputPath);

  // 리사이징
  if (resize && maxWidth && metadata.width > maxWidth) {
    pipeline = pipeline.resize(maxWidth, null, {
      withoutEnlargement: true,
      fit: "inside",
    });
  }

  // WebP 변환 (극도로 공격적)
  await pipeline
    .webp({
      quality,
      effort: 6,
      smartSubsample: true, // 더 공격적인 서브샘플링
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
  console.log("🔥 Starting EXTREME optimization for fallback images...");
  console.log("   Target: 95%+ file size reduction\n");

  let totalOriginalSize = 0;
  let totalOptimizedSize = 0;
  const results = [];

  // 1. Hero 이미지 - 극도로 공격적 최적화
  console.log("📸 Optimizing Hero Image (Fallback)...");
  console.log("   Strategy: Quality 50, Max Width 1600px (Full HD)\n");

  const heroInput = join(ASSETS_DIR, "hero.jpeg");
  const heroOutput = join(OUTPUT_DIR, "hero.webp");

  try {
    const heroResult = await optimizeImage(heroInput, heroOutput, {
      maxWidth: 1600,
      quality: 50, // 극도로 낮은 품질
      resize: true,
    });

    console.log(`✅ hero.jpeg → hero.webp`);
    console.log(`   ${heroResult.originalResolution} → ${heroResult.optimizedResolution}`);
    console.log(`   ${formatBytes(heroResult.originalSize)} → ${formatBytes(heroResult.optimizedSize)} (${heroResult.savings}% saved)`);

    if (heroResult.savings >= 95) {
      console.log(`   🎯 TARGET ACHIEVED! 95%+ reduction ✅\n`);
    } else {
      console.log(`   ⚠️  ${heroResult.savings}% (Target: 95%)\n`);
    }

    results.push({ file: "hero.jpeg", ...heroResult });
    totalOriginalSize += heroResult.originalSize;
    totalOptimizedSize += heroResult.optimizedSize;
  } catch (error) {
    console.error(`❌ Failed to optimize hero.jpeg:`, error.message);
  }

  // 2. Marquee 이미지 - 극도로 공격적 최적화
  console.log("🎠 Optimizing Marquee Image (Fallback)...");
  console.log("   Strategy: Quality 50, Max Width 800px\n");

  const marqueeInput = join(ASSETS_DIR, "marquee01.png");
  const marqueeOutput = join(OUTPUT_DIR, "marquee01.webp");

  try {
    const marqueeResult = await optimizeImage(marqueeInput, marqueeOutput, {
      maxWidth: 800,
      quality: 50,
      resize: true,
    });

    console.log(`✅ marquee01.png → marquee01.webp`);
    console.log(`   ${marqueeResult.originalResolution} → ${marqueeResult.optimizedResolution}`);
    console.log(`   ${formatBytes(marqueeResult.originalSize)} → ${formatBytes(marqueeResult.optimizedSize)} (${marqueeResult.savings}% saved)`);

    if (marqueeResult.savings >= 95) {
      console.log(`   🎯 TARGET ACHIEVED! 95%+ reduction ✅\n`);
    } else {
      console.log(`   ⚠️  ${marqueeResult.savings}% (Target: 95%)\n`);
    }

    results.push({ file: "marquee01.png", ...marqueeResult });
    totalOriginalSize += marqueeResult.originalSize;
    totalOptimizedSize += marqueeResult.optimizedSize;
  } catch (error) {
    console.error(`❌ Failed to optimize marquee01.png:`, error.message);
  }

  // 결과 요약
  console.log("═".repeat(60));
  console.log("📊 Extreme Optimization Summary");
  console.log("═".repeat(60));
  console.log(`Total images optimized: ${results.length}`);
  console.log(`Original size:  ${formatBytes(totalOriginalSize)}`);
  console.log(`Optimized size: ${formatBytes(totalOptimizedSize)}`);

  const totalSavings = ((totalOriginalSize - totalOptimizedSize) / totalOriginalSize * 100).toFixed(1);
  console.log(`Total savings:  ${formatBytes(totalOriginalSize - totalOptimizedSize)} (${totalSavings}%)`);

  if (parseFloat(totalSavings) >= 95) {
    console.log(`\n🎉 SUCCESS! Achieved 95%+ reduction target!`);
  } else {
    console.log(`\n📊 Result: ${totalSavings}% (Target was 95%+)`);
  }

  console.log("═".repeat(60));

  // LCP 예상 개선
  if (results.length > 0 && results[0].file === "hero.jpeg") {
    const heroOptimizedSize = results[0].optimizedSize;
    const currentLCP = 11.8; // 이전 측정값

    // 이전 Hero 크기 (376KB)와 비교
    const previousHeroSize = 376109;
    const estimatedLCP = (currentLCP * (heroOptimizedSize / previousHeroSize)).toFixed(1);

    console.log("\n📈 Expected Performance Impact:");
    console.log(`   Previous Hero size: ${formatBytes(previousHeroSize)}`);
    console.log(`   New Hero size:      ${formatBytes(heroOptimizedSize)}`);
    console.log(`   Size reduction:     ${(((previousHeroSize - heroOptimizedSize) / previousHeroSize) * 100).toFixed(1)}%`);
    console.log("");
    console.log(`   Current LCP:  ${currentLCP}s`);
    console.log(`   Expected LCP: ~${estimatedLCP}s`);
    console.log(`   LCP Improvement: ${((currentLCP - estimatedLCP) / currentLCP * 100).toFixed(1)}%`);

    if (parseFloat(estimatedLCP) < 5) {
      console.log(`   🎯 TARGET: LCP < 5s - LIKELY ACHIEVED! ✅`);
    }
  }

  console.log("\n✨ Done! Optimized images are in: src/assets/optimized/");
  console.log("⚠️  Note: These are fallback images, so quality loss is acceptable.");
}

main().catch(console.error);
