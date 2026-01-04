// src/stores/constants.ts
// 백엔드 공통 상수를 관리하는 Pinia 스토어

import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { fetchConstants } from "@/lib/api";
import type {
  AppConstants,
  ShippingConstants,
  OrderConstants,
  PaymentConstants,
  ValidationConstants,
  MessagesConstants,
} from "@/types/api";

// 폴백 기본값 (API 실패 또는 응답 누락 시 사용)
const FALLBACK_CONSTANTS: AppConstants = {
  shipping: {
    FREE_THRESHOLD: 50000,
    FEE: 3000,
  },
  order: {
    status: {
      PENDING_PAYMENT: "pending_payment",
      PAYMENT_CONFIRMED: "payment_confirmed",
      PREPARING: "preparing",
      SHIPPED: "shipped",
      DELIVERED: "delivered",
      CANCELLED: "cancelled",
    },
    statusEnum: [
      "pending_payment",
      "payment_confirmed",
      "preparing",
      "shipped",
      "delivered",
      "cancelled",
    ],
    nonCancelableStatuses: ["shipped", "delivered", "cancelled"],
  },
  payment: {
    provider: {
      TOSS: "toss",
      NAVERPAY: "naverpay",
      KAKAOPAY: "kakaopay",
    },
  },
  validation: {
    quantity: { MIN: 1, MAX: 99 },
    price: { MIN: 0, MAX: 100000000 },
    password: { minLength: 8 },
    inquiry: { TITLE_MAX_LENGTH: 200 },
  },
  messages: {
    validation: {},
  },
};

/**
 * API 응답을 폴백 값과 병합 (누락된 필드 방어)
 */
function mergeWithFallback(data: Partial<AppConstants>): AppConstants {
  return {
    shipping: { ...FALLBACK_CONSTANTS.shipping, ...data.shipping },
    order: {
      ...FALLBACK_CONSTANTS.order,
      ...data.order,
      // 중첩 객체도 병합
      status: { ...FALLBACK_CONSTANTS.order.status, ...data.order?.status },
    },
    payment: {
      ...FALLBACK_CONSTANTS.payment,
      ...data.payment,
      provider: {
        ...FALLBACK_CONSTANTS.payment.provider,
        ...data.payment?.provider,
      },
    },
    validation: {
      ...FALLBACK_CONSTANTS.validation,
      ...data.validation,
      quantity: {
        ...FALLBACK_CONSTANTS.validation.quantity,
        ...data.validation?.quantity,
      },
      price: {
        ...FALLBACK_CONSTANTS.validation.price,
        ...data.validation?.price,
      },
      password: {
        ...FALLBACK_CONSTANTS.validation.password,
        ...data.validation?.password,
      },
      inquiry: {
        ...FALLBACK_CONSTANTS.validation.inquiry,
        ...data.validation?.inquiry,
      },
    },
    messages: { ...FALLBACK_CONSTANTS.messages, ...data.messages },
  };
}

export const useConstantsStore = defineStore("constants", () => {
  // 상태
  const constants = ref<AppConstants>(FALLBACK_CONSTANTS);
  const isLoaded = ref(false);
  const isLoading = ref(false);
  const loadFailed = ref(false); // API 실패 여부 (재시도 판단용)
  const error = ref<string | null>(null);

  // 편의 getter - 각 도메인별 상수 접근
  const shipping = computed<ShippingConstants>(() => constants.value.shipping);
  const order = computed<OrderConstants>(() => constants.value.order);
  const payment = computed<PaymentConstants>(() => constants.value.payment);
  const validation = computed<ValidationConstants>(
    () => constants.value.validation
  );
  const messages = computed<MessagesConstants>(() => constants.value.messages);

  // 배송비 관련 편의 getter
  const freeShippingThreshold = computed(() => shipping.value.FREE_THRESHOLD);
  const baseShippingFee = computed(() => shipping.value.FEE); // shippingFee → baseShippingFee로 변경

  // 주문 상태 관련 편의 getter
  const orderStatuses = computed(() => order.value.status);
  const nonCancelableStatuses = computed(() => order.value.nonCancelableStatuses);

  // 검증 규칙 편의 getter
  const quantityLimits = computed(() => validation.value.quantity);
  const priceLimits = computed(() => validation.value.price);

  /**
   * 상수 데이터 로드
   * @param force - true면 이전 실패/성공 여부와 관계없이 재시도
   * @returns 로드 성공 여부
   */
  async function loadConstants(force = false): Promise<boolean> {
    // 이미 로드 중이면 스킵
    if (isLoading.value) return false;

    // 강제 재시도가 아니고 이미 성공적으로 로드된 경우 스킵
    if (!force && isLoaded.value && !loadFailed.value) return true;

    isLoading.value = true;
    error.value = null;

    try {
      const data = await fetchConstants();
      // API 응답을 폴백 값과 병합 (누락된 필드 방어)
      constants.value = mergeWithFallback(data);
      isLoaded.value = true;
      loadFailed.value = false;
      console.log("✅ [Constants] 공통 상수 로드 완료");
      return true;
    } catch (e: any) {
      error.value = e.message || "상수 로드 실패";
      console.warn("⚠️ [Constants] API 실패, 폴백 값 사용:", error.value);
      // 폴백 값은 이미 설정되어 있으므로 앱은 정상 동작
      isLoaded.value = true;
      loadFailed.value = true; // 실패 플래그 설정 (재시도 가능)
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * 배송비 계산 헬퍼
   */
  function calculateShippingFee(subtotal: number): number {
    return subtotal >= shipping.value.FREE_THRESHOLD ? 0 : shipping.value.FEE;
  }

  /**
   * 주문 취소 가능 여부 확인
   */
  function isCancelable(status: string): boolean {
    return !order.value.nonCancelableStatuses.includes(status);
  }

  /**
   * 수량 유효성 검증
   */
  function isValidQuantity(value: number): boolean {
    const { MIN, MAX } = validation.value.quantity;
    return Number.isInteger(value) && value >= MIN && value <= MAX;
  }

  /**
   * 가격 유효성 검증
   */
  function isValidPrice(value: number): boolean {
    const { MIN, MAX } = validation.value.price;
    return Number.isFinite(value) && value >= MIN && value <= MAX;
  }

  return {
    // 상태
    constants,
    isLoaded,
    isLoading,
    loadFailed,
    error,

    // 편의 getter
    shipping,
    order,
    payment,
    validation,
    messages,
    freeShippingThreshold,
    baseShippingFee,
    orderStatuses,
    nonCancelableStatuses,
    quantityLimits,
    priceLimits,

    // 액션
    loadConstants,

    // 헬퍼 함수
    calculateShippingFee,
    isCancelable,
    isValidQuantity,
    isValidPrice,
  };
});
