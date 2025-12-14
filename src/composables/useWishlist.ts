// src/composables/useWishlist.ts
// 위시리스트 관련 로직

import { ref, computed, onMounted, type Ref } from "vue";
import { fetchWishlist, addToWishlist, removeFromWishlist } from "@/lib/api";
import type { WishlistItem } from "@/types/api";

/**
 * 위시리스트 CRUD
 */
export function useWishlist() {
  const wishlistItems = ref<WishlistItem[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // 위시리스트 개수
  const itemCount = computed(() => wishlistItems.value.length);

  // 빈 상태 확인
  const isEmpty = computed(() => wishlistItems.value.length === 0);

  // 위시리스트 로드
  const loadWishlist = async () => {
    loading.value = true;
    error.value = null;
    try {
      const data = await fetchWishlist();
      wishlistItems.value = data;
    } catch (e) {
      error.value = "위시리스트 로드 실패";
      console.error("위시리스트 로드 실패:", e);
    } finally {
      loading.value = false;
    }
  };

  // 위시리스트에 추가
  const addItem = async (productId: number) => {
    try {
      await addToWishlist(productId);
      return true;
    } catch (e) {
      console.error("위시리스트 추가 실패:", e);
      return false;
    }
  };

  // 위시리스트에서 삭제
  const removeItem = async (productId: number, confirmMessage?: string) => {
    if (confirmMessage && !confirm(confirmMessage)) return false;

    try {
      await removeFromWishlist(productId);
      wishlistItems.value = wishlistItems.value.filter(
        (item) => item.productId !== productId
      );
      return true;
    } catch (e) {
      console.error("위시리스트 삭제 실패:", e);
      return false;
    }
  };

  // 특정 상품이 위시리스트에 있는지 확인
  const isInWishlist = (productId: number) => {
    return wishlistItems.value.some((item) => item.productId === productId);
  };

  return {
    // 상태
    wishlistItems,
    loading,
    error,

    // 계산된 값
    itemCount,
    isEmpty,

    // 메서드
    loadWishlist,
    addItem,
    removeItem,
    isInWishlist,
  };
}

/**
 * 위시리스트 토글 (상품 상세 페이지용)
 */
export function useWishlistToggle(productId: Ref<number> | number) {
  const isWishlisted = ref(false);
  const loading = ref(false);

  // 위시리스트 상태 확인
  const checkStatus = async () => {
    try {
      const items = await fetchWishlist();
      const pid = typeof productId === "number" ? productId : productId.value;
      isWishlisted.value = items.some((item: WishlistItem) => item.productId === pid);
    } catch (e) {
      console.error("위시리스트 확인 실패:", e);
    }
  };

  // 위시리스트 토글
  const toggle = async () => {
    loading.value = true;
    const pid = typeof productId === "number" ? productId : productId.value;

    try {
      if (isWishlisted.value) {
        await removeFromWishlist(pid);
        isWishlisted.value = false;
      } else {
        await addToWishlist(pid);
        isWishlisted.value = true;
      }
      return true;
    } catch (e) {
      console.error("위시리스트 처리 실패:", e);
      return false;
    } finally {
      loading.value = false;
    }
  };

  return {
    isWishlisted,
    loading,
    checkStatus,
    toggle,
  };
}

/**
 * 위시리스트 자동 로드
 */
export function useWishlistWithAutoLoad() {
  const wishlist = useWishlist();

  onMounted(() => {
    wishlist.loadWishlist();
  });

  return wishlist;
}

/**
 * 위시리스트 개수만 로드 (Account 페이지용)
 */
export function useWishlistCount() {
  const count = ref(0);
  const loading = ref(false);

  const loadCount = async () => {
    loading.value = true;
    try {
      const items = await fetchWishlist();
      count.value = items.length;
    } catch (e) {
      console.error("위시리스트 카운트 로드 실패:", e);
    } finally {
      loading.value = false;
    }
  };

  return {
    count,
    loading,
    loadCount,
  };
}
