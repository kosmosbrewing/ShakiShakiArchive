// scripts/prerender/api.js
// 백엔드 API 호출 (SEO 데이터, 상품/카테고리 수집)

import axios from "axios";
import { BACKEND_API } from "./config.js";
import { extractProducts, extractCategories } from "./utils.js";

/**
 * SEO 데이터 가져오기
 */
export async function fetchSeoData(endpoint) {
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
 * 전체 상품 목록 페이지네이션으로 수집
 * 백엔드 기본 limit=40, 최대 limit=100 → 상품이 41개 이상이면 여러 페이지 순회
 */
export async function fetchAllProducts() {
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
 * 카테고리 목록 가져오기
 */
export async function fetchCategories() {
  const { data } = await axios.get(`${BACKEND_API}/api/categories`);
  return extractCategories(data);
}
