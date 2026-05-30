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
const POLICY_LASTMOD = "2026-01-27";

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

  const ogTags = `
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

  // JSON-LD 구조화 데이터 주입 (단일 객체 또는 배열 모두 처리)
  // seoData.jsonLd가 없으면 ogTags만 반환
  const jsonLdList = Array.isArray(seoData.jsonLd)
    ? seoData.jsonLd
    : seoData.jsonLd
      ? [seoData.jsonLd]
      : [];

  if (jsonLdList.length === 0) return ogTags;

  const jsonLdTags = jsonLdList
    .map((ld) => {
      // </script> 이스케이프: 데이터에 해당 문자열이 포함되면 script 태그가 조기 종료될 수 있음
      // <\/ 는 JSON 파서가 동일하게 처리하므로 의미 변경 없음
      const json = JSON.stringify(ld, null, 2)
        .replace(/\n/g, "\n    ")
        .replace(/<\//g, "<\\/");
      return `<script type="application/ld+json">\n    ${json}\n    </script>`;
    })
    .join("\n    ");

  return `${ogTags}\n\n    <!-- JSON-LD 구조화 데이터 (리치 스니펫) -->\n    ${jsonLdTags}`;
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
  // 기존 <title> 태그 제거: prerendered title이 문서 내 유일한 title이 되도록
  // [\s\S]*? 사용으로 멀티라인 title도 안전하게 처리
  const htmlWithoutTitle = html.replace(/<title>[\s\S]*?<\/title>/, "");

  // <!-- 기본 제목 --> 단독 앵커 사용: 이 마커는 SEO 주입 위치를 명시하기 위해 존재
  // 두 번째 앵커 없이 단독으로 사용하여 다른 주석 변경에 영향받지 않음
  const ANCHOR = "<!-- 기본 제목 -->";
  if (htmlWithoutTitle.includes(ANCHOR)) {
    return htmlWithoutTitle.replace(ANCHOR, `${ANCHOR}\n    ${metaTags}`);
  }

  // Fallback: </head> 직전에 삽입
  return htmlWithoutTitle.replace("</head>", `  ${metaTags}\n  </head>`);
}

/**
 * FAQ JSON-LD 엔트리 추출
 */
function extractFaqEntries(seoData) {
  const jsonLdList = Array.isArray(seoData?.jsonLd)
    ? seoData.jsonLd
    : seoData?.jsonLd
      ? [seoData.jsonLd]
      : [];

  const faqPage = jsonLdList.find((node) => node?.["@type"] === "FAQPage");
  const entities = Array.isArray(faqPage?.mainEntity) ? faqPage.mainEntity : [];

  return entities
    .map((item) => ({
      question: String(item?.name || "").trim(),
      answer: String(item?.acceptedAnswer?.text || "").trim(),
    }))
    .filter((item) => item.question && item.answer);
}

/**
 * FAQ 본문 HTML 생성 (JS 미실행 크롤러용 정적 콘텐츠)
 */
function generateFaqBodyHtml(seoData) {
  const faqEntries = extractFaqEntries(seoData);
  if (faqEntries.length === 0) return "";

  // 인덱스 기반 ID 배열: FAQ.vue의 FAQ_ANCHORS, seo.ts의 FAQ_ENTRIES와 순서 동기화
  // 질문 텍스트가 아닌 순서로 매핑하므로 질문 문구 변경 시에도 앵커 ID가 유지됨
  const FAQ_ANCHOR_IDS = [
    "faq-shipping-fee",
    "faq-shipping-time",
    "faq-return-refund",
    "faq-return-shipping-fee",
    "faq-address-change",
    "faq-refund-time",
  ];

  const itemsHtml = faqEntries
    .map((item, index) => {
      const id = FAQ_ANCHOR_IDS[index] || `faq-item-${String(index + 1)}`;
      const answerHtml = escapeHtml(item.answer).replace(/\n/g, "<br>");

      return `
        <article id="${escapeHtml(id)}" class="border-b border-border py-4">
          <h4 class="text-body font-semibold mb-2">${escapeHtml(item.question)}</h4>
          <p class="text-body text-muted-foreground whitespace-pre-line">${answerHtml}</p>
        </article>
      `.trim();
    })
    .join("\n");

  return `
    <main class="max-w-2xl mx-auto px-4 py-12 sm:py-16">
      <section class="mb-16" aria-labelledby="faq-title">
        <div class="text-center mb-8">
          <h2 id="faq-title" class="text-heading text-primary mb-2 tracking-wider">FAQ</h2>
          <h3 class="text-heading">자주 묻는 질문</h3>
        </div>

        <div class="w-full">
          ${itemsHtml}
        </div>

        <p class="text-center pt-4 text-muted-foreground">
          찾으시는 답변이 없으신가요?
          <a href="/inquiry" class="text-primary hover:underline font-medium">문의 내역 보기</a>
        </p>
      </section>
    </main>
  `.trim();
}

/**
 * FAQ 페이지 body(#app)에 정적 FAQ 콘텐츠 주입
 */
function injectFaqBodyHtml(html, seoData) {
  const faqBodyHtml = generateFaqBodyHtml(seoData);
  if (!faqBodyHtml) {
    console.warn("   ⚠️  FAQ 본문 생성 실패: mainEntity가 비어 있습니다.");
    return html;
  }

  const APP_CONTAINER_REGEX = /<div\s+id=["']app["'][^>]*>\s*<\/div>/i;
  if (!APP_CONTAINER_REGEX.test(html)) {
    console.warn("   ⚠️  FAQ 본문 주입 실패: #app 컨테이너를 찾지 못했습니다.");
    return html;
  }

  return html.replace(
    APP_CONTAINER_REGEX,
    `<div id="app">${faqBodyHtml}</div>`
  );
}

const STATIC_POLICY_PAGES = {
  terms: {
    title: "이용약관",
    lastmod: POLICY_LASTMOD,
    description:
      "샤키샤키 아카이브의 서비스 이용, 주문, 결제, 배송, 환불 및 청약철회 기준을 안내합니다.",
    body: `
      <section class="space-y-8">
        <div>
          <h2 class="text-2xl font-bold mb-4">이용약관</h2>
          <p class="text-body text-muted-foreground">시행일자: 2026년 1월 27일</p>
        </div>

        <section>
          <h3 class="text-xl font-semibold mb-3">사업자 정보</h3>
          <ul class="list-disc pl-6 space-y-2 text-body">
            <li>상호: 샤키샤키 아카이브</li>
            <li>대표자: 손유진</li>
            <li>주소: 경상남도 밀양시 부북면 덕곡2길 203-28</li>
            <li>사업자등록번호: 157-18-02463</li>
            <li>통신판매업 신고번호: 2025-경남밀양-210호</li>
            <li>연락처: 010-7347-4088 / 381611sug@naver.com</li>
          </ul>
        </section>

        <section>
          <h3 class="text-xl font-semibold mb-3">주문 및 결제</h3>
          <p class="text-body leading-relaxed">
            이용자는 상품 상세 정보, 가격, 배송비, 결제 금액을 확인한 뒤 구매를 신청합니다.
            결제 완료 후 주문이 접수되며, 상품 품절 또는 결제 오류 등 정상 이행이 어려운 경우 안내 후 취소 또는 환불 처리됩니다.
          </p>
        </section>

        <section>
          <h3 class="text-xl font-semibold mb-3">배송</h3>
          <p class="text-body leading-relaxed">
            기본 배송비는 3,500원이며, 70,000원 이상 구매 시 무료배송입니다.
            제주 및 도서산간 지역은 추가 배송비 2,500원이 발생할 수 있습니다.
            결제 완료 후 최대 7일 이내 발송되며 지역 및 택배사 사정에 따라 추가 시간이 소요될 수 있습니다.
          </p>
        </section>

        <section>
          <h3 class="text-xl font-semibold mb-3">반품 및 환불</h3>
          <p class="text-body leading-relaxed">
            상품 수령 후 7일 이내 반품 신청이 가능하며, 반품 신청 후 14일 이내 상품이 도착해야 환불 처리가 가능합니다.
            단순 변심 반품 시 배송비는 고객 부담이며, 상품 불량 또는 오배송의 경우 판매자가 배송비를 부담합니다.
            상품 훼손, 라벨 제거, 세탁, 착용 흔적이 있는 경우 반품 및 환불이 제한될 수 있습니다.
          </p>
        </section>
      </section>
    `,
  },
  privacy: {
    title: "개인정보 처리방침",
    lastmod: POLICY_LASTMOD,
    description:
      "샤키샤키 아카이브의 개인정보 수집, 이용, 보관, 제3자 제공 및 개인정보 보호책임자 정보를 안내합니다.",
    body: `
      <section class="space-y-8">
        <div>
          <h2 class="text-2xl font-bold mb-4">개인정보 처리방침</h2>
          <p class="text-body text-muted-foreground">시행일자: 2026년 1월 27일</p>
        </div>

        <section>
          <h3 class="text-xl font-semibold mb-3">개인정보 수집 및 이용</h3>
          <ul class="list-disc pl-6 space-y-2 text-body">
            <li>회원가입 및 관리: 이메일, 비밀번호, 닉네임, 소셜 계정 정보</li>
            <li>상품 주문 및 배송: 수령인명, 배송지 주소, 연락처, 결제 정보</li>
            <li>서비스 개선 및 보안: IP 주소, 쿠키, 서비스 이용 기록</li>
          </ul>
        </section>

        <section>
          <h3 class="text-xl font-semibold mb-3">보유 기간</h3>
          <ul class="list-disc pl-6 space-y-2 text-body">
            <li>회원 정보: 회원 탈퇴 시까지</li>
            <li>주문 및 결제 기록: 전자상거래법에 따라 5년</li>
            <li>소비자 불만 및 분쟁 처리 기록: 3년</li>
            <li>접속 기록: 통신비밀보호법에 따라 3개월</li>
          </ul>
        </section>

        <section>
          <h3 class="text-xl font-semibold mb-3">제3자 제공</h3>
          <p class="text-body leading-relaxed">
            상품 배송을 위해 배송업체에 수령인명, 주소, 연락처를 제공할 수 있으며,
            사이트 이용 통계 분석을 위해 Google Analytics 4를 사용할 수 있습니다.
            위 경우를 제외하고는 고객 동의 없이 개인정보를 제3자에게 제공하지 않습니다.
          </p>
        </section>

        <section>
          <h3 class="text-xl font-semibold mb-3">개인정보 보호책임자</h3>
          <ul class="list-disc pl-6 space-y-2 text-body">
            <li>성명: 손유진</li>
            <li>연락처: 010-7347-4088</li>
            <li>이메일: 381611sug@naver.com</li>
            <li>주소: 경상남도 밀양시 부북면 덕곡2길 203-28</li>
          </ul>
        </section>
      </section>
    `,
  },
};

function injectStaticBodyHtml(html, pageKey) {
  const page = STATIC_POLICY_PAGES[pageKey];
  if (!page) return html;

  const canonicalUrl = `${SITE_URL}/${pageKey}`;
  const metaTags = `
    <title>${escapeHtml(page.title)} | 샤키샤키 아카이브</title>
    <meta name="description" content="${escapeHtml(page.description)}">
    <link rel="canonical" href="${escapeHtml(canonicalUrl)}">
    <meta property="og:title" content="${escapeHtml(page.title)} | 샤키샤키 아카이브">
    <meta property="og:description" content="${escapeHtml(page.description)}">
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="샤키샤키 아카이브">
    <meta property="og:locale" content="ko_KR">
    <meta name="twitter:card" content="summary">
    <meta name="twitter:title" content="${escapeHtml(page.title)} | 샤키샤키 아카이브">
    <meta name="twitter:description" content="${escapeHtml(page.description)}">
  `.trim();

  const htmlWithMeta = injectMetaTags(html, metaTags);
  const bodyHtml = `
    <main class="max-w-4xl mx-auto px-4 py-12 sm:py-16">
      ${page.body}
    </main>
  `.trim();

  const APP_CONTAINER_REGEX = /<div\s+id=["']app["'][^>]*>\s*<\/div>/i;
  if (!APP_CONTAINER_REGEX.test(htmlWithMeta)) {
    console.warn(`   ⚠️  ${pageKey} 본문 주입 실패: #app 컨테이너를 찾지 못했습니다.`);
    return htmlWithMeta;
  }

  return htmlWithMeta.replace(APP_CONTAINER_REGEX, `<div id="app">${bodyHtml}</div>`);
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
 * 1-1. FAQ 페이지 Prerender
 */
async function prerenderFaq(template) {
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
async function prerenderStaticPolicies(template) {
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

function toSitemapDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().split("T")[0];
}

function getProductLastmod(product) {
  return toSitemapDate(product?.updatedAt || product?.createdAt);
}

function getLatestProductLastmod(products) {
  const latestTime = products.reduce((latest, product) => {
    const value = product?.updatedAt || product?.createdAt;
    if (!value) return latest;
    const time = new Date(value).getTime();
    if (Number.isNaN(time)) return latest;
    return Math.max(latest, time);
  }, 0);

  return latestTime > 0 ? toSitemapDate(latestTime) : null;
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
 * - URL 형식: /productDetail/{slug}, /product/{slug}
 * - Google이 무시하는 priority/changefreq는 제외
 * - lastmod는 신뢰 가능한 변경일이 있는 URL에만 포함
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

    const visibleProducts = products.filter((p) => p.id && p.isAvailable !== false);
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
        lastmod: getLatestProductLastmod(productsByCategoryId.get(String(c.id)) || []),
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
      ...allPages.map(
        (p) => {
          const lastmodTag = p.lastmod
            ? `\n    <lastmod>${escapeXml(p.lastmod)}</lastmod>`
            : "";
          const imageTag = p.imageUrl
            ? `\n    <image:image>\n      <image:loc>${escapeXml(p.imageUrl)}</image:loc>\n    </image:image>`
            : "";
          return `  <url>\n    <loc>${escapeXml(p.loc)}</loc>${lastmodTag}${imageTag}\n  </url>`;
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
    throw error;
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
      faq: { attempted: 0, generated: 0, failed: [] },
      staticPolicies: { attempted: 0, generated: 0, failed: [] },
      categories: { attempted: 0, generated: 0, failed: [] },
      products: { attempted: 0, generated: 0, failed: [] },
      sitemap: { generated: false, failed: [] },
      llms: { updated: false, failed: [] },
    };

    // 1. 홈페이지
    runStats.home = await prerenderHome(template);

    // 1-1. FAQ
    runStats.faq = await prerenderFaq(template);

    // 1-2. 약관/개인정보
    runStats.staticPolicies = await prerenderStaticPolicies(template);

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
    console.log("   - faq.html (FAQ)");
    console.log("   - terms.html / privacy.html (정책)");
    console.log("   - product/{category}.html (카테고리별)");
    console.log("   - productDetail/{id}.html (상품별)");
    console.log("   - sitemap.xml\n");
    console.log("📊 Prerender 요약:");
    console.log(`   - 홈: ${runStats.home.generated}/${runStats.home.attempted} (${toRate(runStats.home.generated, runStats.home.attempted)}%)`);
    console.log(`   - FAQ: ${runStats.faq.generated}/${runStats.faq.attempted} (${toRate(runStats.faq.generated, runStats.faq.attempted)}%)`);
    console.log(`   - 정책: ${runStats.staticPolicies.generated}/${runStats.staticPolicies.attempted} (${toRate(runStats.staticPolicies.generated, runStats.staticPolicies.attempted)}%)`);
    console.log(`   - 카테고리: ${runStats.categories.generated}/${runStats.categories.attempted} (${toRate(runStats.categories.generated, runStats.categories.attempted)}%)`);
    console.log(`   - 상품 상세: ${runStats.products.generated}/${runStats.products.attempted} (${toRate(runStats.products.generated, runStats.products.attempted)}%)`);
    console.log(`   - sitemap.xml: ${runStats.sitemap.generated ? "성공" : "실패"}`);
    console.log(`   - llms.txt 날짜 갱신: ${runStats.llms.updated ? "성공" : "실패"}`);

    if (runStats.categories.failed.length > 0) {
      console.warn(`   ⚠️  카테고리 실패 목록 (${runStats.categories.failed.length}): ${runStats.categories.failed.join(", ")}`);
    }
    if (runStats.faq.failed.length > 0) {
      console.warn(`   ⚠️  FAQ 실패 목록 (${runStats.faq.failed.length}): ${runStats.faq.failed.join(", ")}`);
    }
    if (runStats.staticPolicies.failed.length > 0) {
      console.warn(`   ⚠️  정책 페이지 실패 목록 (${runStats.staticPolicies.failed.length}): ${runStats.staticPolicies.failed.join(", ")}`);
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
