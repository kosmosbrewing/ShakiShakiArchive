// scripts/prerender/sitemap.js
// sitemap.xml 정적 파일 생성
// - /api/products (id 포함) + /api/categories 데이터 사용
// - URL 형식: /productDetail/{slug}, /product/{slug}
// - Google이 무시하는 priority/changefreq는 제외
// - lastmod는 신뢰 가능한 변경일이 있는 URL에만 포함

import fs from "fs";
import path from "path";
import { SITE_URL, DIST_DIR } from "./config.js";
import {
  escapeXml,
  getProductLastmod,
  getLatestProductLastmod,
} from "./utils.js";
import { STATIC_POLICY_PAGES } from "./staticPages.js";

export function generateSitemap(products, categories) {
  console.log("\n🗺️  sitemap.xml 생성 중...");

  try {
    const visibleProducts = products.filter(
      (p) => p.id && p.isAvailable !== false
    );
    const allProductsLastmod = getLatestProductLastmod(visibleProducts);

    const productsByCategoryId = visibleProducts.reduce((map, product) => {
      const categoryId = product.categoryId;
      if (categoryId === null || categoryId === undefined) return map;
      const key = String(categoryId);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(product);
      return map;
    }, new Map());

    // 정적 페이지
    const staticPages = [
      { loc: `${SITE_URL}/` },
      { loc: `${SITE_URL}/faq` },
      { loc: `${SITE_URL}/terms`, lastmod: STATIC_POLICY_PAGES.terms.lastmod },
      { loc: `${SITE_URL}/privacy`, lastmod: STATIC_POLICY_PAGES.privacy.lastmod },
      { loc: `${SITE_URL}/about` },
      { loc: `${SITE_URL}/notice` },
      { loc: `${SITE_URL}/product/all`, lastmod: allProductsLastmod },
      { loc: `${SITE_URL}/archive/sold`, lastmod: allProductsLastmod },
      { loc: `${SITE_URL}/archive/journal` },
    ];

    // 카테고리 페이지
    const categoryPages = categories
      .filter((c) => c && c.slug)
      .map((c) => ({
        loc: `${SITE_URL}/product/${c.slug}`,
        lastmod: getLatestProductLastmod(
          productsByCategoryId.get(String(c.id)) || []
        ),
      }));

    // 상품 상세 페이지 (slug 기반 — 라우터 /productDetail/:slug 와 일치)
    // slug가 없는 상품은 uuid fallback
    const productPages = visibleProducts.map((p) => ({
      loc: `${SITE_URL}/productDetail/${p.slug || p.id}`,
      lastmod: getProductLastmod(p),
      imageUrl: p.imageUrl || "",
    }));

    const allPages = [...staticPages, ...categoryPages, ...productPages];

    const xmlLines = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
      '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
      ...allPages.map((p) => {
        const lastmodTag = p.lastmod
          ? `\n    <lastmod>${escapeXml(p.lastmod)}</lastmod>`
          : "";
        const imageTag = p.imageUrl
          ? `\n    <image:image>\n      <image:loc>${escapeXml(p.imageUrl)}</image:loc>\n    </image:image>`
          : "";
        return `  <url>\n    <loc>${escapeXml(p.loc)}</loc>${lastmodTag}${imageTag}\n  </url>`;
      }),
      "</urlset>",
    ];

    const sitemapPath = path.join(DIST_DIR, "sitemap.xml");
    fs.writeFileSync(sitemapPath, xmlLines.join("\n"), "utf-8");
    console.log(`   ✅ 생성: sitemap.xml (총 ${allPages.length}개 URL)`);
    console.log(
      `      정적: ${staticPages.length}, 카테고리: ${categoryPages.length}, 상품: ${productPages.length}`
    );
    return { generated: true, failed: [] };
  } catch (error) {
    console.error("   ❌ sitemap.xml 생성 실패:", error.message);
    throw error;
  }
}
