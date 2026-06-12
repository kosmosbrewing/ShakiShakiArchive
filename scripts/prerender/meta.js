// scripts/prerender/meta.js
// 메타 태그 생성/주입 + #app 본문 주입 공통 헬퍼

import { escapeHtml } from "./utils.js";

const APP_CONTAINER_REGEX = /<div\s+id=["']app["'][^>]*>\s*<\/div>/i;

/**
 * SEO 데이터를 HTML 메타 태그로 변환
 */
export function generateMetaTags(seoData) {
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
 * HTML에 메타 태그 주입
 */
export function injectMetaTags(html, metaTags) {
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
 * #app 컨테이너에 정적 본문 주입 (JS 미실행 크롤러용)
 * Vue 마운트 시 교체되므로 사용자 경험에는 영향 없음
 */
export function injectAppBody(html, bodyHtml, label = "본문") {
  if (!bodyHtml) {
    console.warn(`   ⚠️  ${label} 생성 실패: 주입할 내용이 없습니다.`);
    return html;
  }

  if (!APP_CONTAINER_REGEX.test(html)) {
    console.warn(`   ⚠️  ${label} 주입 실패: #app 컨테이너를 찾지 못했습니다.`);
    return html;
  }

  return html.replace(APP_CONTAINER_REGEX, `<div id="app">${bodyHtml}</div>`);
}

/**
 * jsonLd 배열/단일 객체를 배열로 정규화
 */
export function toJsonLdList(seoData) {
  return Array.isArray(seoData?.jsonLd)
    ? seoData.jsonLd
    : seoData?.jsonLd
      ? [seoData.jsonLd]
      : [];
}
