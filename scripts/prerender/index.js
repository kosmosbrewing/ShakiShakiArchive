// scripts/prerender/index.js
// Prerendering 오케스트레이션: 빌드 시점에 정적 HTML 파일 생성
// 실행: npm run prerender (build:full에 포함)

import fs from "fs";
import path from "path";
import { BACKEND_API, DIST_DIR, INDEX_PATH } from "./config.js";
import { getTodayDateStr } from "./utils.js";
import { fetchAllProducts, fetchCategories } from "./api.js";
import {
  prerenderHome,
  prerenderFaq,
  prerenderCategories,
  prerenderProducts,
} from "./pages.js";
import { generateSitemap } from "./sitemap.js";

/**
 * llms.txt Last-Updated 자동 갱신 (dist 기준)
 */
function updateLlmsLastUpdated() {
  const llmsPath = path.join(DIST_DIR, "llms.txt");
  if (!fs.existsSync(llmsPath)) {
    console.warn("   ⚠️  llms.txt 파일이 없어 Last-Updated 갱신을 건너뜁니다.");
    return { updated: false, failed: ["llms.txt not found"] };
  }

  const today = getTodayDateStr();
  const content = fs.readFileSync(llmsPath, "utf-8");

  let updatedContent = content;
  if (/^Last-Updated:\s*.+$/m.test(content)) {
    updatedContent = content.replace(
      /^Last-Updated:\s*.+$/m,
      `Last-Updated: ${today}`
    );
  } else {
    updatedContent = content.replace(
      /^# .+$/m,
      (header) => `${header}\n\nLast-Updated: ${today}`
    );
  }

  fs.writeFileSync(llmsPath, updatedContent, "utf-8");
  console.log(`   ✅ llms.txt Last-Updated 갱신: ${today}`);
  return { updated: true, failed: [] };
}

function printSummary(runStats) {
  const toRate = (generated, attempted) => {
    if (!attempted) return "0.0";
    return ((generated / attempted) * 100).toFixed(1);
  };

  console.log("\n✨ Prerendering 완료!\n");
  console.log("📦 생성된 파일:");
  console.log("   - index.html (홈)");
  console.log("   - faq.html (FAQ)");
  console.log("   - product/{category}.html (카테고리별)");
  console.log("   - productDetail/{id}.html (상품별)");
  console.log("   - sitemap.xml\n");
  console.log("📊 Prerender 요약:");
  console.log(`   - 홈: ${runStats.home.generated}/${runStats.home.attempted} (${toRate(runStats.home.generated, runStats.home.attempted)}%)`);
  console.log(`   - FAQ: ${runStats.faq.generated}/${runStats.faq.attempted} (${toRate(runStats.faq.generated, runStats.faq.attempted)}%)`);
  console.log(`   - 카테고리: ${runStats.categories.generated}/${runStats.categories.attempted} (${toRate(runStats.categories.generated, runStats.categories.attempted)}%)`);
  console.log(`   - 상품 상세: ${runStats.products.generated}/${runStats.products.attempted} (${toRate(runStats.products.generated, runStats.products.attempted)}%)`);
  console.log(`   - sitemap.xml: ${runStats.sitemap.generated ? "성공" : "실패"}`);
  console.log(`   - llms.txt 날짜 갱신: ${runStats.llms.updated ? "성공" : "실패"}`);

  const warnIfFailed = (label, failed) => {
    if (failed.length > 0) {
      console.warn(`   ⚠️  ${label} 실패 목록 (${failed.length}): ${failed.join(", ")}`);
    }
  };
  warnIfFailed("카테고리", runStats.categories.failed);
  warnIfFailed("FAQ", runStats.faq.failed);
  warnIfFailed("상품 상세", runStats.products.failed);
  warnIfFailed("sitemap", runStats.sitemap.failed);
  warnIfFailed("llms 갱신", runStats.llms.failed);
}

/**
 * 일부 페이지가 빠진 채 성공 종료하면 뒤의 S3 sync --delete가 이전 정상 HTML을 지울 수 있다.
 * 배포 artifact는 전 페이지가 생성됐을 때만 성공으로 취급한다.
 */
function assertComplete(runStats) {
  const incomplete = [];

  // 하한선 검사: generated === attempted만 보면 "0개 시도 → 0개 성공"이 통과한다.
  // 백엔드가 200으로 빈 목록을 주는 경우(RDS 콜드 스타트 직후, 커넥션 풀 미준비,
  // 응답 스키마 변경)가 실제로 있고, 그대로 배포되면 뒤이은 s3 sync --delete가
  // 색인된 상품/카테고리 HTML을 통째로 지운다. 특히 재오픈 직후가 이 창이 가장 크다.
  // 카탈로그를 의도적으로 줄였다면 PRERENDER_MIN_PRODUCTS로 하한을 낮춘다.
  const minProducts = Number(process.env.PRERENDER_MIN_PRODUCTS ?? 50);
  if (runStats.products.attempted < minProducts) {
    incomplete.push(
      `상품 수집량 부족 ${runStats.products.attempted}개 (하한 ${minProducts}) ` +
        `— 백엔드가 빈 목록을 반환했을 가능성. 의도한 축소면 PRERENDER_MIN_PRODUCTS를 조정하세요`
    );
  }
  if (runStats.categories.attempted < 1) {
    incomplete.push("카테고리 0개 — 백엔드 응답 확인 필요");
  }

  const pageGroups = [
    ["홈", runStats.home],
    ["FAQ", runStats.faq],
    ["카테고리", runStats.categories],
    ["상품 상세", runStats.products],
  ];

  for (const [label, stats] of pageGroups) {
    if (stats.failed.length > 0 || stats.generated !== stats.attempted) {
      incomplete.push(
        `${label} ${stats.generated}/${stats.attempted}` +
          (stats.failed.length > 0 ? ` (${stats.failed.join(", ")})` : "")
      );
    }
  }
  if (!runStats.sitemap.generated || runStats.sitemap.failed.length > 0) {
    incomplete.push("sitemap.xml");
  }
  if (!runStats.llms.updated || runStats.llms.failed.length > 0) {
    incomplete.push("llms.txt");
  }

  if (incomplete.length > 0) {
    throw new Error(`불완전한 prerender artifact: ${incomplete.join("; ")}`);
  }
}

/**
 * 메인 Prerender 함수
 */
async function prerender() {
  console.log("🚀 Prerendering 시작...\n");
  console.log(`📍 Backend API: ${BACKEND_API}`);
  console.log(`📍 Dist 디렉토리: ${DIST_DIR}\n`);

  // dist/index.html이 있는지 확인
  if (!fs.existsSync(INDEX_PATH)) {
    console.error("❌ dist/index.html 파일이 없습니다!");
    console.error('   먼저 "npm run build"를 실행하세요.');
    process.exit(1);
  }

  // 템플릿 로드
  const template = fs.readFileSync(INDEX_PATH, "utf-8");
  console.log("✅ 템플릿 로드 완료");

  try {
    // 상품/카테고리 데이터는 한 번만 수집해 공유 (중복 API 호출 방지)
    const [products, categories] = await Promise.all([
      fetchAllProducts(),
      fetchCategories(),
    ]);

    const runStats = {
      home: await prerenderHome(template),
      faq: await prerenderFaq(template),
      categories: await prerenderCategories(template, categories),
      products: await prerenderProducts(template, products),
      sitemap: generateSitemap(products, categories),
      llms: updateLlmsLastUpdated(),
    };

    printSummary(runStats);
    assertComplete(runStats);
  } catch (error) {
    console.error("\n❌ Prerendering 실패:", error);
    process.exit(1);
  }
}

// 스크립트 실행
prerender();
