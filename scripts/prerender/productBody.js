// scripts/prerender/productBody.js
// 상품 상세/카테고리 페이지 정적 본문 생성 (JS 미실행 크롤러 + AI 크롤러용)
//
// 배경: 프리렌더 HTML에 meta/JSON-LD만 있고 #app이 비어 있으면
// 네이버 예티, 일부 AI 크롤러가 텍스트 콘텐츠를 전혀 보지 못해
// "얇은 콘텐츠(thin content)"로 색인에서 제외될 수 있음.
// JSON-LD 데이터에서 본문 HTML을 생성해 #app에 주입한다.
// Vue 마운트 시 교체되므로 사용자 경험에는 영향 없음.

import { escapeHtml, formatKrw } from "./utils.js";
import { injectAppBody, toJsonLdList } from "./meta.js";

/**
 * JSON-LD에서 Product 노드 추출
 */
function findProductNode(seoData) {
  return toJsonLdList(seoData).find((node) => node?.["@type"] === "Product");
}

/**
 * JSON-LD에서 BreadcrumbList 노드 추출
 */
function findBreadcrumbNode(seoData) {
  return toJsonLdList(seoData).find(
    (node) => node?.["@type"] === "BreadcrumbList"
  );
}

/**
 * 브레드크럼 내비게이션 HTML (마지막 항목은 현재 페이지이므로 링크 제외)
 */
function generateBreadcrumbHtml(seoData) {
  const breadcrumb = findBreadcrumbNode(seoData);
  const items = Array.isArray(breadcrumb?.itemListElement)
    ? breadcrumb.itemListElement
    : [];
  if (items.length === 0) return "";

  const links = items
    .map((item, index) => {
      const name = escapeHtml(item?.name);
      const url = escapeHtml(item?.item);
      const isLast = index === items.length - 1;
      return isLast || !url
        ? `<span aria-current="page">${name}</span>`
        : `<a href="${url}" class="hover:underline">${name}</a>`;
    })
    .join(" &rsaquo; ");

  return `<nav aria-label="브레드크럼" class="text-caption text-muted-foreground mb-4">${links}</nav>`;
}

/**
 * 상품 상세 본문 HTML 생성
 */
function generateProductBodyHtml(seoData) {
  const product = findProductNode(seoData);
  if (!product?.name) return "";

  const offers = product.offers || {};
  const inStock = String(offers.availability || "").includes("InStock");
  const price = formatKrw(offers.price);
  const primaryImage = Array.isArray(product.image) ? product.image[0] : "";
  const description = String(product.description || "").trim();

  return `
    <main class="max-w-4xl mx-auto px-4 py-12 sm:py-16">
      ${generateBreadcrumbHtml(seoData)}
      <article>
        <h1 class="text-heading font-semibold mb-2">${escapeHtml(product.name)}</h1>
        <p class="text-body text-muted-foreground mb-4">
          ${price}원 · ${inStock ? "판매중" : "품절"} · 빈티지(중고) 단일 수량
          ${product.category ? ` · ${escapeHtml(product.category)}` : ""}
        </p>
        ${
          primaryImage
            ? `<img src="${escapeHtml(primaryImage)}" alt="${escapeHtml(product.name)}" width="600" loading="lazy" class="mb-6">`
            : ""
        }
        ${
          description
            ? `<section><h2 class="text-body font-semibold mb-2">상품 설명</h2><p class="text-body whitespace-pre-line">${escapeHtml(description).replace(/\n/g, "<br>")}</p></section>`
            : ""
        }
      </article>
    </main>
  `.trim();
}

/**
 * 카테고리 본문 HTML 생성 (ItemList 기반 상품 링크 목록 — 내부 링크 강화)
 */
function generateCategoryBodyHtml(seoData) {
  const itemList = toJsonLdList(seoData).find(
    (node) => node?.["@type"] === "ItemList"
  );
  const items = Array.isArray(itemList?.itemListElement)
    ? itemList.itemListElement
    : [];

  const title = String(itemList?.name || seoData?.openGraph?.title || "").trim();
  if (!title) return "";

  const listHtml = items
    .filter((item) => item?.url && item?.name)
    .map(
      (item) =>
        `<li><a href="${escapeHtml(item.url)}" class="hover:underline">${escapeHtml(item.name)}</a></li>`
    )
    .join("\n          ");

  return `
    <main class="max-w-4xl mx-auto px-4 py-12 sm:py-16">
      <h1 class="text-heading font-semibold mb-2">${escapeHtml(title)} 빈티지 컬렉션</h1>
      <p class="text-body text-muted-foreground mb-6">${escapeHtml(seoData?.openGraph?.description || "")}</p>
      ${listHtml ? `<ul class="space-y-2 text-body">\n          ${listHtml}\n        </ul>` : ""}
    </main>
  `.trim();
}

/**
 * 상품 상세 페이지 body(#app)에 정적 본문 주입
 */
export function injectProductBodyHtml(html, seoData) {
  return injectAppBody(html, generateProductBodyHtml(seoData), "상품 본문");
}

/**
 * 카테고리 페이지 body(#app)에 정적 본문 주입
 */
export function injectCategoryBodyHtml(html, seoData) {
  return injectAppBody(html, generateCategoryBodyHtml(seoData), "카테고리 본문");
}
