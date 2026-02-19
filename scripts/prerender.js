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
  if (!seoData) return;

  const metaTags = generateMetaTags(seoData);
  const html = injectMetaTags(template, metaTags);

  // index.html 덮어쓰기
  saveHtmlFile("index.html", html);
}

/**
 * 2. 카테고리별 페이지 Prerender
 */
async function prerenderCategories(template) {
  console.log("\n📄 카테고리 페이지 Prerendering...");

  try {
    // 백엔드에서 카테고리 목록 가져오기
    const { data: categories } = await axios.get(
      `${BACKEND_API}/api/categories`
    );
    console.log(`   📦 카테고리 ${categories.length}개 발견`);

    for (const category of categories) {
      // 모든 카테고리를 백엔드 API에서 가져오기
      const seoData = await fetchSeoData(`/api/seo/categories/${category.slug}`);
      if (!seoData) {
        console.warn(`   ⚠️  SEO 데이터 없음, 스킵: ${category.slug}`);
        continue;
      }

      const metaTags = generateMetaTags(seoData);
      const html = injectMetaTags(template, metaTags);

      saveHtmlFile(`product/${category.slug}.html`, html);
    }
  } catch (error) {
    console.error("   ❌ 카테고리 로드 실패:", error.message);
  }
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
 * 3. sitemap.xml 정적 파일 생성
 * - /api/products (id 포함) + /api/categories 데이터 사용
 * - URL 형식: /productDetail/{uuid}, /product/{slug}
 */
async function generateSitemap() {
  console.log("\n🗺️  sitemap.xml 생성 중...");

  try {
    const [productsRes, categoriesRes] = await Promise.all([
      axios.get(`${BACKEND_API}/api/products`),
      axios.get(`${BACKEND_API}/api/categories`),
    ]);

    const products = extractProducts(productsRes.data);
    const categories = Array.isArray(categoriesRes.data) ? categoriesRes.data : [];

    // XML 특수문자 이스케이프 (sitemap URL용)
    const escapeXml = (str) => String(str || "").replace(/&/g, "&amp;").replace(/'/g, "&apos;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    // ISO 날짜를 YYYY-MM-DD 형식으로 변환
    const toDateStr = (iso) => {
      try { return new Date(iso).toISOString().split("T")[0]; }
      catch { return new Date().toISOString().split("T")[0]; }
    };

    const today = toDateStr(new Date().toISOString());

    // 정적 페이지
    const staticPages = [
      { loc: `${SITE_URL}/`,        changefreq: "daily",   priority: "1.0", lastmod: today },
      { loc: `${SITE_URL}/faq`,     changefreq: "monthly", priority: "0.5", lastmod: today },
      { loc: `${SITE_URL}/privacy`, changefreq: "yearly",  priority: "0.3", lastmod: today },
      { loc: `${SITE_URL}/terms`,   changefreq: "yearly",  priority: "0.3", lastmod: today },
    ];

    // 카테고리 페이지
    const categoryPages = categories.map((c) => ({
      loc: `${SITE_URL}/product/${escapeXml(c.slug)}`,
      changefreq: "daily",
      priority: "0.8",
      lastmod: today,
    }));

    // 상품 상세 페이지 (UUID 기반 — 라우터 /productDetail/:id 와 일치)
    const productPages = products
      .filter((p) => p.id && p.isAvailable !== false)
      .map((p) => ({
        loc: `${SITE_URL}/productDetail/${escapeXml(p.id)}`,
        changefreq: "weekly",
        priority: "0.9",
        lastmod: toDateStr(p.updatedAt || p.createdAt),
      }));

    const allPages = [...staticPages, ...categoryPages, ...productPages];

    const xmlLines = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...allPages.map(
        (p) => `  <url>\n    <loc>${p.loc}</loc>\n    <lastmod>${p.lastmod}</lastmod>\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>`
      ),
      "</urlset>",
    ];

    const sitemapPath = path.join(DIST_DIR, "sitemap.xml");
    fs.writeFileSync(sitemapPath, xmlLines.join("\n"), "utf-8");
    console.log(`   ✅ 생성: sitemap.xml (총 ${allPages.length}개 URL)`);
    console.log(`      정적: ${staticPages.length}, 카테고리: ${categoryPages.length}, 상품: ${productPages.length}`);
  } catch (error) {
    console.error("   ❌ sitemap.xml 생성 실패:", error.message);
  }
}

/**
 * 4. 상품 상세 페이지 Prerender
 */
async function prerenderProducts(template) {
  console.log("\n📄 상품 상세 페이지 Prerendering...");

  try {
    // 백엔드에서 전체 상품 목록 가져오기
    // 실서버 응답: { products: [...], total: N } 형태이므로 extractProducts로 파싱
    const { data: rawData } = await axios.get(`${BACKEND_API}/api/products`);
    const products = extractProducts(rawData);
    console.log(`   📦 상품 ${products.length}개 발견`);

    // 상품이 너무 많으면 경고
    if (products.length > 100) {
      console.warn(
        `   ⚠️  상품이 ${products.length}개로 많습니다. 빌드 시간이 오래 걸릴 수 있습니다.`
      );
    }

    for (const product of products) {
      const seoData = await fetchSeoData(`/api/seo/products/${product.id}`);
      if (!seoData) continue;

      const metaTags = generateMetaTags(seoData);
      const html = injectMetaTags(template, metaTags);

      saveHtmlFile(`productDetail/${product.id}.html`, html);
    }
  } catch (error) {
    console.error("   ❌ 상품 목록 로드 실패:", error.message);
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
    // 1. 홈페이지
    await prerenderHome(template);

    // 2. 카테고리별
    await prerenderCategories(template);

    // 3. 상품 상세
    await prerenderProducts(template);

    // 4. sitemap.xml 생성 (HTML prerender 완료 후 실행)
    await generateSitemap();

    console.log("\n✨ Prerendering 완료!\n");
    console.log("📦 생성된 파일:");
    console.log("   - index.html (홈)");
    console.log("   - product/{category}.html (카테고리별)");
    console.log("   - productDetail/{id}.html (상품별)");
    console.log("   - sitemap.xml\n");
  } catch (error) {
    console.error("\n❌ Prerendering 실패:", error);
    process.exit(1);
  }
}

// 스크립트 실행
prerender();
