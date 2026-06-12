// scripts/prerender/pages.js
// 페이지 유형별 Prerender 실행 함수

import { fetchSeoData } from "./api.js";
import { generateMetaTags, injectMetaTags } from "./meta.js";
import { saveHtmlFile } from "./utils.js";
import { extractFaqEntries, injectFaqBodyHtml } from "./faq.js";
import { STATIC_POLICY_PAGES, injectStaticBodyHtml } from "./staticPages.js";
import {
  injectProductBodyHtml,
  injectCategoryBodyHtml,
} from "./productBody.js";

/**
 * 1. 홈페이지 Prerender
 */
export async function prerenderHome(template) {
  console.log("\n📄 홈페이지 Prerendering...");

  const seoData = await fetchSeoData("/api/seo/home");
  if (!seoData) {
    return { attempted: 1, generated: 0, failed: ["home"] };
  }

  const metaTags = generateMetaTags(seoData);
  const html = injectMetaTags(template, metaTags);

  // index.html 덮어쓰기
  saveHtmlFile("index.html", html);
  return { attempted: 1, generated: 1, failed: [] };
}

/**
 * 1-1. FAQ 페이지 Prerender
 */
export async function prerenderFaq(template) {
  console.log("\n📄 FAQ 페이지 Prerendering...");

  const seoData = await fetchSeoData("/api/seo/faq");
  if (!seoData) {
    throw new Error("FAQ SEO 데이터 로드 실패: /api/seo/faq");
  }
  const faqEntries = extractFaqEntries(seoData);
  if (faqEntries.length === 0) {
    throw new Error(
      "FAQ prerender 실패: /api/seo/faq 응답의 FAQPage.mainEntity가 비어 있습니다."
    );
  }

  const metaTags = generateMetaTags(seoData);
  const htmlWithMeta = injectMetaTags(template, metaTags);
  const faqHtml = injectFaqBodyHtml(htmlWithMeta, seoData);
  saveHtmlFile("faq.html", faqHtml);
  return { attempted: 1, generated: 1, failed: [] };
}

/**
 * 1-2. 정적 정책 페이지 Prerender
 */
export async function prerenderStaticPolicies(template) {
  console.log("\n📄 정책 페이지 Prerendering...");
  const stats = { attempted: 0, generated: 0, failed: [] };

  for (const pageKey of Object.keys(STATIC_POLICY_PAGES)) {
    stats.attempted++;
    try {
      const html = injectStaticBodyHtml(template, pageKey);
      saveHtmlFile(`${pageKey}.html`, html);
      stats.generated++;
    } catch (error) {
      stats.failed.push(`${pageKey}:${error.message}`);
    }
  }

  return stats;
}

/**
 * 2. 카테고리별 페이지 Prerender (meta + 상품 링크 목록 본문 주입)
 */
export async function prerenderCategories(template, categories) {
  console.log("\n📄 카테고리 페이지 Prerendering...");
  const stats = { attempted: 0, generated: 0, failed: [] };

  console.log(`   📦 카테고리 ${categories.length}개 발견`);

  for (const category of categories) {
    stats.attempted++;
    const seoData = await fetchSeoData(`/api/seo/categories/${category.slug}`);
    if (!seoData) {
      console.warn(`   ⚠️  SEO 데이터 없음, 스킵: ${category.slug}`);
      stats.failed.push(category.slug);
      continue;
    }

    const metaTags = generateMetaTags(seoData);
    const htmlWithMeta = injectMetaTags(template, metaTags);
    // ItemList 기반 상품 링크 목록을 본문으로 주입 (내부 링크 강화)
    const html = injectCategoryBodyHtml(htmlWithMeta, seoData);

    saveHtmlFile(`product/${category.slug}.html`, html);
    stats.generated++;
  }

  return stats;
}

/**
 * 3. 상품 상세 페이지 Prerender (meta + 상품 본문 주입)
 */
export async function prerenderProducts(template, products) {
  console.log("\n📄 상품 상세 페이지 Prerendering...");
  const stats = { attempted: 0, generated: 0, failed: [] };

  // 상품이 너무 많으면 경고
  if (products.length > 100) {
    console.warn(
      `   ⚠️  상품이 ${products.length}개로 많습니다. 빌드 시간이 오래 걸릴 수 있습니다.`
    );
  }

  for (const product of products) {
    stats.attempted++;
    const seoData = await fetchSeoData(`/api/seo/products/${product.id}`);
    if (!seoData) {
      stats.failed.push(product.slug || product.id);
      continue;
    }

    const metaTags = generateMetaTags(seoData);
    const htmlWithMeta = injectMetaTags(template, metaTags);
    // JSON-LD 기반 상품 본문(h1, 가격, 설명, 브레드크럼) 주입
    const html = injectProductBodyHtml(htmlWithMeta, seoData);

    // slug가 있으면 slug 기반 경로 사용 (SEO URL), 없으면 uuid fallback
    const fileKey = product.slug || product.id;
    saveHtmlFile(`productDetail/${fileKey}.html`, html);
    stats.generated++;
  }

  return stats;
}
