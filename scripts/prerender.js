// scripts/prerender.js
// Prerendering: 빌드 시점에 정적 HTML 파일 생성

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ES module에서 __dirname 대체
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 백엔드 API URL (환경변수 또는 기본값)
const BACKEND_API = process.env.VITE_API_URL || 'http://localhost:8080';
const DIST_DIR = path.join(__dirname, '../dist');
const INDEX_PATH = path.join(DIST_DIR, 'index.html');

/**
 * XSS 방지를 위한 HTML 이스케이프
 */
function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

/**
 * SEO 데이터를 HTML 메타 태그로 변환
 */
function generateMetaTags(seoData) {
  if (!seoData || !seoData.openGraph) {
    console.warn('⚠️  SEO 데이터가 없습니다.');
    return '';
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
    ${og.image ? `<meta property="og:image" content="${escapeHtml(og.image)}">` : ''}

    <!-- Twitter Card -->
    <meta name="twitter:card" content="${escapeHtml(og.twitter.card)}">
    <meta name="twitter:title" content="${escapeHtml(og.twitter.title)}">
    <meta name="twitter:description" content="${escapeHtml(og.twitter.description)}">
    ${og.twitter.image ? `<meta name="twitter:image" content="${escapeHtml(og.twitter.image)}">` : ''}
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
  return html.replace('</head>', `${metaTags}\n  </head>`);
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
  fs.writeFileSync(fullPath, html, 'utf-8');
  console.log(`   ✅ 생성: ${relativePath}`);
}

/**
 * 1. 홈페이지 Prerender
 */
async function prerenderHome(template) {
  console.log('\n📄 홈페이지 Prerendering...');

  const seoData = await fetchSeoData('/api/seo/home');
  if (!seoData) return;

  const metaTags = generateMetaTags(seoData);
  const html = injectMetaTags(template, metaTags);

  // index.html 덮어쓰기
  saveHtmlFile('index.html', html);
}

/**
 * 2. 상품 목록 페이지 Prerender
 */
async function prerenderProductList(template) {
  console.log('\n📄 상품 목록 페이지 Prerendering...');

  // 전체 상품 목록 - 하드코딩된 SEO 데이터 사용
  const seoData = {
    openGraph: {
      title: 'TOP | 샤키샤키 아카이브',
      description: '샤키샤키가 엄선한 감도 높은 빈티지 컬렉션',
      url: 'https://shakishaki.kr/product/all',
      type: 'website',
      siteName: '샤키샤키 아카이브',
      locale: 'ko_KR',
      image: '',
      twitter: {
        card: 'summary_large_image',
        title: 'TOP | 샤키샤키 아카이브',
        description: '샤키샤키가 엄선한 감도 높은 빈티지 컬렉션',
        image: ''
      }
    }
  };

  const metaTags = generateMetaTags(seoData);
  const html = injectMetaTags(template, metaTags);

  saveHtmlFile('product/all.html', html);
}

/**
 * 3. 카테고리별 페이지 Prerender
 */
async function prerenderCategories(template) {
  console.log('\n📄 카테고리 페이지 Prerendering...');

  try {
    // 백엔드에서 카테고리 목록 가져오기
    const { data: categories } = await axios.get(`${BACKEND_API}/api/categories`);
    console.log(`   📦 카테고리 ${categories.length}개 발견`);

    for (const category of categories) {
      let seoData;

      // TOP 카테고리는 하드코딩된 SEO 데이터 사용
      if (category.slug.toLowerCase() === 'top') {
        seoData = {
          openGraph: {
            title: 'TOP | 샤키샤키 아카이브',
            description: '샤키샤키가 엄선한 감도 높은 빈티지 컬렉션',
            url: `https://shakishaki.kr/product/${category.slug}`,
            type: 'website',
            siteName: '샤키샤키 아카이브',
            locale: 'ko_KR',
            image: '',
            twitter: {
              card: 'summary_large_image',
              title: 'TOP | 샤키샤키 아카이브',
              description: '샤키샤키가 엄선한 감도 높은 빈티지 컬렉션',
              image: ''
            }
          }
        };
      } else {
        // 다른 카테고리는 API에서 가져오기
        seoData = await fetchSeoData(`/api/seo/categories/${category.slug}`);
        if (!seoData) continue;
      }

      const metaTags = generateMetaTags(seoData);
      const html = injectMetaTags(template, metaTags);

      saveHtmlFile(`product/${category.slug}.html`, html);
    }
  } catch (error) {
    console.error('   ❌ 카테고리 로드 실패:', error.message);
  }
}

/**
 * 4. 상품 상세 페이지 Prerender
 */
async function prerenderProducts(template) {
  console.log('\n📄 상품 상세 페이지 Prerendering...');

  try {
    // 백엔드에서 전체 상품 목록 가져오기
    const { data: products } = await axios.get(`${BACKEND_API}/api/products`);
    console.log(`   📦 상품 ${products.length}개 발견`);

    // 상품이 너무 많으면 경고
    if (products.length > 100) {
      console.warn(`   ⚠️  상품이 ${products.length}개로 많습니다. 빌드 시간이 오래 걸릴 수 있습니다.`);
    }

    for (const product of products) {
      const seoData = await fetchSeoData(`/api/seo/products/${product.id}`);
      if (!seoData) continue;

      const metaTags = generateMetaTags(seoData);
      const html = injectMetaTags(template, metaTags);

      saveHtmlFile(`productDetail/${product.id}.html`, html);
    }
  } catch (error) {
    console.error('   ❌ 상품 목록 로드 실패:', error.message);
  }
}

/**
 * 메인 Prerender 함수
 */
async function prerender() {
  console.log('🚀 Prerendering 시작...\n');
  console.log(`📍 Backend API: ${BACKEND_API}`);
  console.log(`📍 Dist 디렉토리: ${DIST_DIR}\n`);

  // dist/index.html이 있는지 확인
  if (!fs.existsSync(INDEX_PATH)) {
    console.error('❌ dist/index.html 파일이 없습니다!');
    console.error('   먼저 "npm run build"를 실행하세요.');
    process.exit(1);
  }

  // 템플릿 로드
  const template = fs.readFileSync(INDEX_PATH, 'utf-8');
  console.log('✅ 템플릿 로드 완료');

  try {
    // 1. 홈페이지
    await prerenderHome(template);

    // 2. 상품 목록
    await prerenderProductList(template);

    // 3. 카테고리별
    await prerenderCategories(template);

    // 4. 상품 상세
    await prerenderProducts(template);

    console.log('\n✨ Prerendering 완료!\n');
    console.log('📦 생성된 파일:');
    console.log('   - index.html (홈)');
    console.log('   - product/all.html (전체 상품)');
    console.log('   - product/{category}.html (카테고리별)');
    console.log('   - productDetail/{id}.html (상품별)\n');
  } catch (error) {
    console.error('\n❌ Prerendering 실패:', error);
    process.exit(1);
  }
}

// 스크립트 실행
prerender();
