// src/composables/useCart.ts
// 장바구니 관련 로직

import { ref, computed, onMounted } from "vue";
import { fetchCart, updateCartItem, deleteCartItem, addToCart } from "@/lib/api";
import type { CartItem } from "@/types/api";

/**
 * 장바구니 CRUD 및 총액 계산
 */
export function useCart() {
  const cartItems = ref<CartItem[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // 총 상품 금액
  const totalProductPrice = computed(() => {
    return cartItems.value.reduce((sum, item) => {
      const price = Number(item.product?.price || 0);
      return sum + price * item.quantity;
    }, 0);
  });

  // 배송비 계산 (5만원 이상 무료)
  const shippingFee = computed(() => {
    return totalProductPrice.value >= 50000 ? 0 : 3000;
  });

  // 최종 결제 금액
  const totalAmount = computed(() => {
    return totalProductPrice.value + shippingFee.value;
  });

  // 장바구니 아이템 개수
  const itemCount = computed(() => cartItems.value.length);

  // 장바구니 비어있는지 확인
  const isEmpty = computed(() => cartItems.value.length === 0);

  // 장바구니 로드
  const loadCart = async () => {
    loading.value = true;
    error.value = null;
    try {
      const data = await fetchCart();
      cartItems.value = data;
    } catch (e) {
      error.value = "장바구니 로드 실패";
      console.error("장바구니 로드 실패:", e);
    } finally {
      loading.value = false;
    }
  };

  // 수량 변경
  const updateQuantity = async (item: CartItem, change: number) => {
    const newQuantity = item.quantity + change;
    if (newQuantity < 1) return;

    // 낙관적 업데이트
    const oldQuantity = item.quantity;
    item.quantity = newQuantity;

    try {
      await updateCartItem(item.id, newQuantity);
    } catch (e) {
      // 실패 시 롤백
      item.quantity = oldQuantity;
      console.error("수량 변경 실패:", e);
      await loadCart(); // 서버 상태로 동기화
    }
  };

  // 아이템 삭제
  const removeItem = async (itemId: number, confirmMessage = "장바구니에서 삭제하시겠습니까?") => {
    if (!confirm(confirmMessage)) return false;

    try {
      await deleteCartItem(itemId);
      cartItems.value = cartItems.value.filter((item) => item.id !== itemId);
      return true;
    } catch (e) {
      console.error("삭제 실패:", e);
      return false;
    }
  };

  // 장바구니에 추가
  const addItem = async (params: {
    productId: number;
    variantId?: number;
    quantity: number;
  }) => {
    try {
      await addToCart(params);
      return true;
    } catch (e) {
      console.error("장바구니 담기 실패:", e);
      return false;
    }
  };

  return {
    // 상태
    cartItems,
    loading,
    error,

    // 계산된 값
    totalProductPrice,
    shippingFee,
    totalAmount,
    itemCount,
    isEmpty,

    // 메서드
    loadCart,
    updateQuantity,
    removeItem,
    addItem,
  };
}

/**
 * 장바구니 자동 로드 (onMounted 포함)
 */
export function useCartWithAutoLoad() {
  const cart = useCart();

  onMounted(() => {
    cart.loadCart();
  });

  return cart;
}
