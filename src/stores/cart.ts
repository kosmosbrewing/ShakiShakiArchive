// src/stores/cart.ts
// 장바구니 상태 관리 스토어 - 중앙 집중식 관리로 API 호출 최소화

import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { useAuthStore } from "./auth";
import { useConstantsStore } from "./constants";
import {
  fetchCart,
  addToCart,
  updateCartItem,
  deleteCartItem,
} from "@/lib/api";
import type { CartItem } from "@/types/api";

const LOCAL_CART_KEY = "guest_cart";

export const useCartStore = defineStore("cart", () => {
  const authStore = useAuthStore();
  const constantsStore = useConstantsStore();

  // 상태
  const items = ref<CartItem[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const lastFetchedAt = ref<number | null>(null);

  // 캐시 유효 시간 (30초 - 장바구니는 자주 변경될 수 있음)
  const CACHE_DURATION = 30 * 1000;

  // 계산된 속성
  const itemCount = computed(() => items.value.length);
  const isEmpty = computed(() => items.value.length === 0);

  const totalProductPrice = computed(() => {
    return items.value.reduce((sum, item) => {
      const price = Number(item.product?.price || 0);
      return sum + price * item.quantity;
    }, 0);
  });

  const shippingFee = computed(() =>
    constantsStore.calculateShippingFee(totalProductPrice.value)
  );

  const totalAmount = computed(
    () => totalProductPrice.value + shippingFee.value
  );

  // 캐시 유효 확인
  const isCacheValid = computed(() => {
    if (!lastFetchedAt.value) return false;
    return Date.now() - lastFetchedAt.value < CACHE_DURATION;
  });

  // 장바구니 로드
  async function loadCart(forceRefresh = false) {
    // 캐시가 유효하고 강제 새로고침이 아니면 스킵
    if (!forceRefresh && isCacheValid.value && items.value.length >= 0) {
      // 이미 로드된 상태라면 스킵 (빈 장바구니도 유효한 상태)
      if (lastFetchedAt.value) return items.value;
    }

    isLoading.value = true;
    error.value = null;

    try {
      if (authStore.isAuthenticated) {
        // 회원: 서버 API
        const data = await fetchCart();
        items.value = data;
      } else {
        // 비회원: 로컬 스토리지
        const rawData = localStorage.getItem(LOCAL_CART_KEY);
        items.value = rawData ? JSON.parse(rawData) : [];
      }
      lastFetchedAt.value = Date.now();
      return items.value;
    } catch (e: any) {
      error.value = "장바구니 로드 실패";
      console.error("장바구니 로드 실패:", e);
      throw e;
    } finally {
      isLoading.value = false;
    }
  }

  // 아이템 추가
  async function addItem(params: {
    productId: string;
    variantId?: number;
    quantity: number;
    productInfo?: any;
  }) {
    try {
      if (authStore.isAuthenticated) {
        await addToCart(params);
      } else {
        const localCart = JSON.parse(
          localStorage.getItem(LOCAL_CART_KEY) || "[]"
        );

        // 중복 체크
        const existingIndex = localCart.findIndex(
          (item: any) =>
            item.productId === params.productId &&
            item.variantId === params.variantId
        );

        if (existingIndex > -1) {
          localCart[existingIndex].quantity += params.quantity;
        } else {
          localCart.push({
            id: Date.now(),
            productId: params.productId,
            variantId: params.variantId,
            quantity: params.quantity,
            product: params.productInfo || {},
            variant: params.productInfo?.variant || null,
          });
        }
        localStorage.setItem(LOCAL_CART_KEY, JSON.stringify(localCart));
      }

      // 캐시 무효화 후 새로 로드
      invalidateCache();
      await loadCart(true);

      // 이벤트 발생 (Navbar 등 업데이트)
      window.dispatchEvent(new Event("cart-updated"));
      return true;
    } catch (e) {
      console.error("장바구니 담기 실패:", e);
      return false;
    }
  }

  // 수량 변경
  async function updateQuantity(itemId: string | number, newQuantity: number) {
    if (newQuantity < 1) return false;

    const item = items.value.find((i) => i.id === itemId);
    if (!item) return false;

    const oldQuantity = item.quantity;
    item.quantity = newQuantity; // 낙관적 업데이트

    try {
      if (authStore.isAuthenticated) {
        await updateCartItem(itemId, newQuantity);
      } else {
        const localCart = JSON.parse(
          localStorage.getItem(LOCAL_CART_KEY) || "[]"
        );
        const target = localCart.find((i: any) => i.id === itemId);
        if (target) {
          target.quantity = newQuantity;
          localStorage.setItem(LOCAL_CART_KEY, JSON.stringify(localCart));
        }
      }
      return true;
    } catch (e) {
      // 롤백
      item.quantity = oldQuantity;
      console.error("수량 변경 실패:", e);
      return false;
    }
  }

  // 아이템 삭제
  async function removeItem(itemId: string | number) {
    try {
      if (authStore.isAuthenticated) {
        await deleteCartItem(itemId);
      } else {
        const localCart = JSON.parse(
          localStorage.getItem(LOCAL_CART_KEY) || "[]"
        );
        const filtered = localCart.filter((i: any) => i.id !== itemId);
        localStorage.setItem(LOCAL_CART_KEY, JSON.stringify(filtered));
      }

      // 로컬 상태 업데이트
      items.value = items.value.filter((item) => item.id !== itemId);

      // 이벤트 발생
      window.dispatchEvent(new Event("cart-updated"));
      return true;
    } catch (e) {
      console.error("삭제 실패:", e);
      return false;
    }
  }

  // 장바구니 비우기
  function clearCart() {
    items.value = [];
    lastFetchedAt.value = null;
    if (!authStore.isAuthenticated) {
      localStorage.removeItem(LOCAL_CART_KEY);
    }
    window.dispatchEvent(new Event("cart-updated"));
  }

  // 캐시 무효화
  function invalidateCache() {
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
    totalProductPrice,
    shippingFee,
    totalAmount,
    isCacheValid,

    // 메서드
    loadCart,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    invalidateCache,
  };
});
