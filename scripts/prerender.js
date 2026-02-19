// scripts/prerender.js
// Prerendering: 빌드 시점에 정적 HTML 파일 생성

import axios from "axios";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ES module에서 __dirname 대체
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 백엔드 API URL (환경변수 또는 기본값)
const BACKEND_API = process.env.VITE_API_URL || "http://localhost:8080";
const SITE_URL = "https://shakishakiarchive.com";
const DIST_DIR = path.join(__dirname, "../dist");
const INDEX_PATH = path.join(DIST_DIR, "index.html");

/**
 * XSS 방지를 위한 HTML 이스케이프
 */
function escapeHtml(text) {
  if (!text) return "";
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return String(text).replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * SEO 데이터를 HTML 메타 태그로 변환
 */
function generateMetaTags(seoData) {
  if (!seoData || !seoData.openGraph) {
    console.warn("⚠️  SEO 데이터가 없습니다.");
    return "";
  }

  const og = seoData.openGraph;

  return `
    <!-- Prerendered 메타 태그 -->
    <title>${escapeHtml(og.title)}</title>
    <meta name="description" content="${escapeHtml(og.description)}">
    ${og.url ? `<link rel="canonical" href="${escapeHtml(og.url)}">` : ""}

    <!-- OpenGraph (카카오톡, 페이스북) -->
    <meta property="og:title" content="${escapeHtml(og.title)}">
    <meta property="og:description" content="${escapeHtml(og.description)}">
    <meta property="og:url" content="${escapeHtml(og.url)}">
    <meta property="og:type" content="${escapeHtml(og.type)}">
    <meta property="og:site_name" content="${escapeHtml(og.siteName)}">
    <meta property="og:locale" content="${escapeHtml(og.locale)}">
    ${
      og.image
        ? `<meta property="og:image" content="${escapeHtml(og.image)}">`
        : ""
    }

    <!-- Twitter Card -->
    <meta name="twitter:card" content="${escapeHtml(og.twitter.card)}">
    <meta name="twitter:title" content="${escapeHtml(og.twitter.title)}">
    <meta name="twitter:description" content="${escapeHtml(
      og.twitter.description
    )}">
    ${
      og.twitter.image
        ? `<meta name="twitter:image" content="${escapeHtml(
            og.twitter.image
          )}">`
        : ""
    }
  `.trim();
}

/**
 * YYYY-MM-DD 날짜 문자열 생성
 */
function getTodayDateStr() {
  return new Date().toISOString().split("T")[0];
}

/**
 * HTML에 메타 태그 주입
 */
function injectMetaTags(html, metaTags) {
  // <!-- 기본 제목 --> 부터 <!-- 토스페이먼츠 SDK --> 전까지 교체
  const headRegex = /(<!-- 기본 제목 -->[\s\S]*?)(<!-- 토스페이먼츠 SDK -->)/;

  if (headRegex.test(html)) {
    return html.replace(headRegex, `${metaTags}\n\n    $2`);
  }

  // Fallback: </head> 직전에 삽입
  return html.replace("</head>", `${metaTags}\n  </head>`);
}

/**
 * SEO 데이터 가져오기
 */
async function fetchSeoData(endpoint) {
  try {
    const url = `${BACKEND_API}${endpoint}`;
    console.log(`   📡 API 호출: ${url}`);
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error(`   ❌ SEO 데이터 로드 실패: ${endpoint}`, error.message);
    return null;
  }
}

/**
 * HTML 파일 저장
 */
function saveHtmlFile(relativePath, html) {
  const fullPath = path.join(DIST_DIR, relativePath);
  const dir = path.dirname(fullPath);

  // 디렉토리 생성
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // 파일 저장
  fs.writeFileSync(fullPath, html, "utf-8");
  console.log(`   ✅ 생성: ${relativePath}`);
}

/**
 * 1. 홈페이지 Prerender
 */
async function prerenderHome(template) {
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
 * 2. 카테고리별 페이지 Prerender
 */
async function prerenderCategories(template) {
  console.log("\n📄 카테고리 페이지 Prerendering...");
  const stats = { attempted: 0, generated: 0, failed: [] };

  try {
    // 백엔드에서 카테고리 목록 가져오기
    const { data: categories } = await axios.get(
      `${BACKEND_API}/api/categories`
    );
    console.log(`   📦 카테고리 ${categories.length}개 발견`);

    for (const category of categories) {
      stats.attempted++;
      // 모든 카테고리를 백엔드 API에서 가져오기
      const seoData = await fetchSeoData(`/api/seo/categories/${category.slug}`);
      if (!seoData) {
        console.warn(`   ⚠️  SEO 데이터 없음, 스킵: ${category.slug}`);
        stats.failed.push(category.slug);
        continue;
      }

      const metaTags = generateMetaTags(seoData);
      const html = injectMetaTags(template, metaTags);

      saveHtmlFile(`product/${category.slug}.html`, html);
      stats.generated++;
    }
  } catch (error) {
    console.error("   ❌ 카테고리 로드 실패:", error.message);
    stats.failed.push(`load-error:${error.message}`);
  }

  return stats;
}

/**
 * API 응답에서 상품 배열 추출
 * 실서버 응답이 { products: [...] } 형태이므로 양쪽 모두 처리
 */
function extractProducts(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.products)) return data.products;
  return [];
}

/**
 * API 응답에서 카테고리 배열 추출
 */
function extractCategories(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.categories)) return data.categories;
  return [];
}

/**
 * 전체 상품 목록 페이지네이션으로 수집
 * 백엔드 기본 limit=40, 최대 limit=100 → 상품이 41개 이상이면 여러 페이지 순회
 */
async function fetchAllProducts() {
  const all = [];
  let page = 1;
  const limit = 100; // 백엔드 허용 최대값

  while (true) {
    const { data } = await axios.get(
      `${BACKEND_API}/api/products?page=${page}&limit=${limit}`
    );
    const batch = extractProducts(data);
    all.push(...batch);

    // hasMore가 false이거나 pagination 정보가 없으면 종료
    const hasMore = data?.pagination?.hasMore;
    if (!hasMore || batch.length === 0) break;
    page++;
  }

  console.log(`   📦 전체 상품 ${all.length}개 수집 완료 (${page}페이지)`);
  return all;
}

/**
 * 3. sitemap.xml 정적 파일 생성
 * - /api/products (id 포함) + /api/categories 데이터 사용
 * - URL 형식: /productDetail/{uuid}, /product/{slug}
 */
async function generateSitemap() {
  console.log("\n🗺️  sitemap.xml 생성 중...");

  try {
    const [products, categoriesRes] = await Promise.all([
      fetchAllProducts(),
      axios.get(`${BACKEND_API}/api/categories`),
    ]);

    const categories = extractCategories(categoriesRes.data);

    // XML 특수문자 이스케이프 (sitemap URL용)
    const escapeXml = (str) => String(str || "").replace(/&/g, "&amp;").replace(/'/g, "&apos;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    // ISO 날짜를 YYYY-MM-DD 형식으로 변환
    const toDateStr = (iso) => {
      try { return new Date(iso).toISOString().split("T")[0]; }
      catch { return new Date().toISOString().split("T")[0]; }
    };

    const today = getTodayDateStr();

    // 정적 페이지
    const staticPages = [
      { loc: `${SITE_URL}/`,        changefreq: "daily",   priority: "1.0", lastmod: today },
      { loc: `${SITE_URL}/product/all`, changefreq: "daily", priority: "0.9", lastmod: today },
    ];

    // 카테고리 페이지
    const categoryPages = categories
      .filter((c) => c && c.slug)
      .map((c) => ({
        loc: `${SITE_URL}/product/${c.slug}`,
        changefreq: "weekly",
        priority: "0.8",
        lastmod: today,
      }));

    // 상품 상세 페이지 (slug 기반 — 라우터 /productDetail/:slug 와 일치)
    // slug가 없는 상품은 uuid fallback
    const productPages = products
      .filter((p) => p.id && p.isAvailable !== false)
      .map((p) => ({
        loc: `${SITE_URL}/productDetail/${p.slug || p.id}`,
        changefreq: "weekly",
        priority: "0.9",
        lastmod: toDateStr(p.updatedAt || p.createdAt),
        imageUrl: p.imageUrl || "",
      }));

    const allPages = [...staticPages, ...categoryPages, ...productPages];

    const xmlLines = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
      '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
      ...allPages.map(
        (p) => {
          const imageTag = p.imageUrl
            ? `\n    <image:image>\n      <image:loc>${escapeXml(p.imageUrl)}</image:loc>\n    </image:image>`
            : "";
          return `  <url>\n    <loc>${escapeXml(p.loc)}</loc>\n    <lastmod>${escapeXml(p.lastmod)}</lastmod>\n    <changefreq>${escapeXml(p.changefreq)}</changefreq>\n    <priority>${escapeXml(p.priority)}</priority>${imageTag}\n  </url>`;
        }
      ),
      "</urlset>",
    ];

    const sitemapPath = path.join(DIST_DIR, "sitemap.xml");
    fs.writeFileSync(sitemapPath, xmlLines.join("\n"), "utf-8");
    console.log(`   ✅ 생성: sitemap.xml (총 ${allPages.length}개 URL)`);
    console.log(`      정적: ${staticPages.length}, 카테고리: ${categoryPages.length}, 상품: ${productPages.length}`);
    return { generated: true, failed: [] };
  } catch (error) {
    console.error("   ❌ sitemap.xml 생성 실패:", error.message);
    return { generated: false, failed: [error.message] };
  }
}

/**
 * 4. 상품 상세 페이지 Prerender
 */
async function prerenderProducts(template) {
  console.log("\n📄 상품 상세 페이지 Prerendering...");
  const stats = { attempted: 0, generated: 0, failed: [] };

  try {
    // 백엔드에서 전체 상품 목록 가져오기 (페이지네이션으로 전체 수집)
    const products = await fetchAllProducts();

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
      const html = injectMetaTags(template, metaTags);

      // slug가 있으면 slug 기반 경로 사용 (SEO URL), 없으면 uuid fallback
      const fileKey = product.slug || product.id;
      saveHtmlFile(`productDetail/${fileKey}.html`, html);
      stats.generated++;
    }
  } catch (error) {
    console.error("   ❌ 상품 목록 로드 실패:", error.message);
    stats.failed.push(`load-error:${error.message}`);
  }

  return stats;
}

/**
 * 5. llms.txt Last-Updated 자동 갱신 (dist 기준)
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
    updatedContent = content.replace(/^Last-Updated:\s*.+$/m, `Last-Updated: ${today}`);
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
    const runStats = {
      home: { attempted: 0, generated: 0, failed: [] },
      categories: { attempted: 0, generated: 0, failed: [] },
      products: { attempted: 0, generated: 0, failed: [] },
      sitemap: { generated: false, failed: [] },
      llms: { updated: false, failed: [] },
    };

    // 1. 홈페이지
    runStats.home = await prerenderHome(template);

    // 2. 카테고리별
    runStats.categories = await prerenderCategories(template);

    // 3. 상품 상세
    runStats.products = await prerenderProducts(template);

    // 4. sitemap.xml 생성 (HTML prerender 완료 후 실행)
    runStats.sitemap = await generateSitemap();

    // 5. llms.txt Last-Updated 자동 갱신
    runStats.llms = updateLlmsLastUpdated();

    const toRate = (generated, attempted) => {
      if (!attempted) return "0.0";
      return ((generated / attempted) * 100).toFixed(1);
    };

    console.log("\n✨ Prerendering 완료!\n");
    console.log("📦 생성된 파일:");
    console.log("   - index.html (홈)");
    console.log("   - product/{category}.html (카테고리별)");
    console.log("   - productDetail/{id}.html (상품별)");
    console.log("   - sitemap.xml\n");
    console.log("📊 Prerender 요약:");
    console.log(`   - 홈: ${runStats.home.generated}/${runStats.home.attempted} (${toRate(runStats.home.generated, runStats.home.attempted)}%)`);
    console.log(`   - 카테고리: ${runStats.categories.generated}/${runStats.categories.attempted} (${toRate(runStats.categories.generated, runStats.categories.attempted)}%)`);
    console.log(`   - 상품 상세: ${runStats.products.generated}/${runStats.products.attempted} (${toRate(runStats.products.generated, runStats.products.attempted)}%)`);
    console.log(`   - sitemap.xml: ${runStats.sitemap.generated ? "성공" : "실패"}`);
    console.log(`   - llms.txt 날짜 갱신: ${runStats.llms.updated ? "성공" : "실패"}`);

    if (runStats.categories.failed.length > 0) {
      console.warn(`   ⚠️  카테고리 실패 목록 (${runStats.categories.failed.length}): ${runStats.categories.failed.join(", ")}`);
    }
    if (runStats.products.failed.length > 0) {
      console.warn(`   ⚠️  상품 상세 실패 목록 (${runStats.products.failed.length}): ${runStats.products.failed.join(", ")}`);
    }
    if (runStats.sitemap.failed.length > 0) {
      console.warn(`   ⚠️  sitemap 실패 원인: ${runStats.sitemap.failed.join(", ")}`);
    }
    if (runStats.llms.failed.length > 0) {
      console.warn(`   ⚠️  llms 갱신 실패 원인: ${runStats.llms.failed.join(", ")}`);
    }
  } catch (error) {
    console.error("\n❌ Prerendering 실패:", error);
    process.exit(1);
  }
}

// 스크립트 실행
prerender();
