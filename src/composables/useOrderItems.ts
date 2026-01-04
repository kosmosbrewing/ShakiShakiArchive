// src/composables/useOrderItems.ts
// 주문 상품 관리 composable (바로 구매 / 장바구니 통합)

import { ref, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useCart } from "./useCart";
import { useAlert } from "./useAlert";
import {
  isValidDirectPurchaseData,
  calculateShippingFee,
} from "@/lib/validators";
import type { DirectPurchaseData, CartItem } from "@/types/api";

// 주문 상품 통합 타입 (바로 구매 / 장바구니 공통)
export interface OrderItemDisplay {
  id: string;
  productId: string;
  variantId?: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    price: number;
    imageUrl: string;
  };
  variant: {
    id: string;
    size: string;
    color?: string;
  } | null;
}

// DirectPurchaseData를 OrderItemDisplay로 변환
const toOrderItemFromDirect = (item: DirectPurchaseData): OrderItemDisplay => ({
  id: item.id,
  productId: item.productId,
  variantId: item.variantId,
  quantity: item.quantity,
  product: {
    id: item.product.id,
    name: item.product.name,
    price: item.product.price,
    imageUrl: item.product.imageUrl,
  },
  variant: item.variant,
});

// CartItem을 OrderItemDisplay로 변환
const toOrderItemFromCart = (item: CartItem): OrderItemDisplay => ({
  id: item.id,
  productId: item.productId,
  variantId: item.variantId,
  quantity: item.quantity,
  product: {
    id: item.product.id,
    name: item.product.name,
    price: Number(item.product.price),
    imageUrl: item.product.imageUrl,
  },
  variant: item.variant
    ? {
        id: item.variant.id,
        size: item.variant.size,
        color: item.variant.color,
      }
    : null,
});

export function useOrderItems() {
  const route = useRoute();
  const router = useRouter();
  const { showAlert } = useAlert();
  const { cartItems, loadCart } = useCart();

  // 상태
  const loading = ref(false);
  const directPurchaseItem = ref<DirectPurchaseData | null>(null);

  // 바로 구매 모드 여부
  const isDirectPurchase = computed(() => route.query.direct === "true");

  // 통합된 주문 상품 목록
  const items = computed<OrderItemDisplay[]>(() => {
    if (isDirectPurchase.value && directPurchaseItem.value) {
      return [toOrderItemFromDirect(directPurchaseItem.value)];
    }
    return cartItems.value.map(toOrderItemFromCart);
  });

  // 주문 상품 존재 여부
  const isEmpty = computed(() => items.value.length === 0);

  // 상품 금액 합계 (배송비 제외)
  const subtotal = computed(() => {
    return items.value.reduce((sum, item) => {
      return sum + item.product.price * item.quantity;
    }, 0);
  });

  // 배송비
  const shippingFee = computed(() => calculateShippingFee(subtotal.value));

  // 최종 결제 금액
  const totalAmount = computed(() => subtotal.value + shippingFee.value);

  // 상품 개수
  const itemCount = computed(() => items.value.length);

  // 총 수량
  const totalQuantity = computed(() => {
    return items.value.reduce((sum, item) => sum + item.quantity, 0);
  });

  // 주문명 생성 ("상품명 외 N건" 형식)
  const orderName = computed(() => {
    if (items.value.length === 0) return "";
    const firstName = items.value[0].product.name;
    return items.value.length > 1
      ? `${firstName} 외 ${items.value.length - 1}건`
      : firstName;
  });

  // 데이터 로드
  const loadOrderItems = async (): Promise<boolean> => {
    loading.value = true;
    try {
      if (isDirectPurchase.value) {
        // 바로 구매: 세션 스토리지에서 로드
        const stored = sessionStorage.getItem("directPurchase");
        if (!stored) {
          showAlert("주문할 상품 정보가 없습니다.", { type: "error" });
          router.replace("/");
          return false;
        }

        try {
          const parsed = JSON.parse(stored);
          if (!isValidDirectPurchaseData(parsed)) {
            throw new Error("Invalid data format");
          }
          directPurchaseItem.value = parsed;
        } catch {
          sessionStorage.removeItem("directPurchase");
          showAlert("잘못된 상품 정보입니다.", { type: "error" });
          router.replace("/");
          return false;
        }
      } else {
        // 장바구니: 서버/로컬에서 로드
        await loadCart();
        if (cartItems.value.length === 0) {
          showAlert("주문할 상품이 없습니다.", { type: "error" });
          router.replace("/");
          return false;
        }
      }
      return true;
    } finally {
      loading.value = false;
    }
  };

  // 세션 스토리지 정리 (결제 완료 또는 페이지 이탈 시)
  const clearDirectPurchase = () => {
    sessionStorage.removeItem("directPurchase");
    directPurchaseItem.value = null;
  };

  // 바로 구매용 백엔드 요청 데이터 생성
  const getDirectPurchasePayload = () => {
    if (!isDirectPurchase.value || !directPurchaseItem.value) {
      return undefined;
    }
    return {
      productId: directPurchaseItem.value.productId,
      variantId: directPurchaseItem.value.variantId,
      quantity: directPurchaseItem.value.quantity,
    };
  };

  return {
    // 상태
    loading,
    isDirectPurchase,
    items,
    isEmpty,

    // 금액 계산
    subtotal,
    shippingFee,
    totalAmount,

    // 상품 정보
    itemCount,
    totalQuantity,
    orderName,

    // 메서드
    loadOrderItems,
    clearDirectPurchase,
    getDirectPurchasePayload,
  };
}
