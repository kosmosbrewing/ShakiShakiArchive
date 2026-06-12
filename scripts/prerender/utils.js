// scripts/prerender/utils.js
// Prerender 공통 유틸리티 (이스케이프, 날짜, 응답 파싱, 파일 저장)

import fs from "fs";
import path from "path";
import { DIST_DIR } from "./config.js";

/**
 * XSS 방지를 위한 HTML 이스케이프
 */
export function escapeHtml(text) {
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
 * XML 특수문자 이스케이프 (sitemap URL용)
 */
export function escapeXml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/'/g, "&apos;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * YYYY-MM-DD 날짜 문자열 생성
 */
export function getTodayDateStr() {
  return new Date().toISOString().split("T")[0];
}

export function toSitemapDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().split("T")[0];
}

export function getProductLastmod(product) {
  return toSitemapDate(product?.updatedAt || product?.createdAt);
}

export function getLatestProductLastmod(products) {
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
 * API 응답에서 상품 배열 추출
 * 실서버 응답이 { products: [...] } 형태이므로 양쪽 모두 처리
 */
export function extractProducts(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.products)) return data.products;
  return [];
}

/**
 * API 응답에서 카테고리 배열 추출
 */
export function extractCategories(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.categories)) return data.categories;
  return [];
}

/**
 * 가격 문자열("39000.00") → "39,000" 표기
 */
export function formatKrw(price) {
  const parsed = Math.round(parseFloat(String(price ?? "0")));
  return Number.isFinite(parsed) ? parsed.toLocaleString("ko-KR") : "0";
}

/**
 * HTML 파일 저장
 */
export function saveHtmlFile(relativePath, html) {
  const fullPath = path.join(DIST_DIR, relativePath);
  const dir = path.dirname(fullPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(fullPath, html, "utf-8");
  console.log(`   ✅ 생성: ${relativePath}`);
}
