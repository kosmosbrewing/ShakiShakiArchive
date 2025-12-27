// src/stores/category.ts
// 카테고리 상태 관리 스토어 - 자주 변경되지 않는 데이터를 캐싱하여 API 호출 최소화

import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { fetchCategories } from "@/lib/api";

export interface Category {
  id: number;
  name: string;
  slug: string;
}

export const useCategoryStore = defineStore("category", () => {
  // 상태
  const categories = ref<Category[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const lastFetchedAt = ref<number | null>(null);

  // 캐시 유효 시간 (5분)
  const CACHE_DURATION = 5 * 60 * 1000;

  // 계산된 속성
  const hasCategories = computed(() => categories.value.length > 0);

  // 캐시가 유효한지 확인
  const isCacheValid = computed(() => {
    if (!lastFetchedAt.value) return false;
    return Date.now() - lastFetchedAt.value < CACHE_DURATION;
  });

  // Navbar용 라우트 목록 (ALL 포함)
  const categoryRoutes = computed(() => {
    const dynamicRoutes = categories.value.map((cat) => ({
      path: `/product/${cat.slug}`,
      label: cat.name.toUpperCase(),
    }));
    return [{ path: "/product/all", label: "ALL" }, ...dynamicRoutes];
  });

  // 카테고리 로드 (캐시 활용)
  async function loadCategories(forceRefresh = false) {
    // 캐시가 유효하고 강제 새로고침이 아니면 스킵
    if (!forceRefresh && isCacheValid.value && hasCategories.value) {
      return categories.value;
    }

    isLoading.value = true;
    error.value = null;

    try {
      const data = await fetchCategories();

      // ID 기준 오름차순 정렬
      data.sort((a: Category, b: Category) => (a.id || 0) - (b.id || 0));

      categories.value = data;
      lastFetchedAt.value = Date.now();
      return data;
    } catch (e: any) {
      error.value = e.message || "카테고리 로드 실패";
      console.error("카테고리 로드 실패:", e);
      throw e;
    } finally {
      isLoading.value = false;
    }
  }

  // ID로 카테고리 찾기
  function getCategoryById(id: number): Category | undefined {
    return categories.value.find((cat) => cat.id === id);
  }

  // 슬러그로 카테고리 찾기
  function getCategoryBySlug(slug: string): Category | undefined {
    return categories.value.find((cat) => cat.slug === slug);
  }

  // 캐시 초기화 (관리자가 카테고리 수정 시 호출)
  function invalidateCache() {
    lastFetchedAt.value = null;
  }

  return {
    // 상태
    categories,
    isLoading,
    error,

    // 계산된 속성
    hasCategories,
    isCacheValid,
    categoryRoutes,

    // 메서드
    loadCategories,
    getCategoryById,
    getCategoryBySlug,
    invalidateCache,
  };
});
