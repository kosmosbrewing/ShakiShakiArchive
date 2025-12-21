// src/composables/useAddressSearch.ts
// 주소 검색 관련 로직

import { ref, computed } from "vue";
import { searchAddress } from "@/lib/api";
import type { AddressSearchResult } from "@/types/api";

/**
 * 주소 검색 composable
 */
export function useAddressSearch() {
  const query = ref("");
  const results = ref<AddressSearchResult[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const page = ref(1);
  const totalCount = ref(0);
  const isEnd = ref(false);

  // 검색 결과 존재 여부
  const hasResults = computed(() => results.value.length > 0);

  // 검색어 존재 여부
  const hasQuery = computed(() => query.value.trim().length > 0);

  // 주소 검색 실행
  const search = async (searchQuery?: string) => {
    const q = searchQuery ?? query.value;

    if (!q.trim()) {
      error.value = "검색어를 입력해주세요.";
      return;
    }

    loading.value = true;
    error.value = null;
    page.value = 1;

    try {
      const response = await searchAddress(q, 1, 10);
      results.value = response.results;
      totalCount.value = response.totalCount;
      isEnd.value = response.isEnd;
    } catch (e: any) {
      error.value = e.message || "주소 검색에 실패했습니다.";
      results.value = [];
    } finally {
      loading.value = false;
    }
  };

  // 더 불러오기 (페이지네이션)
  const loadMore = async () => {
    if (isEnd.value || loading.value) return;

    loading.value = true;
    page.value += 1;

    try {
      const response = await searchAddress(query.value, page.value, 10);
      results.value = [...results.value, ...response.results];
      isEnd.value = response.isEnd;
    } catch (e: any) {
      error.value = e.message || "추가 로드에 실패했습니다.";
    } finally {
      loading.value = false;
    }
  };

  // 검색 초기화
  const reset = () => {
    query.value = "";
    results.value = [];
    loading.value = false;
    error.value = null;
    page.value = 1;
    totalCount.value = 0;
    isEnd.value = false;
  };

  return {
    query,
    results,
    loading,
    error,
    page,
    totalCount,
    isEnd,
    hasResults,
    hasQuery,
    search,
    loadMore,
    reset,
  };
}
