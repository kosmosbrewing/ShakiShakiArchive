// src/composables/useCart.ts
import { ref, computed, onMounted } from "vue";
import { useAuthStore } from "@/stores/auth"; // [추가] 로그인 상태 확인용
import {
  fetchCart,
  updateCartItem,
  deleteCartItem,
  addToCart,
  fetchProduct, // [추가] 로컬 장바구니 표시용 상품 정보 조회
} from "@/lib/api";
import type { CartItem } from "@/types/api";

const LOCAL_CART_KEY = "guest_cart";

export function useCart() {
  const authStore = useAuthStore(); // [추가]
  const cartItems = ref<CartItem[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // [기존 계산 로직들 유지...]
  const totalProductPrice = computed(() => {
    return cartItems.value.reduce((sum, item) => {
      const price = Number(item.product?.price || 0);
      return sum + price * item.quantity;
    }, 0);
  });
  const shippingFee = computed(() =>
    totalProductPrice.value >= 50000 ? 0 : 3000
  );
  const totalAmount = computed(
    () => totalProductPrice.value + shippingFee.value
  );
  const itemCount = computed(() => cartItems.value.length);
  const isEmpty = computed(() => cartItems.value.length === 0);

  // [수정] 장바구니 로드 (분기 처리)
  const loadCart = async () => {
    loading.value = true;
    error.value = null;
    try {
      if (authStore.isAuthenticated) {
        // 회원: 서버 API
        const data = await fetchCart();
        cartItems.value = data;
      } else {
        // 비회원: 로컬 스토리지
        const rawData = localStorage.getItem(LOCAL_CART_KEY);
        if (rawData) {
          const localItems = JSON.parse(rawData);
          // 로컬 데이터에는 상품 상세 정보가 없을 수 있으므로 필요 시 fetchProduct 등으로 보강 가능
          // MVP를 위해 저장 시점에 필요한 정보를 다 넣는 것을 권장하지만,
          // 여기서는 저장된 구조를 그대로 사용한다고 가정
          cartItems.value = localItems;
        } else {
          cartItems.value = [];
        }
      }
    } catch (e) {
      error.value = "장바구니 로드 실패";
      console.error(e);
    } finally {
      loading.value = false;
    }
  };

  // [수정] 장바구니 추가
  const addItem = async (params: {
    productId: number;
    variantId?: number;
    quantity: number;
    productInfo?: any; // [추가] 비회원용 상품 정보 (이미지, 가격 등)
  }) => {
    try {
      if (authStore.isAuthenticated) {
        // 회원
        await addToCart(params);
      } else {
        // 비회원
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
          // 새 아이템 추가 (화면 표시를 위해 product 정보도 모의로 구성해서 저장)
          localCart.push({
            id: Date.now(), // 임시 ID
            productId: params.productId,
            variantId: params.variantId,
            quantity: params.quantity,
            product: params.productInfo || {}, // 상품 정보 캐싱
            variant: params.productInfo?.variant || null,
          });
        }
        localStorage.setItem(LOCAL_CART_KEY, JSON.stringify(localCart));
      }

      // 공통: Navbar 갱신
      window.dispatchEvent(new Event("cart-updated"));
      return true;
    } catch (e) {
      console.error("장바구니 담기 실패:", e);
      return false;
    }
  };

  // [수정] 수량 변경
  const updateQuantity = async (item: CartItem, change: number) => {
    const newQuantity = item.quantity + change;
    if (newQuantity < 1) return;

    if (authStore.isAuthenticated) {
      // 회원 로직 (기존 동일)
      const oldQuantity = item.quantity;
      item.quantity = newQuantity;
      try {
        await updateCartItem(item.id, newQuantity);
      } catch (e) {
        item.quantity = oldQuantity;
        await loadCart();
      }
    } else {
      // 비회원 로직
      const localCart = JSON.parse(
        localStorage.getItem(LOCAL_CART_KEY) || "[]"
      );
      const target = localCart.find((i: any) => i.id === item.id);
      if (target) {
        target.quantity = newQuantity;
        localStorage.setItem(LOCAL_CART_KEY, JSON.stringify(localCart));
        item.quantity = newQuantity; // 화면 갱신
      }
    }
  };

  // [수정] 아이템 삭제
  const removeItem = async (
    itemId: number,
    confirmMessage = "삭제하시겠습니까?"
  ) => {
    if (!confirm(confirmMessage)) return false;

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

      // 공통: 목록 갱신 및 이벤트 발생
      cartItems.value = cartItems.value.filter((item) => item.id !== itemId);
      window.dispatchEvent(new Event("cart-updated"));
      return true;
    } catch (e) {
      console.error("삭제 실패:", e);
      return false;
    }
  };

  return {
    cartItems,
    loading,
    error,
    totalProductPrice,
    shippingFee,
    totalAmount,
    itemCount,
    isEmpty,
    loadCart,
    updateQuantity,
    removeItem,
    addItem,
  };
}

export function useCartWithAutoLoad() {
  const cart = useCart();
  onMounted(() => {
    cart.loadCart();
  });
  return cart;
}
