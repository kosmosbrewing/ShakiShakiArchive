// src/composables/useCart.ts
import { ref, computed, onMounted } from "vue";
import { useAuthStore } from "@/stores/auth";
import {
  fetchCart,
  updateCartItem,
  deleteCartItem,
  addToCart,
} from "@/lib/api";
import type { CartItem, CartProductInfo } from "@/types/api";
import { useAlert } from "./useAlert";
import {
  isValidQuantity,
  isValidUUID,
  isValidCartProductInfo,
  getQuantityLimits,
  calculateShippingFee,
} from "@/lib/validators";

const LOCAL_CART_KEY = "guest_cart";

// 로컬 스토리지 장바구니 아이템 타입
interface LocalCartItem {
  id: number;
  productId: string;
  variantId?: string;
  quantity: number;
  product: CartProductInfo | Record<string, never>;
  variant?: {
    id: string;
    size: string;
    color?: string;
  } | null;
}

// 로컬 스토리지에서 장바구니 안전하게 파싱
const getLocalCart = (): LocalCartItem[] => {
  try {
    const rawData = localStorage.getItem(LOCAL_CART_KEY);
    if (!rawData) return [];
    const parsed = JSON.parse(rawData);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    console.error("로컬 장바구니 파싱 실패");
    return [];
  }
};

// 로컬 스토리지에 장바구니 저장
const saveLocalCart = (cart: LocalCartItem[]): void => {
  try {
    localStorage.setItem(LOCAL_CART_KEY, JSON.stringify(cart));
  } catch (e) {
    console.error("로컬 장바구니 저장 실패:", e);
  }
};

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
    calculateShippingFee(totalProductPrice.value)
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
        // 비회원: 로컬 스토리지 (LocalCartItem → CartItem 호환 처리)
        cartItems.value = getLocalCart() as unknown as CartItem[];
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
    productId: string; // UUID
    variantId?: string; // UUID
    quantity: number;
    productInfo?: CartProductInfo; // 비회원용 상품 정보 (이미지, 가격 등)
  }): Promise<boolean> => {
    // 입력값 검증
    if (!isValidUUID(params.productId)) {
      console.error("장바구니 추가 실패: 잘못된 상품 ID");
      return false;
    }

    if (params.variantId && !isValidUUID(params.variantId)) {
      console.error("장바구니 추가 실패: 잘못된 옵션 ID");
      return false;
    }

    if (!isValidQuantity(params.quantity)) {
      const limits = getQuantityLimits();
      console.error(
        `장바구니 추가 실패: 수량은 ${limits.MIN}~${limits.MAX} 사이여야 합니다`
      );
      return false;
    }

    // 비회원용 상품 정보 검증
    if (params.productInfo && !isValidCartProductInfo(params.productInfo)) {
      console.error("장바구니 추가 실패: 잘못된 상품 정보");
      return false;
    }

    try {
      if (authStore.isAuthenticated) {
        // 회원
        await addToCart(params);
      } else {
        // 비회원: 로컬 스토리지
        const localCart = getLocalCart();

        // 중복 체크
        const existingIndex = localCart.findIndex(
          (item) =>
            item.productId === params.productId &&
            item.variantId === params.variantId
        );

        if (existingIndex > -1) {
          // 최대 수량 초과 체크
          const limits = getQuantityLimits();
          const newQuantity =
            localCart[existingIndex].quantity + params.quantity;
          if (newQuantity > limits.MAX) {
            console.error(
              `장바구니 추가 실패: 최대 수량(${limits.MAX}개)을 초과할 수 없습니다`
            );
            return false;
          }
          localCart[existingIndex].quantity = newQuantity;
        } else {
          // 새 아이템 추가
          const newItem: LocalCartItem = {
            id: Date.now(),
            productId: params.productId,
            variantId: params.variantId,
            quantity: params.quantity,
            product: params.productInfo || {},
            variant: params.productInfo?.variant || null,
          };
          localCart.push(newItem);
        }
        saveLocalCart(localCart);
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
    const limits = getQuantityLimits();

    // 수량 범위 검증
    if (newQuantity < limits.MIN) return;
    if (newQuantity > limits.MAX) {
      console.error(
        `수량 변경 실패: 최대 수량(${limits.MAX}개)을 초과할 수 없습니다`
      );
      return;
    }

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
      const localCart = getLocalCart();
      const target = localCart.find((i) => i.id === Number(item.id));
      if (target) {
        target.quantity = newQuantity;
        saveLocalCart(localCart);
        item.quantity = newQuantity; // 화면 갱신
      }
    }
  };

  // [수정] 아이템 삭제
  const removeItem = async (
    itemId: string, // UUID
    confirmMessage = "삭제하시겠습니까?"
  ) => {
    const { showDestructiveConfirm } = useAlert();
    const confirmed = await showDestructiveConfirm(confirmMessage);
    if (!confirmed) return false;

    try {
      if (authStore.isAuthenticated) {
        await deleteCartItem(itemId);
      } else {
        const localCart = getLocalCart();
        const filtered = localCart.filter((i) => i.id !== Number(itemId));
        saveLocalCart(filtered);
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
