// src/stores/wishlist.ts
// 위시리스트 상태 관리 스토어 - 로그인 사용자의 위시리스트를 중앙에서 관리

import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { useAuthStore } from "./auth";
import {
  fetchWishlist,
  addToWishlist,
  removeFromWishlist,
} from "@/lib/api";
import type { WishlistItem } from "@/types/api";

export const useWishlistStore = defineStore("wishlist", () => {
  const authStore = useAuthStore();

  // 상태
  const items = ref<WishlistItem[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const lastFetchedAt = ref<number | null>(null);

  // 캐시 유효 시간 (1분)
  const CACHE_DURATION = 60 * 1000;

  // 계산된 속성
  const itemCount = computed(() => items.value.length);
  const isEmpty = computed(() => items.value.length === 0);

  // 위시리스트에 있는 상품 ID Set (빠른 조회용)
  const productIdSet = computed(() => {
    return new Set(items.value.map((item) => item.productId));
  });

  // 캐시 유효 확인
  const isCacheValid = computed(() => {
    if (!lastFetchedAt.value) return false;
    return Date.now() - lastFetchedAt.value < CACHE_DURATION;
  });

  // 특정 상품이 위시리스트에 있는지 확인
  function isInWishlist(productId: string): boolean {
    return productIdSet.value.has(productId);
  }

  // 위시리스트 로드
  async function loadWishlist(forceRefresh = false) {
    // 비로그인 상태면 빈 배열 반환
    if (!authStore.isAuthenticated) {
      items.value = [];
      return items.value;
    }

    // 캐시가 유효하고 강제 새로고침이 아니면 스킵
    if (!forceRefresh && isCacheValid.value) {
      return items.value;
    }

    isLoading.value = true;
    error.value = null;

    try {
      const data = await fetchWishlist();
      items.value = data;
      lastFetchedAt.value = Date.now();
      return data;
    } catch (e: any) {
      error.value = "위시리스트 로드 실패";
      console.error("위시리스트 로드 실패:", e);
      throw e;
    } finally {
      isLoading.value = false;
    }
  }

  // 위시리스트에 추가
  async function addItem(productId: string) {
    if (!authStore.isAuthenticated) {
      return false;
    }

    try {
      await addToWishlist(productId);

      // 캐시 무효화 후 새로 로드하여 정확한 데이터 유지
      invalidateCache();
      await loadWishlist(true);

      return true;
    } catch (e) {
      console.error("위시리스트 추가 실패:", e);
      return false;
    }
  }

  // 위시리스트에서 삭제
  async function removeItem(productId: string) {
    if (!authStore.isAuthenticated) {
      return false;
    }

    try {
      await removeFromWishlist(productId);

      // 로컬 상태 업데이트
      items.value = items.value.filter((item) => item.productId !== productId);
      return true;
    } catch (e) {
      console.error("위시리스트 삭제 실패:", e);
      return false;
    }
  }

  // 토글 (추가/삭제)
  async function toggleItem(productId: string): Promise<boolean> {
    if (isInWishlist(productId)) {
      return await removeItem(productId);
    } else {
      return await addItem(productId);
    }
  }

  // 캐시 초기화
  function invalidateCache() {
    lastFetchedAt.value = null;
  }

  // 로그아웃 시 상태 초기화
  function clearWishlist() {
    items.value = [];
    lastFetchedAt.value = null;
  }

  return {
    // 상태
    items,
    isLoading,
    error,

    // 계산된 속성
    itemCount,
    isEmpty,
    productIdSet,
    isCacheValid,

    // 메서드
    isInWishlist,
    loadWishlist,
    addItem,
    removeItem,
    toggleItem,
    invalidateCache,
    clearWishlist,
  };
});
