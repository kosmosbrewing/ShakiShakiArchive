// src/lib/validators.ts
// 공통 데이터 검증 유틸리티
// 상수 값은 useConstantsStore에서 관리됩니다.

import type {
  DirectPurchaseData,
  CartProductInfo,
  DirectPurchaseItem,
} from "@/types/api";
import { getActivePinia } from "pinia";
import { useConstantsStore } from "@/stores/constants";

// 폴백 값 (Pinia 미초기화 시 사용)
const FALLBACK_QUANTITY = { MIN: 1, MAX: 99 };
const FALLBACK_PRICE = { MIN: 0, MAX: 100000000 };
const FALLBACK_SHIPPING = { FREE_THRESHOLD: 50000, FEE: 3000 };

/**
 * 상수 스토어에서 현재 값을 가져오는 헬퍼
 * Pinia 미초기화 시 null 반환
 */
const getConstantsSafe = () => {
  try {
    // Pinia가 초기화되었는지 확인
    if (!getActivePinia()) {
      return null;
    }
    return useConstantsStore();
  } catch {
    return null;
  }
};

// 수량 검증 상수 (스토어에서 가져옴, 폴백 포함)
export const getQuantityLimits = () => {
  const store = getConstantsSafe();
  return store?.quantityLimits ?? FALLBACK_QUANTITY;
};

// 가격 검증 상수 (스토어에서 가져옴, 폴백 포함)
export const getPriceLimits = () => {
  const store = getConstantsSafe();
  return store?.priceLimits ?? FALLBACK_PRICE;
};

// 배송비 관련 상수 (스토어에서 가져옴, 폴백 포함)
export const getShippingConfig = () => {
  const store = getConstantsSafe();
  return store?.shipping ?? FALLBACK_SHIPPING;
};

/**
 * 배송비 계산 (스토어 헬퍼 사용, 폴백 포함)
 */
export const calculateShippingFee = (subtotal: number): number => {
  const store = getConstantsSafe();
  if (store) {
    return store.calculateShippingFee(subtotal);
  }
  // 폴백 계산
  return subtotal >= FALLBACK_SHIPPING.FREE_THRESHOLD
    ? 0
    : FALLBACK_SHIPPING.FEE;
};

// UUID 형식 검증 (v4)
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * UUID 형식 검증
 */
export const isValidUUID = (value: unknown): value is string => {
  return typeof value === "string" && UUID_REGEX.test(value);
};

/**
 * 수량 검증 (스토어의 validation.quantity 사용)
 */
export const isValidQuantity = (value: unknown): value is number => {
  const limits = getQuantityLimits();
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= limits.MIN &&
    value <= limits.MAX
  );
};

/**
 * 가격 검증 (스토어의 validation.price 사용)
 */
export const isValidPrice = (value: unknown): value is number => {
  const limits = getPriceLimits();
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= limits.MIN &&
    value <= limits.MAX
  );
};

/**
 * 문자열 검증 (빈 문자열 제외)
 */
export const isNonEmptyString = (value: unknown): value is string => {
  return typeof value === "string" && value.trim().length > 0;
};

/**
 * 이미지 URL 검증
 */
export const isValidImageUrl = (value: unknown): value is string => {
  if (typeof value !== "string") return false;
  // CloudFront 또는 일반 HTTPS URL 허용
  return (
    value.startsWith("https://") ||
    value.startsWith("http://localhost") ||
    value.startsWith("/")
  );
};

/**
 * 바로 구매 상품 정보 검증 (상세)
 */
export const isValidDirectPurchaseData = (
  data: unknown
): data is DirectPurchaseData => {
  if (!data || typeof data !== "object") return false;

  const d = data as Record<string, unknown>;

  // 필수 필드 검증
  if (!isNonEmptyString(d.id)) return false;
  if (!isValidUUID(d.productId)) return false;
  if (!isValidQuantity(d.quantity)) return false;

  // variantId는 optional이지만 있으면 UUID여야 함
  if (d.variantId !== undefined && !isValidUUID(d.variantId)) return false;

  // product 객체 검증
  if (!d.product || typeof d.product !== "object") return false;
  const product = d.product as Record<string, unknown>;

  if (!isValidUUID(product.id)) return false;
  if (!isNonEmptyString(product.name)) return false;
  if (!isValidPrice(product.price)) return false;
  if (!isValidImageUrl(product.imageUrl)) return false;

  // variant는 null이거나 유효한 객체여야 함
  if (d.variant !== null) {
    if (typeof d.variant !== "object") return false;
    const variant = d.variant as Record<string, unknown>;
    if (!isValidUUID(variant.id)) return false;
    if (!isNonEmptyString(variant.size)) return false;
    // color는 optional
  }

  return true;
};

/**
 * 장바구니 상품 정보 검증
 */
export const isValidCartProductInfo = (
  data: unknown
): data is CartProductInfo => {
  if (!data || typeof data !== "object") return false;

  const d = data as Record<string, unknown>;

  if (!isValidUUID(d.id)) return false;
  if (!isNonEmptyString(d.name)) return false;
  if (!isValidPrice(d.price)) return false;
  if (!isValidImageUrl(d.imageUrl)) return false;

  // variant는 optional
  if (d.variant !== undefined && d.variant !== null) {
    if (typeof d.variant !== "object") return false;
    const variant = d.variant as Record<string, unknown>;
    if (!isValidUUID(variant.id)) return false;
    if (!isNonEmptyString(variant.size)) return false;
  }

  return true;
};

/**
 * 바로 구매 요청 아이템 검증 (백엔드 전송용)
 */
export const isValidDirectPurchaseItem = (
  data: unknown
): data is DirectPurchaseItem => {
  if (!data || typeof data !== "object") return false;

  const d = data as Record<string, unknown>;

  if (!isValidUUID(d.productId)) return false;
  if (!isValidQuantity(d.quantity)) return false;

  // variantId는 optional
  if (d.variantId !== undefined && !isValidUUID(d.variantId)) return false;

  return true;
};

/**
 * 전화번호 검증 (한국)
 */
export const isValidPhone = (value: unknown): value is string => {
  if (typeof value !== "string") return false;
  // 010-1234-5678 또는 01012345678 형식
  const cleaned = value.replace(/-/g, "");
  return /^01[0-9]{8,9}$/.test(cleaned);
};

/**
 * 우편번호 검증 (한국)
 */
export const isValidZipCode = (value: unknown): value is string => {
  if (typeof value !== "string") return false;
  return /^\d{5}$/.test(value);
};

/**
 * 주문 배송 정보 검증
 */
export interface ShippingInfoValidation {
  isValid: boolean;
  errors: string[];
}

export const validateShippingInfo = (data: {
  recipient?: string;
  phone?: string;
  zipCode?: string;
  address?: string;
  detailAddress?: string;
}): ShippingInfoValidation => {
  const errors: string[] = [];

  if (!isNonEmptyString(data.recipient)) {
    errors.push("수령인을 입력해주세요.");
  }

  if (!isValidPhone(data.phone)) {
    errors.push("올바른 연락처를 입력해주세요.");
  }

  if (!isValidZipCode(data.zipCode)) {
    errors.push("올바른 우편번호를 입력해주세요.");
  }

  if (!isNonEmptyString(data.address)) {
    errors.push("주소를 입력해주세요.");
  }

  if (!isNonEmptyString(data.detailAddress)) {
    errors.push("상세 주소를 입력해주세요.");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * 금액 계산 검증 (클라이언트 계산값과 비교용)
 */
export const validateOrderAmount = (
  items: Array<{ price: number; quantity: number }>,
  expectedTotal: number,
  shippingFee: number
): boolean => {
  const calculatedSubtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const calculatedTotal = calculatedSubtotal + shippingFee;

  // 1원 이내 오차 허용 (부동소수점 오류 대비)
  return Math.abs(calculatedTotal - expectedTotal) <= 1;
};
