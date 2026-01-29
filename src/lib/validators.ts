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

// 폴백 값 (Pinia 미초기화 시 사용) - 백엔드와 동기화
const FALLBACK_QUANTITY = { MIN: 1, MAX: 99 };
const FALLBACK_PRICE = { MIN: 0, MAX: 100000000 };
const FALLBACK_SHIPPING = { FREE_THRESHOLD: 70000, FEE: 3500, EXTRA_FEE: 2500 };

/**
 * 도서산간 우편번호 범위 목록
 * 백엔드 shared/constants/shipping.ts와 동기화 (2024년 기준)
 */
const REMOTE_AREA_POSTAL_CODES = [
  // 제주도 전지역
  { start: 63000, end: 63644, label: "제주도" },
  // 인천 섬지역
  { start: 22386, end: 22388, label: "인천 중구 섬지역" },
  { start: 23004, end: 23010, label: "인천 강화 섬지역" },
  { start: 23100, end: 23116, label: "인천 옹진 섬지역" },
  { start: 23124, end: 23136, label: "인천 옹진 섬지역" },
  // 충남 섬지역
  { start: 31708, end: 31708, label: "충남 당진 섬지역" },
  { start: 32133, end: 32133, label: "충남 태안 섬지역" },
  { start: 33411, end: 33411, label: "충남 보령 섬지역" },
  // 경북 울릉도/독도
  { start: 40200, end: 40240, label: "경북 울릉도/독도" },
  // 부산 섬지역
  { start: 46768, end: 46771, label: "부산 강서구 섬지역" },
  // 경남 섬지역
  { start: 52570, end: 52571, label: "경남 사천 섬지역" },
  { start: 53031, end: 53033, label: "경남 통영 섬지역" },
  { start: 53088, end: 53104, label: "경남 통영 섬지역" },
  { start: 54000, end: 54000, label: "경남 통영 섬지역" },
  // 전북 섬지역
  { start: 56347, end: 56349, label: "전북 부안 섬지역" },
  // 전남 섬지역
  { start: 57068, end: 57069, label: "전남 영광 섬지역" },
  { start: 58760, end: 58762, label: "전남 목포 섬지역" },
  { start: 58800, end: 58810, label: "전남 신안 섬지역" },
  { start: 58816, end: 58818, label: "전남 신안 섬지역" },
  { start: 58826, end: 58826, label: "전남 신안 섬지역" },
  { start: 58828, end: 58866, label: "전남 신안 섬지역" },
  { start: 58953, end: 58958, label: "전남 진도 섬지역" },
  { start: 59102, end: 59103, label: "전남 완도 섬지역" },
  { start: 59106, end: 59106, label: "전남 완도 섬지역" },
  { start: 59127, end: 59127, label: "전남 완도 섬지역" },
  { start: 59129, end: 59129, label: "전남 완도 섬지역" },
  { start: 59137, end: 59170, label: "전남 완도 섬지역" },
  { start: 59421, end: 59421, label: "전남 여수 섬지역" },
  { start: 59531, end: 59531, label: "전남 여수 섬지역" },
  { start: 59558, end: 59558, label: "전남 여수 섬지역" },
  { start: 59563, end: 59563, label: "전남 여수 섬지역" },
  { start: 59568, end: 59568, label: "전남 여수 섬지역" },
  { start: 59573, end: 59573, label: "전남 여수 섬지역" },
  { start: 59650, end: 59650, label: "전남 여수 섬지역" },
  { start: 59766, end: 59766, label: "전남 여수 섬지역" },
  { start: 59781, end: 59790, label: "전남 여수 섬지역" },
] as const;

/**
 * 도서산간 지역 여부 확인
 * @param postalCode - 우편번호 (5자리 문자열)
 * @returns 도서산간 지역이면 true
 */
export const isRemoteArea = (postalCode: string): boolean => {
  const code = parseInt(postalCode, 10);
  if (isNaN(code)) return false;
  return REMOTE_AREA_POSTAL_CODES.some(
    (range) => code >= range.start && code <= range.end
  );
};

/**
 * 도서산간 지역 라벨 반환
 * @param postalCode - 우편번호 (5자리 문자열)
 * @returns 도서산간 지역명 또는 null
 */
export const getRemoteAreaLabel = (postalCode: string): string | null => {
  const code = parseInt(postalCode, 10);
  if (isNaN(code)) return null;
  const area = REMOTE_AREA_POSTAL_CODES.find(
    (range) => code >= range.start && code <= range.end
  );
  return area?.label ?? null;
};

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
 * 배송비 계산 (도서산간 추가 배송비 포함)
 * @param subtotal - 상품 금액 합계
 * @param postalCode - 우편번호 (도서산간 추가 배송비 계산용, 선택)
 * @returns 배송비 (무료배송 시 기본 배송비 0, 도서산간은 항상 추가)
 */
export const calculateShippingFee = (subtotal: number, postalCode?: string): number => {
  const store = getConstantsSafe();
  const config = store?.shipping ?? FALLBACK_SHIPPING;

  // 기본 배송비 (무료 배송 조건 충족 시 0)
  let baseFee = subtotal >= config.FREE_THRESHOLD ? 0 : config.FEE;

  // 도서산간 추가 배송비 (무료배송이어도 추가됨)
  if (postalCode && isRemoteArea(postalCode)) {
    baseFee += config.EXTRA_FEE;
  }

  return baseFee;
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

/**
 * 사이즈 측정값 문자열 검증
 *
 * 허용 형식:
 * - "" (빈 문자열 - 측정값 없음)
 * - "-" (측정값 없음을 명시적으로 표현)
 * - "1" ~ "999" (1 이상 1000 미만의 정수)
 * - "95.5" (소수점 포함)
 * - "95-100" (범위 표현)
 *
 * 차단 형식:
 * - "0" (0값)
 * - "00", "0123" (앞에 0이 있는 숫자)
 * - "9999" (1000 이상)
 */
export const isValidSizeMeasurement = (value: string): boolean => {
  // 빈 문자열 또는 "-"만 있는 경우 허용 (측정값 없음)
  const trimmed = value.trim();
  if (trimmed === "" || trimmed === "-") {
    return true;
  }

  // 범위 형식 (예: "95-100") 검증
  if (trimmed.includes("-") && trimmed !== "-") {
    const parts = trimmed.split("-");
    if (parts.length !== 2) return false;

    // 각 부분이 유효한 숫자인지 검증
    return parts.every(part => {
      const num = parseFloat(part.trim());
      if (isNaN(num)) return false;
      if (num <= 0 || num >= 1000) return false;
      // 앞에 0이 있는지 확인 (예: "00", "0123")
      if (part.trim().startsWith("0") && part.trim().length > 1 && !part.trim().startsWith("0.")) {
        return false;
      }
      return true;
    });
  }

  // 단일 숫자 검증
  const num = parseFloat(trimmed);

  // 숫자가 아니면 차단
  if (isNaN(num)) {
    return false;
  }

  // 0 이하 또는 1000 이상이면 차단
  if (num <= 0 || num >= 1000) {
    return false;
  }

  // 앞에 0이 있는 경우 차단 (예: "00", "0123")
  // 단, "0.5" 같은 소수점은 허용
  if (trimmed.startsWith("0") && trimmed.length > 1 && !trimmed.startsWith("0.")) {
    return false;
  }

  return true;
};
